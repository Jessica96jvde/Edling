// Import required packages
const express = require('express');
const Feedback = require('../models/Feedback');
const Session = require('../models/Session');
const { auth, authorize } = require('../middleware/auth');

// Create router
const router = express.Router();

// Get completed sessions for feedback (student only)
router.get('/available-sessions', auth, authorize(['student']), async (req, res) => {
  try {
    // Get current date
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Find completed sessions where student was registered and date has passed
    const sessions = await Session.find({
      registrations: req.user._id,
      $or: [
        { status: 'completed' },
        { date: { $lt: today } } // Past sessions automatically available for feedback
      ]
    }).populate('counselor', 'fullName username');

    // Create anonymous hash for this student
    const crypto = require('crypto');
    const studentHash = crypto.createHash('sha256').update(req.user._id.toString()).digest('hex');

    // Check which sessions already have feedback from this student (using hash)
    const sessionsWithFeedback = await Feedback.find({
      studentHash: studentHash,
      session: { $in: sessions.map(s => s._id) }
    }).select('session');

    const feedbackSessionIds = sessionsWithFeedback.map(f => f.session.toString());
    
    // Filter out sessions that already have feedback
    const availableSessions = sessions.filter(session => 
      !feedbackSessionIds.includes(session._id.toString())
    );

    res.json(availableSessions);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Submit feedback (only students can do this) - Anonymous
router.post('/', auth, authorize(['student']), async (req, res) => {
  try {
    // Get data from request
    const { sessionId, rating, comment } = req.body;
    
    // Check if session exists
    const session = await Session.findById(sessionId);
    if (!session) {
      return res.status(404).json({ message: 'Session not found' });
    }
    
    // Check if student was registered for this session
    if (!session.registrations.includes(req.user._id)) {
      return res.status(400).json({ message: 'You were not registered for this session' });
    }
    
    // Create anonymous hash for this student
    const crypto = require('crypto');
    const studentHash = crypto.createHash('sha256').update(req.user._id.toString()).digest('hex');
    
    // Check if feedback already exists (using hash)
    const existingFeedback = await Feedback.findOne({
      studentHash: studentHash,
      session: sessionId
    });
    
    if (existingFeedback) {
      return res.status(400).json({ message: 'Feedback already submitted for this session' });
    }
    
    // Create new anonymous feedback
    const feedback = new Feedback({
      session: sessionId,
      studentHash: studentHash,
      rating,
      comment
    });
    
    // Save to database
    await feedback.save();
    res.status(201).json({ message: 'Anonymous feedback submitted successfully' });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: 'Feedback already submitted for this session' });
    }
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get all feedback (admins and counselors only) - Anonymous
router.get('/', auth, authorize(['admin', 'counselor']), async (req, res) => {
  try {
    // Find all feedback (anonymous - no student info)
    const feedback = await Feedback.find()
      .populate({
        path: 'session',
        populate: {
          path: 'counselor',
          select: 'fullName username'
        }
      })
      .select('-studentHash'); // Don't expose the hash
    
    // Format feedback to show as anonymous
    const anonymousFeedback = feedback.map(f => ({
      _id: f._id,
      session: f.session,
      rating: f.rating,
      comment: f.comment,
      createdAt: f.createdAt,
      student: 'Anonymous' // Always show as anonymous
    }));
    
    res.json(anonymousFeedback);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Export router
module.exports = router;