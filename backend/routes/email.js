// Import required packages
const express = require('express');
const nodemailer = require('nodemailer');
const User = require('../models/User');
const Session = require('../models/Session');
const { auth, authorize } = require('../middleware/auth');

// Create router
const router = express.Router();

// Create Gmail transporter using your credentials
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER, // Your Gmail
    pass: process.env.EMAIL_PASS  // Your App Password
  }
});

// Send email to all students (admin only)
router.post('/send-to-students', auth, authorize(['admin']), async (req, res) => {
  try {
    const { subject, message } = req.body;
    
    // Get all students with emails
    const students = await User.find({ 
      role: 'student',
      email: { $exists: true, $ne: '' }
    });
    
    if (students.length === 0) {
      return res.status(400).json({ message: 'No student emails found' });
    }
    
    // Send individual emails to each student
    let emailsSent = 0;
    const failedEmails = [];
    
    for (const student of students) {
      try {
        const mailOptions = {
          from: `"EDLING Admin" <${process.env.EMAIL_USER}>`,
          to: student.email,
          subject: subject,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #1976d2;">EDLING - Counseling Platform</h2>
              <p>Dear ${student.fullName || student.username},</p>
              <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
                ${message}
              </div>
              <p>Best regards,<br>
              <strong>Counseling Team</strong><br>
              EDLING Platform</p>
            </div>
          `
        };
        
        await transporter.sendMail(mailOptions);
        emailsSent++;
      } catch (error) {
        failedEmails.push(student.email);
      }
    }
    
    res.json({ 
      message: `Email sent to ${emailsSent} students`,
      emailsSent: emailsSent,
      totalStudents: students.length,
      failedEmails: failedEmails
    });
  } catch (error) {
    res.status(500).json({ message: 'Error sending email', error: error.message });
  }
});

// Send session notification (admin only)
router.post('/session-notification/:sessionId', auth, authorize(['admin']), async (req, res) => {
  try {
    const { sessionId } = req.params;
    
    // Get session with registered students
    const session = await Session.findById(sessionId)
      .populate('counselor', 'fullName')
      .populate('registrations', 'email fullName username');
    
    if (!session) {
      return res.status(404).json({ message: 'Session not found' });
    }
    
    // Filter students with emails
    const studentsWithEmails = session.registrations.filter(student => student.email);
    
    if (studentsWithEmails.length === 0) {
      return res.status(400).json({ message: 'No registered student emails found' });
    }
    
    let emailsSent = 0;
    const failedEmails = [];
    
    // Send individual emails
    for (const student of studentsWithEmails) {
      try {
        const mailOptions = {
          from: `"EDLING Admin" <${process.env.EMAIL_USER}>`,
          to: student.email,
          subject: `Session Reminder - ${session.topic}`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #1976d2;">Session Reminder</h2>
              <p>Dear ${student.fullName || student.username},</p>
              <p>This is a reminder for your upcoming counseling session:</p>
              <div style="background: #f0f8ff; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <ul style="list-style: none; padding: 0;">
                  <li style="margin: 10px 0;"><strong>📋 Topic:</strong> ${session.topic}</li>
                  <li style="margin: 10px 0;"><strong>👨‍⚕️ Counselor:</strong> ${session.counselor.fullName}</li>
                  <li style="margin: 10px 0;"><strong>📅 Date:</strong> ${new Date(session.date).toLocaleDateString()}</li>
                  <li style="margin: 10px 0;"><strong>🕐 Time:</strong> ${session.time}</li>
                </ul>
              </div>
              <p style="color: #d32f2f;"><strong>Please be on time for your session.</strong></p>
              <p>Best regards,<br>
              <strong>Counseling Team</strong><br>
              EDLING Platform</p>
            </div>
          `
        };
        
        await transporter.sendMail(mailOptions);
        emailsSent++;
      } catch (error) {
        failedEmails.push(student.email);
      }
    }
    
    res.json({ 
      message: `Session notification sent to ${emailsSent} students`,
      emailsSent: emailsSent,
      totalRegistered: studentsWithEmails.length,
      failedEmails: failedEmails
    });
  } catch (error) {
    res.status(500).json({ message: 'Error sending notification', error: error.message });
  }
});

// Export router
module.exports = router;