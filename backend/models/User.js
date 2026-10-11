// Import required packages
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// Create user schema (structure)
const userSchema = new mongoose.Schema({
  username: { 
    type: String, 
    required: true, 
    unique: true 
  },
  password: { 
    type: String, 
    required: true 
  },
  role: { 
    type: String, 
    enum: ['student', 'admin', 'counselor'], 
    required: true 
  },
  email: String,
  fullName: String,
  phone: String,
  rollNumber: String,
  department: String,
  year: String,
  address: String,
  emergencyContact: String,
  hasCompletedProfile: { 
    type: Boolean, 
    default: false 
  },
  createdAt: { 
    type: Date, 
    default: Date.now 
  }
});

// Hash password before saving to database
userSchema.pre('save', async function(next) {
  // Only hash if password is new or changed
  if (!this.isModified('password')) return next();
  
  // Hash the password
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

// Method to check if password is correct
userSchema.methods.comparePassword = async function(password) {
  return bcrypt.compare(password, this.password);
};

// Export the model
module.exports = mongoose.model('User', userSchema);