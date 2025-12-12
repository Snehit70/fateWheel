const supabase = require('../utils/supabase');
const User = require('../models/User');

module.exports = async function (req, res, next) {
  // Whitelist endpoints that don't require authentication
  if (req.path === "/healthz") {
    return next();
  }

  // Get token from header
  const token = req.header("x-auth-token") || req.header("Authorization")?.replace('Bearer ', '');

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
      // Fallback: Check if username exists (migration) or metadata
      // Since we are forcing username-based auth, we can trust the metadata or email logic
      // We constructed email as "username@roulette.game"

      let username = supabaseUser.user_metadata?.username; // Ideally stored in metadata
      if (!username && supabaseUser.email) {
        // Fallback: Extract from dummy email "user@roulette.game"
        username = supabaseUser.email.split('@')[0];
      }

      user = await User.findOne({ username });

      if (user) {
        // Link existing user
        if (!user.supabaseUid) {
          user.supabaseUid = supabaseUser.id;
          await user.save();
        }
      } else {
        // Create new user
        user = new User({
          username,
          supabaseUid: supabaseUser.id,
          role: 'user',
          status: 'pending'
        });
        await user.save();
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
