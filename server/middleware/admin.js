const User = require('../models/User');

module.exports = async function (req, res, next) {
    try {
        // Optimistic check: if role is in token
        if (req.user.role) {
            if (req.user.role !== 'admin') {
                return res.status(403).json({ message: 'Access denied. Admin only.' });
            }
            return next();
        }

        // Fallback for old tokens: check DB
        const user = await User.findById(req.user.id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        if (user.role !== 'admin') {
            return res.status(403).json({ message: 'Access denied. Admin only.' });
        }

        // Optionally attach role to req.user for future use in this request
        req.user.role = user.role;
        next();
    } catch (err) {
        console.error('Admin Middleware Error:', err);
        res.status(500).send('Server Error');
    }
};
