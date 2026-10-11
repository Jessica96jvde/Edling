// Import required packages
const mongoose = require('mongoose');
const User = require('./models/User');
const Session = require('./models/Session');
require('dotenv').config();
const dns = require('node:dns');

const initialPasswords = {
  student: process.env.INITIAL_STUDENT_PASSWORD,
  admin: process.env.INITIAL_ADMIN_PASSWORD,
  counselor1: process.env.INITIAL_COUNSELOR1_PASSWORD,
  counselor2: process.env.INITIAL_COUNSELOR2_PASSWORD
};

const dnsServers = (process.env.MONGODB_DNS_SERVERS || '1.1.1.1,1.0.0.1')
  .split(',')
  .map(server => server.trim())
  .filter(Boolean);
dns.setServers(dnsServers);

// Function to set up demo data
async function setupDemoData() {
  try {
    if (Object.values(initialPasswords).some(password => !password)) {
      throw new Error('Set all INITIAL_*_PASSWORD values in backend/.env before seeding.');
    }

    // Connect to database
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Clear existing data
    await User.deleteMany({});
    await Session.deleteMany({});
    console.log('🗑️  Cleared existing data');

    // Create student users from 25MX300 to 25MX360
    const students = [];
    for (let i = 300; i <= 360; i++) {
      const username = `25MX${i}`;
      students.push({
        username: username,
        password: initialPasswords.student,
        role: 'student'
      });
    }

    // Create admin and counselor users
    const otherUsers = [
      { 
        username: 'edling', 
        password: initialPasswords.admin,
        role: 'admin', 
        fullName: 'Admin User', 
        email: 'admin@college.edu' 
      },
      { 
        username: 'counselor1', 
        password: initialPasswords.counselor1,
        role: 'counselor', 
        fullName: 'Dr. Sarah Johnson', 
        email: 'sarah@college.edu' 
      },
      { 
        username: 'counselor2', 
        password: initialPasswords.counselor2,
        role: 'counselor', 
        fullName: 'Dr. Ritikaa', 
        email: 'ritikaa@college.edu' 
      }
    ];

    // Combine all users
    const allUsers = [...students, ...otherUsers];

    // Save users to database
    const createdUsers = await User.create(allUsers);
    console.log(`👥 Created ${students.length} students and ${otherUsers.length} other users`);

    // Get counselors for creating sessions
    const counselors = createdUsers.filter(user => user.role === 'counselor');
    
    // Create demo sessions with future dates
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    
    const nextWeek = new Date(today);
    nextWeek.setDate(today.getDate() + 7);
    
    const nextMonth = new Date(today);
    nextMonth.setDate(today.getDate() + 30);
    
    const lastWeek = new Date(today);
    lastWeek.setDate(today.getDate() - 7);
    
    const demoSessions = [
      {
        counselor: counselors[1]._id,
        date: lastWeek,
        time: '09:00 AM',
        status: 'completed',
        topic: 'Past Session (for feedback testing)'
      }
    ];

    // Save sessions to database
    await Session.create(demoSessions);
    console.log('📅 Demo sessions created');

    console.log('\nSeeded usernames: students 25MX300-25MX360, edling, counselor1, counselor2');
    console.log('Use the initial passwords configured in backend/.env.');
    console.log('\n✅ Database setup complete!');

    // Exit the process
    process.exit(0);
  } catch (error) {
    console.error('❌ Error setting up database:', error);
    process.exit(1);
  }
}

// Run the setup
setupDemoData();