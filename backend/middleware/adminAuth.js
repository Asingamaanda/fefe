const auth = require('./auth');

const adminAuth = async (req, res, next) => {
  // First run regular auth middleware
  auth(req, res, (error) => {
    if (error) {
      return next(error);
    }

    // Check if user has admin role
    if (req.user.role !== 'admin') {
      return res.status(403).json({ 
        message: 'Access denied. Admin privileges required.' 
      });
    }

    next();
  });
};

module.exports = adminAuth;
