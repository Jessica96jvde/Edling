// Import required packages
const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Create router
const router = express.Router();

// Login route
router.post('/login', async (req, res) => {
  try {
    // Get data from request
    const { username, password, role } = req.body;

    // Find user in database
    const user = await User.findOne({ username, role });
    
    // Check if user exists and password is correct
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ message: 'Invalid username or password' });
    }

    // Create JWT token
    const token = jwt.sign(
      { userId: user._id }, 
      process.env.JWT_SECRET, 
      { expiresIn: '24h' }
    );
    
    // Send response
    res.json({
      token,
      user: {
        id: user._id,
        username: user.username,
        role: user.role,
        fullName: user.fullName
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Register route (for creating new users)
router.post('/register', async (req, res) => {
  try {
    // Get data from request
    const { username, password, role, email, fullName, phone } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(400).json({ message: 'Username already exists' });
    }

    // Create new user
    const user = new User({ username, password, role, email, fullName, phone });
    await user.save();

    // Create JWT token
    const token = jwt.sign(
      { userId: user._id }, 
      process.env.JWT_SECRET, 
      { expiresIn: '24h' }
    );
    
    // Send response
    res.status(201).json({
      token,
      user: {
        id: user._id,
        username: user.username,
        role: user.role,
        fullName: user.fullName
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Export router
module.exports = router;