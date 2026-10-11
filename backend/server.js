// Import required packages
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
require('dotenv').config();
const dns = require('node:dns');
const { processWaitlist } = require('./priorityProcessor');

const dnsServers = (process.env.MONGODB_DNS_SERVERS || '1.1.1.1,1.0.0.1')
  .split(',')
  .map(server => server.trim())
  .filter(Boolean);
dns.setServers(dnsServers);

// Create Express app
const app = express();

// Basic middleware setup
app.use(cors()); // Allow cross-origin requests
app.use(express.json()); // Parse JSON data
app.use(express.static(path.join(__dirname, '../frontend'))); // Serve frontend files

// Connect to MongoDB database
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('✅ Connected to MongoDB'))
  .catch(err => console.error('❌ MongoDB connection error:', err));

// Import and use API routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/sessions', require('./routes/sessions'));
app.use('/api/feedback', require('./routes/feedback'));
app.use('/api/users', require('./routes/users'));
app.use('/api/email', require('./routes/email'));
app.use('/api/email', require('./routes/email'));

// Serve main page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🌐 Visit: http://localhost:${PORT}`);
});