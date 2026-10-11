const Session = require('./models/Session');
const User = require('./models/User');

// Process waitlist 2 days before session
async function processWaitlist() {
  try {
    const twoDaysFromNow = new Date();
    twoDaysFromNow.setDate(twoDaysFromNow.getDate() + 2);
    
    const sessions = await Session.find({
      date: { $lte: twoDaysFromNow, $gte: new Date() },
      status: 'confirmed'
    }).populate('waitlist.user', 'email fullName');
    
    for (const session of sessions) {
      if (session.waitlist.length > 0 && session.registrations.length < session.maxCapacity) {
        // Sort waitlist by priority (highest stress score first), then by registration time (FIFO for ties)
        session.waitlist.sort((a, b) => {
          if (b.priority === a.priority) {
            return new Date(a.registeredAt) - new Date(b.registeredAt); // FIFO for same priority
          }
          return b.priority - a.priority; // Higher priority first
        });
        
        // Move highest priority users from waitlist to registrations
        const spotsAvailable = session.maxCapacity - session.registrations.length;
        const toPromote = session.waitlist.splice(0, spotsAvailable);
        
        for (const waitlistEntry of toPromote) {
          session.registrations.push(waitlistEntry.user._id);
          
          // Send confirmation email
          console.log(`Promoted user ${waitlistEntry.user.email} to session ${session._id}`);
        }
        
        // Send reminder emails to all confirmed attendees (even if not full)
        const confirmedUsers = await User.find({ _id: { $in: session.registrations } });
        for (const user of confirmedUsers) {
          if (user.email) {
            console.log(`Sending reminder to confirmed attendee: ${user.email}`);
            // TODO: Send reminder email
          }
        }
        
        // Send apology emails to remaining waitlist users
        for (const waitlistEntry of session.waitlist) {
          if (waitlistEntry.user.email) {
            console.log(`Sending apology to waitlisted user: ${waitlistEntry.user.email}`);
            // TODO: Send apology email
          }
        }
        
        // Clear remaining waitlist after processing
        session.waitlist = [];
        
        await session.save();
      }
    }
  } catch (error) {
    console.error('Error processing waitlist:', error);
  }
}

// Run every hour
setInterval(processWaitlist, 60 * 60 * 1000);

module.exports = { processWaitlist };