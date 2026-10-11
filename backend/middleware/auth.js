// Import required packages
const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Middleware to check if user is logged in
const auth = async (req, res, next) => {
  try {
    // Get token from request header
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    // Check if token exists
    if (!token) {
      return res.status(401).json({ message: 'Access denied. Please login.' });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Find user by ID
    const user = await User.findById(decoded.userId);
    if (!user) {
      return res.status(401).json({ message: 'Invalid token.' });
    }

    // Add user to request object
    req.user = user;
    next(); // Continue to next function
  } catch (error) {
    res.status(401).json({ message: 'Invalid token.' });
  }
};

// Middleware to check user role
const authorize = (allowedRoles) => {
  return (req, res, next) => {
    // Check if user role is allowed
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Access denied. Insufficient permissions.' });
    }
    next(); // Continue to next function
  };
};

// Export middleware functions
module.exports = { auth, authorize };