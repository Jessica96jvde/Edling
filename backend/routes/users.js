// Import required packages
const express = require('express');
const User = require('../models/User');
const { auth, authorize } = require('../middleware/auth');

// Create router
const router = express.Router();

// Get user profile
router.get('/profile', auth, async (req, res) => {
  try {
    // Find user by ID (exclude password)
    const user = await User.findById(req.user._id).select('-password');
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Update user profile
router.put('/profile', auth, async (req, res) => {
  try {
    // Get data from request
    const { fullName, email, phone, department, year, address, emergencyContact } = req.body;
    
    // Check if all required fields are provided
    const isProfileComplete = !!(fullName && email && phone && department && year);
    
    // Prepare update object
    const updateData = {
      hasCompletedProfile: isProfileComplete
    };
    
    // Only update fields that are provided
    if (fullName) updateData.fullName = fullName;
    if (email) updateData.email = email;
    if (phone) updateData.phone = phone;
    if (department) updateData.department = department;
    if (year) updateData.year = year;
    if (address) updateData.address = address;
    if (emergencyContact) updateData.emergencyContact = emergencyContact;
    
    // Update user
    const user = await User.findByIdAndUpdate(
      req.user._id,
      updateData,
      { new: true } // Return updated document
    ).select('-password'); // Exclude password
    
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get all users (admins only)
router.get('/', auth, authorize(['admin']), async (req, res) => {
  try {
    // Find all users (exclude passwords)
    const users = await User.find().select('-password');
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get students with incomplete profiles (admin only)
router.get('/incomplete-profiles', auth, authorize(['admin']), async (req, res) => {
  try {
    const users = await User.find({ 
      role: 'student', 
      hasCompletedProfile: false 
    }).select('-password');
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Export router
module.exports = router;