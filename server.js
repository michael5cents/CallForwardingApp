require('dotenv').config();
const express = require('express');
const path = require('path');
const http = require('http');
const socketIo = require('socket.io');
const database = require('./database');
const twiMLHelpers = require('./twiML_helpers');
const anthropicHelper = require('./anthropic_helper');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);
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

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('Dashboard connected');
  
  socket.on('disconnect', () => {
    console.log('Dashboard disconnected');
  });
});

// Webhook endpoint for incoming calls
app.post('/voice', async (req, res) => {
  try {
    const fromNumber = req.body.From;
    const callSid = req.body.CallSid;
    
    console.log(`Incoming call from ${fromNumber}, CallSid: ${callSid}`);
    
    // Emit real-time call event
    io.emit('call-incoming', {
      from: fromNumber,
      callSid: callSid,
      timestamp: new Date().toISOString(),
      status: 'incoming'
    });
    
    // Check if caller is in contacts (whitelist)
    const contact = await database.getContactByPhoneNumber(fromNumber);
    
    if (contact) {
      // Path A: Contact exists - direct forwarding
      console.log(`Whitelisted contact found: ${contact.name}`);
      
      // Emit whitelisted event
      io.emit('call-whitelisted', {
        from: fromNumber,
        callSid: callSid,
        contactName: contact.name,
        timestamp: new Date().toISOString()
      });
      
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
      
      // Emit screening event
      io.emit('call-screening', {
        from: fromNumber,
        callSid: callSid,
        timestamp: new Date().toISOString(),
        status: 'AI screening engaged'
      });
      
      // Log the call as screening
      await database.logCall(fromNumber, 'Screening', 'AI gatekeeper engaged');
      
      // Generate TwiML for AI greeting
      const twiML = twiMLHelpers.generateAIGreetingTwiML();
      
      res.set('Content-Type', 'text/xml');
      res.send(twiML);
    }
    
  } catch (error) {
    console.error('Error in /voice webhook:', error);
    
    // Emit error event
    io.emit('call-error', {
      error: error.message,
      timestamp: new Date().toISOString()
    });
    
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
    
    // Emit speech analysis event
    io.emit('call-speech-received', {
      from: fromNumber,
      callSid: callSid,
      speech: speechResult,
      timestamp: new Date().toISOString()
    });
    
    if (!speechResult) {
      // No speech detected
      io.emit('call-no-speech', {
        from: fromNumber,
        callSid: callSid,
        timestamp: new Date().toISOString()
      });
      
      const twiML = twiMLHelpers.generateRejectionTwiML();
      res.set('Content-Type', 'text/xml');
      res.send(twiML);
      return;
    }
    
    // Emit AI analysis start
    io.emit('ai-analysis-start', {
      from: fromNumber,
      callSid: callSid,
      speech: speechResult,
      timestamp: new Date().toISOString()
    });
    
    // Analyze the speech with Claude AI
    const analysis = await anthropicHelper.analyzeCallerMessage(speechResult);
    
    console.log(`AI Analysis - Category: ${analysis.category}, Summary: ${analysis.summary}`);
    
    // Emit AI analysis result
    io.emit('ai-analysis-complete', {
      from: fromNumber,
      callSid: callSid,
      category: analysis.category,
      summary: analysis.summary,
      timestamp: new Date().toISOString()
    });
    
    // Route based on AI analysis
    let twiML;
    let logStatus;
    
    switch (analysis.category) {
      case 'Urgent':
      case 'Sales':
        // Forward urgent and sales calls
        io.emit('call-forwarding', {
          from: fromNumber,
          callSid: callSid,
          category: analysis.category,
          summary: analysis.summary,
          forwardTo: process.env.MY_PERSONAL_NUMBER,
          timestamp: new Date().toISOString()
        });
        
        twiML = twiMLHelpers.generateScreenedForwardingTwiML(
          analysis.summary,
          process.env.MY_PERSONAL_NUMBER
        );
        logStatus = 'Forwarded';
        break;
        
      case 'Support':
      case 'Personal':
        // Send to voicemail
        io.emit('call-voicemail', {
          from: fromNumber,
          callSid: callSid,
          category: analysis.category,
          summary: analysis.summary,
          timestamp: new Date().toISOString()
        });
        
        twiML = twiMLHelpers.generateVoicemailTwiML();
        logStatus = 'Voicemail';
        break;
        
      case 'Spam':
      default:
        // Reject spam or unknown categories
        io.emit('call-rejected', {
          from: fromNumber,
          callSid: callSid,
          category: analysis.category,
          summary: analysis.summary,
          timestamp: new Date().toISOString()
        });
        
        twiML = twiMLHelpers.generateRejectionTwiML();
        logStatus = 'Rejected';
        break;
    }
    
    // Update call log with AI analysis (will be updated with recording URL later if voicemail)
    await database.logCall(fromNumber, logStatus, analysis.summary);
    
    res.set('Content-Type', 'text/xml');
    res.send(twiML);
    
  } catch (error) {
    console.error('Error in /handle-gather webhook:', error);
    
    // Emit error event
    io.emit('call-error', {
      error: error.message,
      timestamp: new Date().toISOString()
    });
    
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
    const callSid = req.body.CallSid;
    
    console.log(`Recording completed from ${fromNumber}: ${recordingUrl}`);
    
    // Update the call log with the recording URL
    await database.updateCallLogWithRecording(fromNumber, recordingUrl);
    
    // Emit recording completion event
    io.emit('call-recording-complete', {
      from: fromNumber,
      callSid: callSid,
      recordingUrl: recordingUrl,
      timestamp: new Date().toISOString()
    });
    
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
    
    // Emit contact added event
    io.emit('contact-added', contact);
    
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
    
    // Emit contact deleted event
    io.emit('contact-deleted', { id: parseInt(id) });
    
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

// API endpoint to delete a call log
app.delete('/api/call-logs/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await database.deleteCallLog(id);
    
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Call log not found' });
    }
    
    // Emit call log deleted event
    io.emit('call-log-deleted', { id: parseInt(id) });
    
    res.json({ message: 'Call log deleted successfully' });
  } catch (error) {
    console.error('Error deleting call log:', error);
    res.status(500).json({ error: 'Failed to delete call log' });
  }
});

