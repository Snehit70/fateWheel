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

    // Auto-create user if they exist in Supabase but not in MongoDB (First login sync)
    if (!user) {
      // Try to find by email/username if possible, or create new
      // For now, we assume username matches or we generate one. 
      // Note: Supabase user metadata might contain custom fields.

      // Check if a user with this username already exists (legacy migration case or just conflict)
      const username = supabaseUser.user_metadata?.username || supabaseUser.email.split('@')[0];

      // If username taken, simple fallback logic or fail. 
      // For this implementation, we will try to find a user by username and link if not linked, 
      // OR create a new one if username is free.

      user = await User.findOne({ username });

      if (user) {
        // Link existing user if they don't have a UID yet (Migration)
        if (!user.supabaseUid) {
          user.supabaseUid = supabaseUser.id;
          await user.save();
        } else {
          // Username taken by another supabase user
          return res.status(400).json({ message: "Username already associated with another account" });
        }
      } else {
        // Create new user
        user = new User({
          username,
          supabaseUid: supabaseUser.id,
          role: 'user', // Default role
          status: 'approved' // Auto-approve for now or use pending
        });
        await user.save();

        // Should emit admin event for new user stats here if possible, but req.io might not be available in middleware easily unless attached globally or passed.
        // We'll skip for now or rely on specific registration events.
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
