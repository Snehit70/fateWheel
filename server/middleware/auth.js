const supabase = require('../utils/supabase');
const User = require('../models/User');

// Configurable whitelist of paths that don't require authentication
const PUBLIC_PATHS = [
  '/healthz',
  '/api/health'
];

module.exports = async function (req, res, next) {
  // Check if path is whitelisted
  if (PUBLIC_PATHS.includes(req.path)) {
    return next();
  }

  // Get token from header (case-insensitive Bearer extraction)
  let token = req.header("x-auth-token");
  if (!token) {
    const authHeader = req.header("Authorization");
    if (authHeader) {
      token = authHeader.replace(/^bearer\s+/i, '');
    }
  }

  // Check if not token
  if (!token) {
    return res.status(401).json({ message: "No token, authorization denied" });
  }

  // Verify token with Supabase
  try {
    const { data: { user: supabaseUser }, error } = await supabase.auth.getUser(token);

    if (error || !supabaseUser) {
      throw new Error('Invalid token');
    }

    // Find user in MongoDB
    let user = await User.findOne({ supabaseUid: supabaseUser.id });

    // Auto-create user if they exist in Supabase but not in MongoDB
    if (!user) {
      // Extract username from metadata or email
      let username = supabaseUser.user_metadata?.username;
      if (!username && supabaseUser.email) {
        username = supabaseUser.email.split('@')[0];
      }

      // Validate username exists
      if (!username || username.trim() === '') {
        return res.status(400).json({ message: 'Unable to determine username from token' });
      }

      // Use findOneAndUpdate with upsert to prevent race conditions
      user = await User.findOneAndUpdate(
        { $or: [{ supabaseUid: supabaseUser.id }, { username }] },
        {
          $setOnInsert: {
            username,
            role: 'user',
            status: 'pending'
          },
          $set: {
            supabaseUid: supabaseUser.id
          }
        },
        { upsert: true, new: true, runValidators: true }
      );
    }

    // Check if user is approved (admins bypass this check)
    if (user.role !== 'admin' && user.status !== 'approved') {
      if (user.status === 'pending') {
        return res.status(403).json({
          message: 'Account pending approval',
          status: 'pending'
        });
      } else if (user.status === 'rejected') {
        return res.status(403).json({
          message: 'Account has been rejected',
          status: 'rejected'
        });
      }
    }

    // Attach user to request
    req.user = {
      id: user.id,
      role: user.role,
      supabaseUid: user.supabaseUid
    };

    next();
  } catch (err) {
    console.error("Auth Middleware Error:", err.message);
    res.status(401).json({ message: "Token is not valid" });
  }
};
