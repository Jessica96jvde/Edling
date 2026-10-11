// Import required packages
const express = require('express');
const Session = require('../models/Session');
const User = require('../models/User');
const { auth, authorize } = require('../middleware/auth');

// Create router
const router = express.Router();

// Get all sessions
router.get('/', auth, async (req, res) => {
  try {
    // Find all sessions and populate counselor data
    const sessions = await Session.find({})
      .populate('counselor', 'fullName username')
      .populate('registrations.user', 'username fullName')
      .populate({
        path: 'rescheduledTo',
        select: 'date time topic registrations',
        populate: {
          path: 'registrations.user',
          select: 'username fullName'
        }
      })
      .sort({ date: -1 });
    
    res.json(sessions);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get user's registered sessions (only future sessions)
router.get('/my-sessions', auth, authorize(['student']), async (req, res) => {
  try {
    // Get current date (start of today)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const sessions = await Session.find({ 
      registrations: req.user._id,
      date: { $gte: today }
    }).populate('counselor', 'fullName username');
    res.json(sessions);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get all user's sessions including cancelled ones and waitlist (for student dashboard)
router.get('/all-my-sessions', auth, authorize(['student']), async (req, res) => {
  try {
    // Get sessions where user is registered
    const registeredSessions = await Session.find({ 
      registrations: { $elemMatch: { user: req.user._id } }
    }).populate('counselor', 'fullName username')
      .populate('registrations.user', 'username fullName')
      .populate('rescheduledTo', 'date time topic registrations')
      .sort({ date: -1 });
    
    // Get sessions where user is on waitlist
    const waitlistSessions = await Session.find({ 
      waitlist: { $elemMatch: { user: req.user._id } }
    }).populate('counselor', 'fullName username')
      .populate('waitlist.user', 'username fullName')
      .populate('rescheduledTo', 'date time topic')
      .sort({ date: -1 });
    
    // Combine and mark waitlist status
    const allSessions = [
      ...registeredSessions.map(s => ({ ...s.toObject(), isWaitlisted: false })),
      ...waitlistSessions.filter(ws => !registeredSessions.find(rs => rs._id.toString() === ws._id.toString()))
                         .map(s => {
                           const waitlistPos = s.waitlist.findIndex(w => w.user.toString() === req.user._id.toString()) + 1;
                           return { ...s.toObject(), isWaitlisted: true, waitlistPosition: waitlistPos };
                         })
    ];
    
    // Sort by date
    allSessions.sort((a, b) => new Date(b.date) - new Date(a.date));
    
    console.log('All my sessions for user:', req.user._id, 'Sessions count:', allSessions.length);
    
    res.json(allSessions);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Send session request to counselor (admin only)
router.post('/request', auth, authorize(['admin']), async (req, res) => {
  try {
    const { counselor } = req.body;
    
    if (!counselor) {
      return res.status(400).json({ message: 'Counselor is required' });
    }
    
    // Create a session request (counselor will fill details)
    const session = new Session({
      counselor,
      date: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow as placeholder
      time: 'TBD',
      topic: 'Session Request - Pending Counselor Response',
      status: 'requested'
    });
    
    await session.save();
    await session.populate('counselor', 'fullName username');
    
    res.status(201).json({ message: 'Session request sent to counselor', session });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Counselor creates session details (counselor only)
router.post('/', auth, authorize(['counselor']), async (req, res) => {
  try {
    const { date, time, topic, maxCapacity = 20 } = req.body;
    
    if (!date || !time || !topic) {
      return res.status(400).json({ message: 'Date, time, and topic are required' });
    }
    
    // Validate date is not in the past
    const sessionDate = new Date(date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (sessionDate < today) {
      return res.status(400).json({ message: 'Session date cannot be in the past' });
    }
    
    const session = new Session({
      counselor: req.user._id,
      date: sessionDate,
      time,
      topic,
      maxCapacity,
      status: 'confirmed'
    });
    
    await session.save();
    await session.populate('counselor', 'fullName username');
    
    res.status(201).json(session);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Register for session (only students can do this)
router.post('/:id/register', auth, authorize(['student']), async (req, res) => {
  try {
    // Check if student has completed profile
    const user = await User.findById(req.user._id);
    if (!user.hasCompletedProfile) {
      return res.status(400).json({ 
        message: 'Please complete your profile first before registering for sessions',
        requiresProfile: true 
      });
    }

    // Find the session
    const session = await Session.findById(req.params.id);
    if (!session) {
      return res.status(404).json({ message: 'Session not found' });
    }

    // Check if already registered for this session
    const isAlreadyRegistered = session.registrations.some(reg => {
      const userId = typeof reg === 'string' ? reg : reg.user;
      return userId.toString() === req.user._id.toString();
    });
    
    // Check if in waitlist for this session
    const isInWaitlist = session.waitlist && session.waitlist.some(w => {
      const userId = typeof w.user === 'string' ? w.user : w.user;
      return userId.toString() === req.user._id.toString();
    });
    
    if (isAlreadyRegistered || isInWaitlist) {
      return res.status(400).json({ message: 'Already registered for this session' });
    }
    
    // Check if student is already registered for ANY OTHER session (past or future)
    // This prevents multiple registrations across different sessions
    // Only allow one active registration at a time
    const existingRegistration = await Session.findOne({
      'registrations.user': req.user._id,
      _id: { $ne: req.params.id },
      status: { $in: ['confirmed', 'completed'] }
    }).populate('registrations.user', 'username fullName');
    
    if (existingRegistration) {
      // Find the existing session details for better error message
      const existingReg = existingRegistration.registrations.find(
        r => r.user._id.toString() === req.user._id.toString()
      );
      
      return res.status(400).json({ 
        message: 'Already registered',
        details: 'You are already registered for another session. Only one session registration is allowed at a time.',
        alreadyRegistered: true,
        existingSessionId: existingRegistration._id,
        existingSessionDate: existingRegistration.date,
        tier: existingReg?.tier,
        rank: existingReg?.rank
      });
    }

    // Check if session is confirmed
    if (session.status !== 'confirmed') {
      return res.status(400).json({ message: 'Session is not available for registration' });
    }
    
    const { stressScore = 0 } = req.body;
    
    // TIER-BASED ALLOCATION SYSTEM
    // Tier 1 (0-10): First Come First Serve
    // Tier 2 (11-20): Based on stress score (seriousness)
    // Tier 3 (21-30): Hybrid (stress score with FIFO tiebreaker)
    
    const tier1Max = 10;
    const tier2Max = 10;
    const totalCapacity = 20;
    
    const tier1Count = session.registrations.filter(r => r.tier === 1).length;
    const tier2Count = session.registrations.filter(r => r.tier === 2).length;
    const tier3Count = session.registrations.filter(r => r.tier === 3).length;
    
    let allocationTier = null;
    let rank = null;
    
    // Determine which tier the student belongs to
    if (tier1Count < tier1Max) {
      // Tier 1: FIFO
      allocationTier = 1;
      rank = tier1Count + 1;
      
      session.registrations.push({
        user: req.user._id,
        stressScore: stressScore,
        registeredAt: new Date(),
        tier: 1,
        rank: rank
      });
    } else if (tier1Count + tier2Count < tier1Max + tier2Max) {
      // Tier 2: Stress-based (sorted by stress score descending)
      allocationTier = 2;
      
      // Add to registrations and sort by stress score
      session.registrations.push({
        user: req.user._id,
        stressScore: stressScore,
        registeredAt: new Date(),
        tier: 2,
        rank: 0 // Will be updated after sorting
      });
      
      // Re-rank all tier 2 students
      const tier2Students = session.registrations.filter(r => r.tier === 2).sort((a, b) => {
        if (b.stressScore !== a.stressScore) {
          return b.stressScore - a.stressScore; // Higher stress = higher priority
        }
        return new Date(a.registeredAt) - new Date(b.registeredAt); // FIFO for ties
      });
      
      tier2Students.forEach((student, index) => {
        student.rank = index + 1;
      });
      
      rank = session.registrations.find(r => r.user.toString() === req.user._id.toString()).rank;
    } else if (tier1Count + tier2Count + tier3Count < totalCapacity) {
      // Tier 3: Hybrid (stress-based with FIFO tiebreaker)
      allocationTier = 3;
      
      session.registrations.push({
        user: req.user._id,
        stressScore: stressScore,
        registeredAt: new Date(),
        tier: 3,
        rank: 0 // Will be updated after sorting
      });
      
      // Re-rank all tier 3 students
      const tier3Students = session.registrations.filter(r => r.tier === 3).sort((a, b) => {
        if (b.stressScore !== a.stressScore) {
          return b.stressScore - a.stressScore; // Higher stress = higher priority
        }
        return new Date(a.registeredAt) - new Date(b.registeredAt); // FIFO for ties
      });
      
      tier3Students.forEach((student, index) => {
        student.rank = index + 1;
      });
      
      rank = session.registrations.find(r => r.user.toString() === req.user._id.toString()).rank;
    } else {
      // Capacity full, add to waitlist
      session.waitlist.push({
        user: req.user._id,
        priority: stressScore,
        registeredAt: new Date(),
        tier: 3, // Waitlist follows tier 3 logic
        rank: session.waitlist.length + 1
      });
      
      console.log('Student added to waitlist:', req.user._id);
    }
    
    await session.save();
    
    console.log(`Registration successful for user: ${req.user._id}, Tier: ${allocationTier}, Rank: ${rank}`);

    
    // Send confirmation email for registered students
    if (allocationTier) {
      try {
        const nodemailer = require('nodemailer');
        
        const transporter = nodemailer.createTransport({
          host: 'smtp.gmail.com',
          port: 587,
          secure: false,
          auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS
          },
          tls: {
            rejectUnauthorized: false
          }
        });
        
        const populatedSession = await Session.findById(req.params.id).populate('counselor', 'fullName');
        
        const tierDescriptions = {
          1: 'Standard Allocation (First Come First Serve)',
          2: 'Priority Allocation (Based on Seriousness)',
          3: 'Hybrid Allocation (Seriousness + First Come)'
        };
        
        if (user.email) {
          console.log('Sending confirmation email to:', user.email);
          const mailOptions = {
            from: `"EDLING Platform" <${process.env.EMAIL_USER}>`,
            to: user.email,
            subject: 'Session Registration Confirmed',
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #1976d2;">Session Registration Confirmed</h2>
                <p>Dear ${user.fullName || user.username},</p>
                <p>Your registration for the counseling session has been confirmed!</p>
                <div style="background: #f0f8ff; padding: 20px; border-radius: 8px; margin: 20px 0;">
                  <h3 style="margin-top: 0;">Session Details:</h3>
                  <ul style="list-style: none; padding: 0;">
                    <li style="margin: 10px 0;"><strong>📋 Topic:</strong> ${populatedSession.topic}</li>
                    <li style="margin: 10px 0;"><strong>👨⚕️ Counselor:</strong> Dr. ${populatedSession.counselor.fullName}</li>
                    <li style="margin: 10px 0;"><strong>📅 Date:</strong> ${new Date(populatedSession.date).toLocaleDateString()}</li>
                    <li style="margin: 10px 0;"><strong>🕐 Time:</strong> ${populatedSession.time}</li>
                  </ul>
                </div>
                <div style="background: #f0f8e9; padding: 15px; border-radius: 8px; margin: 15px 0;">
                  <strong>Allocation Details:</strong>
                  <p style="margin: 8px 0; font-size: 14px;">
                    <strong>Tier:</strong> ${tierDescriptions[allocationTier]}<br>
                    <strong>Your Rank in Tier:</strong> #${rank}
                  </p>
                </div>
                <p style="color: #d32f2f;"><strong>Please be on time for your session.</strong></p>
                <p>Best regards,<br>
                <strong>Counseling Team</strong><br>
                EDLING Platform</p>
              </div>
            `
          };
          
          await transporter.sendMail(mailOptions);
          console.log('Email sent successfully to:', user.email);
        }
      } catch (emailError) {
        console.error('Email sending failed:', emailError);
      }
    } else {
      // Send waitlist notification email
      try {
        const nodemailer = require('nodemailer');
        
        const transporter = nodemailer.createTransport({
          host: 'smtp.gmail.com',
          port: 587,
          secure: false,
          auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS
          },
          tls: {
            rejectUnauthorized: false
          }
        });
        
        const populatedSession = await Session.findById(req.params.id).populate('counselor', 'fullName');
        const waitlistPosition = session.waitlist.findIndex(w => w.user.toString() === req.user._id.toString()) + 1;
        
        if (user.email) {
          console.log('Sending waitlist notification email to:', user.email);
          const mailOptions = {
            from: `"EDLING Platform" <${process.env.EMAIL_USER}>`,
            to: user.email,
            subject: 'Session Waitlist Notification',
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #ff9800;">⏳ Waitlist Notification</h2>
                <p>Dear ${user.fullName || user.username},</p>
                <p>You have been added to the <strong>waitlist</strong> for the counseling session.</p>
                <p style="color: #d32f2f; font-weight: bold;">Session is at full capacity (20/20)</p>
                <div style="background: #fff3e0; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ff9800;">
                  <h3 style="margin-top: 0; color: #ff9800;">Session Details:</h3>
                  <ul style="list-style: none; padding: 0;">
                    <li style="margin: 10px 0;"><strong>📋 Topic:</strong> ${populatedSession.topic}</li>
                    <li style="margin: 10px 0;"><strong>👨⚕️ Counselor:</strong> Dr. ${populatedSession.counselor.fullName}</li>
                    <li style="margin: 10px 0;"><strong>📅 Date:</strong> ${new Date(populatedSession.date).toLocaleDateString()}</li>
                    <li style="margin: 10px 0;"><strong>🕐 Time:</strong> ${populatedSession.time}</li>
                  </ul>
                </div>
                <div style="background: #f5f5f5; padding: 15px; border-radius: 8px; margin: 15px 0;">
                  <strong>📍 Your Position on Waitlist:</strong>
                  <p style="margin: 10px 0; font-size: 18px; color: #ff9800;"><strong>#${waitlistPosition}</strong></p>
                  <p style="margin: 5px 0; color: #666; font-size: 14px;">You will be notified immediately if a spot becomes available.</p>
                </div>
                <p style="color: #666; font-size: 14px;">
                  <strong>What happens next?</strong><br>
                  If a registered student cancels their session, you will be automatically promoted from the waitlist and notified via email with confirmation details.
                </p>
                <p>Best regards,<br>
                <strong>Counseling Team</strong><br>
                EDLING Platform</p>
              </div>
            `
          };
          
          await transporter.sendMail(mailOptions);
          console.log('Waitlist notification email sent to:', user.email);
        }
      } catch (emailError) {
        console.error('Error sending waitlist email:', emailError);
      }
    }
    
    res.json({ 
      message: 'Registration processed',
      success: true,
      confirmed: allocationTier !== null,
      pending: allocationTier === null,
      waitlisted: allocationTier === null,
      tier: allocationTier,
      rank: rank,
      tierDescription: allocationTier ? ['', 'First Come First Serve', 'Based on Seriousness', 'Hybrid (Seriousness + FIFO)'][allocationTier] : 'Waitlist',
      waitlistPosition: allocationTier === null ? session.waitlist.findIndex(w => w.user.toString() === req.user._id.toString()) + 1 : null
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Cancel registration (students only)
router.post('/:id/cancel-registration', auth, authorize(['student']), async (req, res) => {
  try {
    const session = await Session.findById(req.params.id)
      .populate('counselor', 'fullName email')
      .populate('registrations.user', 'email fullName username')
      .populate('waitlist.user', 'email fullName username');
    
    if (!session) {
      return res.status(404).json({ message: 'Session not found' });
    }
    
    // Check if student is registered
    const studentIndex = session.registrations.findIndex(
      reg => reg.user._id.toString() === req.user._id.toString()
    );
    
    if (studentIndex === -1) {
      return res.status(400).json({ message: 'You are not registered for this session' });
    }
    
    const removedStudent = session.registrations[studentIndex];
    
    // Remove student from registrations
    session.registrations.splice(studentIndex, 1);
    
    // Promote student from waitlist if available
    if (session.waitlist.length > 0) {
      // Sort waitlist by priority (stress score), then FIFO for ties
      session.waitlist.sort((a, b) => {
        if (b.priority !== a.priority) {
          return b.priority - a.priority; // Higher stress = higher priority
        }
        return new Date(a.registeredAt) - new Date(b.registeredAt); // FIFO for ties
      });
      
      // Promote highest priority user from waitlist
      const promoted = session.waitlist.shift();
      
      // Determine which tier the promoted student should be in
      const tier1Count = session.registrations.filter(r => r.tier === 1).length;
      const tier2Count = session.registrations.filter(r => r.tier === 2).length;
      const tier3Count = session.registrations.filter(r => r.tier === 3).length;
      
      const tier1Max = 10;
      const tier2Max = 10;
      
      let newTier = 3;
      if (tier1Count < tier1Max) {
        newTier = 1;
      } else if (tier1Count + tier2Count < tier1Max + tier2Max) {
        newTier = 2;
      }
      
      promoted.tier = newTier;
      promoted.rank = session.registrations.filter(r => r.tier === newTier).length + 1;
      
      session.registrations.push(promoted);
      
      // Send email to promoted student
      try {
        const promotedUser = await User.findById(promoted.user);
        const nodemailer = require('nodemailer');
        
        const transporter = nodemailer.createTransport({
          host: 'smtp.gmail.com',
          port: 587,
          secure: false,
          auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS
          },
          tls: {
            rejectUnauthorized: false
          }
        });
        
        const tierDescriptions = {
          1: 'Standard Allocation (First Come First Serve)',
          2: 'Priority Allocation (Based on Seriousness)',
          3: 'Hybrid Allocation (Seriousness + First Come)'
        };
        
        if (promotedUser.email) {
          const mailOptions = {
            from: `"EDLING Platform" <${process.env.EMAIL_USER}>`,
            to: promotedUser.email,
            subject: 'Great News! You\'ve Been Promoted from Waitlist',
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #4caf50;">✓ Session Confirmed!</h2>
                <p>Dear ${promotedUser.fullName || promotedUser.username},</p>
                <p>Great news! A spot has opened up in the counseling session you were waitlisted for.</p>
                <p style="color: #d32f2f; font-weight: bold;">Your registration is now CONFIRMED!</p>
                <div style="background: #f0f8ff; padding: 20px; border-radius: 8px; margin: 20px 0;">
                  <h3 style="margin-top: 0;">Session Details:</h3>
                  <ul style="list-style: none; padding: 0;">
                    <li style="margin: 10px 0;"><strong>📋 Topic:</strong> ${session.topic}</li>
                    <li style="margin: 10px 0;"><strong>👨⚕️ Counselor:</strong> Dr. ${session.counselor.fullName}</li>
                    <li style="margin: 10px 0;"><strong>📅 Date:</strong> ${new Date(session.date).toLocaleDateString()}</li>
                    <li style="margin: 10px 0;"><strong>🕐 Time:</strong> ${session.time}</li>
                  </ul>
                </div>
                <div style="background: #f0f8e9; padding: 15px; border-radius: 8px; margin: 15px 0;">
                  <strong>Allocation Details:</strong>
                  <p style="margin: 8px 0; font-size: 14px;">
                    <strong>Tier:</strong> ${tierDescriptions[newTier]}<br>
                    <strong>Your Rank in Tier:</strong> #${promoted.rank}
                  </p>
                </div>
                <p style="color: #d32f2f;"><strong>Please be on time for your session.</strong></p>
                <p>Best regards,<br>
                <strong>Counseling Team</strong><br>
                EDLING Platform</p>
              </div>
            `
          };
          
          await transporter.sendMail(mailOptions);
          console.log('Promotion email sent to:', promotedUser.email);
        }
      } catch (emailError) {
        console.error('Error sending promotion email:', emailError);
      }
    }
    
    await session.save();
    
    res.json({ 
      message: 'Registration cancelled successfully',
      promoted: session.waitlist.length === 0 ? false : true
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Update session status (admins and counselors only)
router.patch('/:id/status', auth, authorize(['admin', 'counselor']), async (req, res) => {
  try {
    // Get new status from request
    const { status } = req.body;
    
    // Update session
    const session = await Session.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true } // Return updated document
    );
    
    if (!session) {
      return res.status(404).json({ message: 'Session not found' });
    }
    
    res.json(session);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get session details with registrations and waitlist (admin/counselor only)
router.get('/:id/details', auth, authorize(['admin', 'counselor']), async (req, res) => {
  try {
    const session = await Session.findById(req.params.id)
      .populate('counselor', 'fullName username email')
      .populate('registrations', 'fullName username email rollNumber')
      .populate('waitlist.user', 'fullName username email rollNumber');
    
    if (!session) {
      return res.status(404).json({ message: 'Session not found' });
    }
    
    res.json(session);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Approve session (counselor only)
router.put('/:id/approve', auth, authorize(['counselor']), async (req, res) => {
  try {
    const session = await Session.findById(req.params.id).populate('counselor');
    
    if (!session) {
      return res.status(404).json({ message: 'Session not found' });
    }
    
    // Check if counselor owns this session
    if (session.counselor._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to approve this session' });
    }
    
    session.status = 'confirmed';
    await session.save();
    
    res.json({ message: 'Session approved successfully', session });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Reject session (counselor only)
router.put('/:id/reject', auth, authorize(['counselor']), async (req, res) => {
  try {
    const session = await Session.findById(req.params.id).populate('counselor');
    
    if (!session) {
      return res.status(404).json({ message: 'Session not found' });
    }
    
    // Check if counselor owns this session
    if (session.counselor._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to reject this session' });
    }
    
    session.status = 'rejected';
    await session.save();
    
    res.json({ message: 'Session rejected successfully', session });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get counselor's sessions (counselor only)
router.get('/my-counselor-sessions', auth, authorize(['counselor']), async (req, res) => {
  try {
    const sessions = await Session.find({ counselor: req.user._id })
      .populate('registrations', 'username fullName')
      .sort({ date: 1 });
    
    res.json(sessions);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Delete session/request (counselor only)
router.delete('/:id', auth, authorize(['counselor']), async (req, res) => {
  try {
    const session = await Session.findById(req.params.id);
    
    if (!session) {
      return res.status(404).json({ message: 'Session not found' });
    }
    
    if (session.counselor.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }
    
    await Session.findByIdAndDelete(req.params.id);
    res.json({ message: 'Session deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Reschedule session (counselor only - creates new session and transfers registrations)
router.post('/:id/reschedule', auth, authorize(['counselor']), async (req, res) => {
  try {
    const { newDate, newTime, newTopic } = req.body;
    
    if (!newDate || !newTime) {
      return res.status(400).json({ message: 'New date and time are required' });
    }
    
    // Find the original session
    const originalSession = await Session.findById(req.params.id)
      .populate('registrations.user', 'username fullName email');
    
    if (!originalSession) {
      return res.status(404).json({ message: 'Session not found' });
    }
    
    // Verify counselor owns this session
    if (originalSession.counselor.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }
    
    // Check that original session date is in the future
    const now = new Date();
    if (new Date(originalSession.date) <= now) {
      return res.status(400).json({ message: 'Can only reschedule sessions with future dates' });
    }
    
    // Create new session with same counselor and TRANSFER registrations
    const newSession = new Session({
      counselor: originalSession.counselor,
      date: new Date(newDate),
      time: newTime,
      topic: newTopic || originalSession.topic,
      maxCapacity: originalSession.maxCapacity,
      status: 'confirmed',
      // Transfer all registrations to the new session with their original tier and rank
      registrations: originalSession.registrations.map(reg => ({
        user: reg.user,
        stressScore: reg.stressScore,
        registeredAt: reg.registeredAt,
        tier: reg.tier,
        rank: reg.rank
      })),
      // Transfer waitlist if any
      waitlist: originalSession.waitlist ? originalSession.waitlist.map(w => ({
        user: w.user,
        priority: w.priority,
        registeredAt: w.registeredAt,
        tier: w.tier,
        rank: w.rank
      })) : []
    });
    
    await newSession.save();
    
    // Mark original session as cancelled and link to new session
    originalSession.status = 'cancelled';
    originalSession.rescheduledTo = newSession._id;
    await originalSession.save();
    
    await newSession.populate('counselor', 'fullName username');
    
    // Send email notifications to all registered students
    try {
      const nodemailer = require('nodemailer');
      
      const transporter = nodemailer.createTransport({
        host: 'smtp.gmail.com',
        port: 587,
        secure: false,
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS
        },
        tls: {
          rejectUnauthorized: false
        }
      });
      
      // Send rescheduling email to each registered student
      for (const registration of newSession.registrations) {
        const studentEmail = typeof registration.user === 'string' ? null : registration.user.email;
        const studentName = typeof registration.user === 'string' ? 'Student' : (registration.user.fullName || registration.user.username);
        
        if (studentEmail) {
          const mailOptions = {
            from: `"EDLING Platform" <${process.env.EMAIL_USER}>`,
            to: studentEmail,
            subject: '📌 Session Rescheduled - New Date & Time',
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #ff9800;">📌 Session Rescheduled</h2>
                <p>Dear ${studentName},</p>
                <p>The counseling session you are registered for has been <strong>rescheduled</strong> to a new date and time.</p>
                
                <div style="background: #ffebee; padding: 15px; border-radius: 8px; margin: 15px 0;">
                  <h3 style="margin-top: 0; color: #999;">❌ Original Session (CANCELLED):</h3>
                  <ul style="list-style: none; padding: 0; margin: 0;">
                    <li style="margin: 8px 0;"><strong style="color: #999;">📅 Date:</strong> <span style="text-decoration: line-through; color: #999;">${new Date(originalSession.date).toLocaleDateString()}</span></li>
                    <li style="margin: 8px 0;"><strong style="color: #999;">🕐 Time:</strong> <span style="text-decoration: line-through; color: #999;">${originalSession.time}</span></li>
                  </ul>
                </div>
                
                <div style="background: #f0f8ff; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #4caf50;">
                  <h3 style="margin-top: 0; color: #4caf50;">✅ New Session Details:</h3>
                  <ul style="list-style: none; padding: 0;">
                    <li style="margin: 10px 0;"><strong>📋 Topic:</strong> ${newSession.topic}</li>
                    <li style="margin: 10px 0;"><strong>👨⚕️ Counselor:</strong> Dr. ${newSession.counselor.fullName}</li>
                    <li style="margin: 10px 0;"><strong style="color: #4caf50;">📅 New Date:</strong> <span style="color: #4caf50; font-weight: bold;">${new Date(newSession.date).toLocaleDateString()}</span></li>
                    <li style="margin: 10px 0;"><strong style="color: #4caf50;">🕐 New Time:</strong> <span style="color: #4caf50; font-weight: bold;">${newSession.time}</span></li>
                    <li style="margin: 10px 0;"><strong>✓ Status:</strong> <span style="background: #4caf50; color: white; padding: 4px 8px; border-radius: 3px;">CONFIRMED</span></li>
                  </ul>
                </div>
                
                <p style="color: #666;">
                  <strong>Your registration has been automatically transferred to the new session.</strong><br>
                  Your tier, rank, and registration information have been preserved. Please update your calendar with the new date and time.
                </p>
                
                <p>If you have any questions, please contact Dr. ${newSession.counselor.fullName}.</p>
                
                <p>Best regards,<br>
                <strong>Counseling Team</strong><br>
                EDLING Platform</p>
              </div>
            `
          };
          
          await transporter.sendMail(mailOptions);
          console.log('Rescheduling email sent to:', studentEmail);
        }
      }
    } catch (emailError) {
      console.error('Error sending rescheduling emails:', emailError);
    }
    
    res.json({ 
      message: 'Session rescheduled successfully. All registrations have been transferred to the new session. Notifications sent to all participants.',
      originalSessionId: originalSession._id,
      newSession: newSession
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Cancel session (counselor only - no rescheduling)
router.post('/:id/cancel', auth, authorize(['counselor']), async (req, res) => {
  try {
    // Find the session
    const session = await Session.findById(req.params.id)
      .populate('counselor', 'fullName email username')
      .populate('registrations.user', 'email fullName username');
    
    if (!session) {
      return res.status(404).json({ message: 'Session not found' });
    }
    
    // Verify counselor owns this session
    if (session.counselor._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }
    
    // Check that session date is in the future
    const now = new Date();
    if (new Date(session.date) <= now) {
      return res.status(400).json({ message: 'Can only cancel sessions with future dates' });
    }
    
    // Mark session as cancelled
    session.status = 'cancelled';
    await session.save();
    
    // Send email notifications to all registered students
    try {
      const nodemailer = require('nodemailer');
      
      const transporter = nodemailer.createTransport({
        host: 'smtp.gmail.com',
        port: 587,
        secure: false,
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS
        },
        tls: {
          rejectUnauthorized: false
        }
      });
      
      // Send cancellation email to each registered student
      for (const registration of session.registrations) {
        if (registration.user.email) {
          const mailOptions = {
            from: `"EDLING Platform" <${process.env.EMAIL_USER}>`,
            to: registration.user.email,
            subject: '⚠️ Session Cancelled',
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #d32f2f;">❌ Session Cancelled</h2>
                <p>Dear ${registration.user.fullName || registration.user.username},</p>
                <p>Unfortunately, the counseling session you were registered for has been <strong>cancelled</strong>.</p>
                <div style="background: #ffebee; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #d32f2f;">
                  <h3 style="margin-top: 0; color: #d32f2f;">Cancelled Session Details:</h3>
                  <ul style="list-style: none; padding: 0;">
                    <li style="margin: 10px 0;"><strong>📋 Topic:</strong> ${session.topic}</li>
                    <li style="margin: 10px 0;"><strong>👨⚕️ Counselor:</strong> Dr. ${session.counselor.fullName}</li>
                    <li style="margin: 10px 0;"><strong>📅 Date:</strong> ${new Date(session.date).toLocaleDateString()}</li>
                    <li style="margin: 10px 0;"><strong>🕐 Time:</strong> ${session.time}</li>
                  </ul>
                </div>
                <p style="color: #666;">Your registration has been cancelled. Please check the portal for any rescheduled sessions.</p>
                <p>We apologize for any inconvenience. If you have any questions, please contact your counselor.</p>
                <p>Best regards,<br>
                <strong>Counseling Team</strong><br>
                EDLING Platform</p>
              </div>
            `
          };
          
          await transporter.sendMail(mailOptions);
          console.log('Cancellation email sent to:', registration.user.email);
        }
      }
    } catch (emailError) {
      console.error('Error sending cancellation emails:', emailError);
    }
    
    res.json({ 
      message: 'Session cancelled successfully. All participants have been notified.',
      sessionId: session._id
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get rescheduled sessions for counselor
router.get('/my-rescheduled-sessions', auth, authorize(['counselor']), async (req, res) => {
  try {
    // Find sessions cancelled and rescheduled by this counselor
    const sessions = await Session.find({
      counselor: req.user._id,
      status: 'cancelled',
      rescheduledTo: { $ne: null }
    })
    .populate('rescheduledTo', 'date time topic registrations')
    .sort({ date: -1 });
    
    res.json(sessions);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Export router
module.exports = router;