// Import required packages
const mongoose = require('mongoose');

// Create session schema (structure)
const sessionSchema = new mongoose.Schema({
  counselor: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  date: { 
    type: Date, 
    required: true 
  },
  time: { 
    type: String, 
    required: true 
  },
  topic: {
    type: String,
    default: 'General Counseling'
  },
  // Tier 1: First 10 registrations (FIFO)
  registrations: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    stressScore: { type: Number, default: 0 },
    registeredAt: { type: Date, default: Date.now },
    tier: { type: Number, enum: [1, 2, 3], default: 1 }, // 1=FIFO(0-10), 2=Stress(11-20), 3=Hybrid(21-30)
    rank: { type: Number } // Position within tier
  }],
  maxCapacity: { 
    type: Number, 
    default: 20 
  },
  // Tier 2: Next 10 registrations (based on stress score)
  waitlist: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    priority: { type: Number, default: 0 }, // stress score
    registeredAt: { type: Date, default: Date.now },
    tier: { type: Number, enum: [2, 3], default: 2 }, // 2=Stress, 3=Hybrid
    rank: { type: Number } // Position within tier
  }],
  status: { 
    type: String, 
    enum: ['requested', 'pending', 'confirmed', 'completed', 'cancelled', 'rejected'], 
    default: 'pending' 
  },
  rescheduledTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Session',
    default: null
  },
  createdAt: { 
    type: Date, 
    default: Date.now 
  }
});

// Export the model
module.exports = mongoose.model('Session', sessionSchema);