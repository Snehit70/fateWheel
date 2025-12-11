const jwt = require("jsonwebtoken");

module.exports = function (req, res, next) {
  // Whitelist endpoints that don't require authentication
  if (req.path === "/healthz") {
    return next();
  }

  // TODO: Refactor to use standard 'Authorization: Bearer <token>' header in future
  // Get token from header
  const token = req.header("x-auth-token");

  // Check if not token
  if (!token) {
    return res.status(401).json({ message: "No token, authorization denied" });
  }

  // Verify token
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded.user;
    next();
  } catch (err) {
    console.error("Auth Middleware Error:", err.message);
    res.status(401).json({ message: "Token is not valid" });
  }
};