// API endpoint to clear all call logs
app.delete('/api/call-logs', async (req, res) => {
  try {
    const result = await database.clearAllCallLogs();
    
    // Emit all call logs cleared event
    io.emit('call-logs-cleared');
    
    res.json({ message: `Deleted ${result.changes} call logs` });
  } catch (error) {
    console.error('Error clearing call logs:', error);
    res.status(500).json({ error: 'Failed to clear call logs' });
  }
});

// Proxy endpoint for Twilio recordings (to avoid authentication issues)
app.get('/recording/:recordingSid', async (req, res) => {
  try {
    const { recordingSid } = req.params;
    
    // Initialize Twilio client
    const twilioClient = require('twilio')(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
    
    // Get the recording
    const recording = await twilioClient.recordings(recordingSid).fetch();
    
    // Stream the recording file
    const recordingUrl = `https://api.twilio.com${recording.uri.replace('.json', '.wav')}`;
    
    // Fetch the recording with Twilio auth
    const response = await fetch(recordingUrl, {
      headers: {
        'Authorization': 'Basic ' + Buffer.from(`${process.env.TWILIO_ACCOUNT_SID}:${process.env.TWILIO_AUTH_TOKEN}`).toString('base64')
      }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch recording: ${response.status}`);
    }
    
    // Set appropriate headers
    res.setHeader('Content-Type', 'audio/wav');
    res.setHeader('Content-Disposition', `inline; filename="recording-${recordingSid}.wav"`);
    
    // Stream the audio data
    const buffer = await response.arrayBuffer();
    res.send(Buffer.from(buffer));
    
  } catch (error) {
    console.error('Error fetching recording:', error);
    res.status(500).json({ error: 'Failed to fetch recording' });
  }
});

// Serve dashboard
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start server
server.listen(PORT, () => {
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