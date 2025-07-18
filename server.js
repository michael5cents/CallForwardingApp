require('dotenv').config();
const express = require('express');
const path = require('path');
const database = require('./database');
const twiMLHelpers = require('./twiML_helpers');
const anthropicHelper = require('./anthropic_helper');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static('public'));

// Initialize database on startup
database.initializeDatabase()
  .then(() => {
    console.log('Database initialized successfully');
  })
  .catch((err) => {
    console.error('Failed to initialize database:', err);
    process.exit(1);
  });

// Webhook endpoint for incoming calls
app.post('/voice', async (req, res) => {
  try {
    const fromNumber = req.body.From;
    const callSid = req.body.CallSid;
    
    console.log(`Incoming call from ${fromNumber}, CallSid: ${callSid}`);
    
    // Check if caller is in contacts (whitelist)
    const contact = await database.getContactByPhoneNumber(fromNumber);
    
    if (contact) {
      // Path A: Contact exists - direct forwarding
      console.log(`Whitelisted contact found: ${contact.name}`);
      
      // Log the call
      await database.logCall(fromNumber, 'Whitelisted', `Direct call from ${contact.name}`);
      
      // Generate TwiML for direct forwarding
      const twiML = twiMLHelpers.generateDirectForwardingTwiML(
        contact.name, 
        process.env.MY_PERSONAL_NUMBER
      );
      
      res.set('Content-Type', 'text/xml');
      res.send(twiML);
      
    } else {
      // Path B: Unknown contact - AI gatekeeper
      console.log('Unknown contact - engaging AI gatekeeper');
      
      // Log the call as screening
      await database.logCall(fromNumber, 'Screening', 'AI gatekeeper engaged');
      
      // Generate TwiML for AI greeting
      const twiML = twiMLHelpers.generateAIGreetingTwiML();
      
      res.set('Content-Type', 'text/xml');
      res.send(twiML);
    }
    
  } catch (error) {
    console.error('Error in /voice webhook:', error);
    
    // Fallback TwiML
    const twiML = twiMLHelpers.generateRejectionTwiML();
    res.set('Content-Type', 'text/xml');
    res.send(twiML);
  }
});

// Webhook endpoint for handling AI gatekeeper responses
app.post('/handle-gather', async (req, res) => {
  try {
    const fromNumber = req.body.From;
    const speechResult = req.body.SpeechResult;
    const callSid = req.body.CallSid;
    
    console.log(`Speech result from ${fromNumber}: ${speechResult}`);
    
    if (!speechResult) {
      // No speech detected
      const twiML = twiMLHelpers.generateRejectionTwiML();
      res.set('Content-Type', 'text/xml');
      res.send(twiML);
      return;
    }
    
    // Analyze the speech with Claude AI
    const analysis = await anthropicHelper.analyzeCallerMessage(speechResult);
    
    console.log(`AI Analysis - Category: ${analysis.category}, Summary: ${analysis.summary}`);
    
    // Route based on AI analysis
    let twiML;
    let logStatus;
    
    switch (analysis.category) {
      case 'Urgent':
      case 'Sales':
        // Forward urgent and sales calls
        twiML = twiMLHelpers.generateScreenedForwardingTwiML(
          analysis.summary,
          process.env.MY_PERSONAL_NUMBER
        );
        logStatus = 'Forwarded';
        break;
        
      case 'Support':
      case 'Personal':
        // Send to voicemail
        twiML = twiMLHelpers.generateVoicemailTwiML();
        logStatus = 'Voicemail';
        break;
        
      case 'Spam':
      default:
        // Reject spam or unknown categories
        twiML = twiMLHelpers.generateRejectionTwiML();
        logStatus = 'Rejected';
        break;
    }
    
    // Update call log with AI analysis
    await database.logCall(fromNumber, logStatus, analysis.summary);
    
    res.set('Content-Type', 'text/xml');
    res.send(twiML);
    
  } catch (error) {
    console.error('Error in /handle-gather webhook:', error);
    
    // Fallback to rejection
    const twiML = twiMLHelpers.generateRejectionTwiML();
    res.set('Content-Type', 'text/xml');
    res.send(twiML);
  }
});

// Webhook endpoint for handling recording completion
app.post('/handle-recording', async (req, res) => {
  try {
    const fromNumber = req.body.From;
    const recordingUrl = req.body.RecordingUrl;
    
    console.log(`Recording completed from ${fromNumber}: ${recordingUrl}`);
    
    // Generate completion TwiML
    const twiML = twiMLHelpers.generateRecordingCompleteTwiML();
    
    res.set('Content-Type', 'text/xml');
    res.send(twiML);
    
  } catch (error) {
    console.error('Error in /handle-recording webhook:', error);
    
    const twiML = twiMLHelpers.generateRecordingCompleteTwiML();
    res.set('Content-Type', 'text/xml');
    res.send(twiML);
  }
});

// API endpoint to get all contacts
app.get('/api/contacts', async (req, res) => {
  try {
    const contacts = await database.getAllContacts();
    res.json(contacts);
  } catch (error) {
    console.error('Error getting contacts:', error);
    res.status(500).json({ error: 'Failed to retrieve contacts' });
  }
});

// API endpoint to add a new contact
app.post('/api/contacts', async (req, res) => {
  try {
    const { name, phone_number } = req.body;
    
    if (!name || !phone_number) {
      return res.status(400).json({ error: 'Name and phone number are required' });
    }
    
    const contact = await database.addContact(name, phone_number);
    res.json(contact);
  } catch (error) {
    console.error('Error adding contact:', error);
    if (error.message.includes('UNIQUE constraint failed')) {
      res.status(409).json({ error: 'Phone number already exists' });
    } else {
      res.status(500).json({ error: 'Failed to add contact' });
    }
  }
});

// API endpoint to delete a contact
app.delete('/api/contacts/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await database.deleteContact(id);
    
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Contact not found' });
    }
    
    res.json({ message: 'Contact deleted successfully' });
  } catch (error) {
    console.error('Error deleting contact:', error);
    res.status(500).json({ error: 'Failed to delete contact' });
  }
});

// API endpoint to get call logs
app.get('/api/call-logs', async (req, res) => {
  try {
    const logs = await database.getCallLogs();
    res.json(logs);
  } catch (error) {
    console.error('Error getting call logs:', error);
    res.status(500).json({ error: 'Failed to retrieve call logs' });
  }
});

// Serve dashboard
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start server
app.listen(PORT, () => {
  console.log(`Call forwarding app listening on port ${PORT}`);
  console.log(`Webhook URL: ${process.env.BASE_URL}/voice`);
  console.log(`Dashboard: http://localhost:${PORT}`);
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('Shutting down gracefully...');
  try {
    await database.closeDatabase();
    process.exit(0);
  } catch (error) {
    console.error('Error during shutdown:', error);
    process.exit(1);
  }
});