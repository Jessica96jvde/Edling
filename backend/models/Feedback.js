// Import required packages
const mongoose = require('mongoose');

// Create feedback schema (structure) - Anonymous feedback
const feedbackSchema = new mongoose.Schema({
  session: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Session',
    required: true 
  },
  studentHash: {
    type: String,
    required: true
  },
  rating: { 
    type: Number, 
    min: 1, 
    max: 5, 
    required: true 
  },
  comment: { 
    type: String, 
    required: true 
  },
  createdAt: { 
    type: Date, 
    default: Date.now 
  }
});

// Ensure one feedback per student per session (using hash)
feedbackSchema.index({ session: 1, studentHash: 1 }, { unique: true });

// Export the model
module.exports = mongoose.model('Feedback', feedbackSchema);