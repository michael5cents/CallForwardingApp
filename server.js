require('dotenv').config();
const express = require('express');
const path = require('path');
const http = require('http');
const https = require('https');
const fs = require('fs');
const socketIo = require('socket.io');
const session = require('express-session');
const database = require('./database');
const twiMLHelpers = require('./twiML_helpers');
const anthropicHelper = require('./anthropic_helper');
const auth = require('./auth');

const app = express();
const PORT = process.env.PORT || 3001;

// Create HTTP server but configure Node.js for outgoing HTTPS
process.env["NODE_TLS_REJECT_UNAUTHORIZED"] = 0; // Allow self-signed certs for outgoing requests
const server = http.createServer(app);
const io = socketIo(server);

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Session middleware for web authentication
app.use(session({
  secret: process.env.SESSION_SECRET || 'call-forwarding-secret-key-2025',
  resave: false,
  saveUninitialized: false,
  cookie: { 
    secure: false, // Set to true if using HTTPS
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// CORS middleware for mobile app access
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, User-Agent, Accept, Host, X-API-Key');
  
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});

// Authentication routes
app.post('/login', (req, res) => {
  const { username, password } = req.body;
  
  if (auth.verifyWebCredentials(username, password)) {
    req.session.authenticated = true;
    req.session.token = auth.generateSessionToken();
    res.redirect('/');
  } else {
    res.status(401).send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Call Forwarding System - Login Failed</title>
        <style>
          body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            display: flex; justify-content: center; align-items: center; 
            height: 100vh; margin: 0; 
          }
          .login-container { 
            background: white; padding: 2rem; border-radius: 10px; 
            box-shadow: 0 10px 25px rgba(0,0,0,0.2); max-width: 400px; width: 100%; 
          }
          h1 { text-align: center; margin-bottom: 2rem; color: #333; }
          .error { color: #e74c3c; margin-bottom: 1rem; text-align: center; font-weight: 500; }
          .form-group { margin-bottom: 1rem; }
          label { display: block; margin-bottom: 0.5rem; color: #555; font-weight: 500; }
          input { 
            width: 100%; padding: 0.75rem; border: 2px solid #ddd; border-radius: 5px; 
            font-size: 1rem; transition: border-color 0.3s;
          }
          input:focus { outline: none; border-color: #667eea; }
          button { 
            width: 100%; padding: 0.75rem; background: #667eea; color: white; 
            border: none; border-radius: 5px; font-size: 1rem; cursor: pointer;
            transition: background 0.3s;
          }
          button:hover { background: #5a6fd8; }
        </style>
      </head>
      <body>
        <div class="login-container">
          <h1>🔒 Call Forwarding System</h1>
          <div class="error">❌ Invalid username or password</div>
          <form method="POST" action="/login">
            <div class="form-group">
              <label for="username">Username:</label>
              <input type="text" id="username" name="username" required value="${username || ''}">
            </div>
            <div class="form-group">
              <label for="password">Password:</label>
              <input type="password" id="password" name="password" required>
            </div>
            <button type="submit">Login</button>
          </form>
        </div>
      </body>
      </html>
    `);
  }
});

app.get('/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/');
});

app.get('/api/auth-info', (req, res) => {
  res.json({
    credentials: auth.getCredentials(),
    message: 'Use these credentials for mobile app configuration'
  });
});

// Handle host header issues
app.use((req, res, next) => {
  // Allow requests from popzplace.com
  if (req.headers.host && req.headers.host.includes('popzplace.com')) {
    next();
  } else {
    next();
  }
});

// Apply authentication middleware
app.use((req, res, next) => auth.requireAuth(req, res, next));

// Serve static files (protected by auth)
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

// Socket.IO connection handling - SIMPLIFIED
io.on('connection', (socket) => {
  console.log('Dashboard connected');
  
  // Send immediate test event to verify connection
  socket.emit('connection-test', {
    message: 'Connection established successfully',
    timestamp: new Date().toISOString()
  });
  
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
    
    // First check if caller is blacklisted
    const blacklistEntry = await database.getBlacklistByPhoneNumber(fromNumber);
    
    if (blacklistEntry) {
      // Path C: Blacklisted caller - send TCPA compliance message
      console.log(`Blacklisted caller detected: ${fromNumber}, reason: ${blacklistEntry.reason}`);
      
      // Emit blacklisted event
      io.emit('call-blacklisted', {
        from: fromNumber,
        callSid: callSid,
        reason: blacklistEntry.reason,
        timestamp: new Date().toISOString()
      });
      
      // Log the call as blacklisted
      await database.logCall(fromNumber, 'Blacklisted', `TCPA compliance message sent - ${blacklistEntry.reason}`);
      
      // Generate TwiML for TCPA compliance message
      const twiML = twiMLHelpers.generateTCPAComplianceTwiML();
      
      res.set('Content-Type', 'text/xml');
      res.send(twiML);
      return;
    }
    
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

// Blacklist Management API Endpoints

// API endpoint to get all blacklist entries
app.get('/api/blacklist', async (req, res) => {
  try {
    const blacklist = await database.getAllBlacklistEntries();
    res.json(blacklist);
  } catch (error) {
    console.error('Error getting blacklist:', error);
    res.status(500).json({ error: 'Failed to retrieve blacklist' });
  }
});

// API endpoint to add a number to blacklist
app.post('/api/blacklist', async (req, res) => {
  try {
    const { phone_number, reason, pattern_type } = req.body;
    
    if (!phone_number) {
      return res.status(400).json({ error: 'Phone number is required' });
    }
    
    const entry = await database.addToBlacklist(phone_number, reason, pattern_type);
    
    // Emit blacklist added event
    io.emit('blacklist-added', entry);
    
    res.json(entry);
  } catch (error) {
    console.error('Error adding to blacklist:', error);
    if (error.message.includes('UNIQUE constraint failed')) {
      res.status(409).json({ error: 'Phone number already in blacklist' });
    } else {
      res.status(500).json({ error: 'Failed to add to blacklist' });
    }
  }
});

// API endpoint to remove a number from blacklist
app.delete('/api/blacklist/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await database.removeFromBlacklist(id);
    
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Blacklist entry not found' });
    }
    
    // Emit blacklist removed event
    io.emit('blacklist-removed', { id: parseInt(id) });
    
    res.json({ message: 'Number removed from blacklist successfully' });
  } catch (error) {
    console.error('Error removing from blacklist:', error);
    res.status(500).json({ error: 'Failed to remove from blacklist' });
  }
});

// API endpoint to clear all blacklist entries
app.delete('/api/blacklist', async (req, res) => {
  try {
    const result = await database.clearAllBlacklist();
    
    // Emit all blacklist cleared event
    io.emit('blacklist-cleared');
    
    res.json({ message: `Deleted ${result.changes} blacklist entries` });
  } catch (error) {
    console.error('Error clearing blacklist:', error);
    res.status(500).json({ error: 'Failed to clear blacklist' });
  }
});

// ===========================================
// MOBILE API ENDPOINTS FOR FLUTTER APP
// ===========================================

// Mobile health check endpoint
app.get('/api/health', async (req, res) => {
  res.json({
    status: 'healthy',
    service: 'call-forwarding-main-server',
    port: PORT,
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Mobile sync endpoint - complete data sync
app.get('/api/sync', async (req, res) => {
  try {
    const contacts = await database.getAllContacts();
    const callLogs = await database.getCallLogs();
    const blacklist = await database.getAllBlacklistEntries();
    
    res.json({
      timestamp: Date.now(),
      contacts: contacts || [],
      blacklist: blacklist || [],
      callLogs: callLogs || [],
      stats: {
        totalContacts: contacts?.length || 0,
        recentCalls: callLogs?.length || 0,
        aiScreeningStatus: 'active'
      },
      currentCall: null,
      newCalls: [],
      callUpdates: []
    });
  } catch (error) {
    console.error('Error in mobile sync:', error);
    res.status(500).json({ error: 'Failed to sync data' });
  }
});

// Mobile updates endpoint - for polling
app.get('/api/updates', async (req, res) => {
  try {
    const since = parseInt(req.query.since) || 0;
    const now = Date.now();
    
    // For initial load, send all data
    if (since === 0) {
      const contacts = await database.getAllContacts();
      const callLogs = await database.getCallLogs();
      const blacklist = await database.getAllBlacklistEntries();
      
      res.json({
        timestamp: now,
        newCalls: [],
        callUpdates: [],
        contacts: contacts || [],
        blacklist: blacklist || [],
        callLogs: callLogs || [],
        stats: {
          totalContacts: contacts?.length || 0,
          recentCalls: callLogs?.length || 0,
          aiScreeningStatus: 'active'
        }
      });
    } else {
      // For subsequent polls, just return empty updates
      // Real-time updates come via Socket.IO events
      res.json({
        timestamp: now,
        newCalls: [],
        callUpdates: [],
        contacts: null,
        blacklist: null,
        callLogs: null,
        stats: {
          totalContacts: 0,
          recentCalls: 0,
          aiScreeningStatus: 'active'
        }
      });
    }
  } catch (error) {
    console.error('Error in mobile updates:', error);
    res.status(500).json({ error: 'Failed to get updates' });
  }
});

// Webhook endpoint for generating whisper message when call is forwarded
app.post('/generate-whisper', (req, res) => {
  try {
    const contactName = req.query.contactName || req.body.contactName;
    
    console.log(`Generating whisper for contact: ${contactName || 'unknown'}`);
    
    // Generate whisper TwiML
    const twiML = twiMLHelpers.generateWhisperTwiML(contactName);
    
    res.set('Content-Type', 'text/xml');
    res.send(twiML);
    
  } catch (error) {
    console.error('Error generating whisper:', error);
    
    // Fallback whisper
    const twiML = twiMLHelpers.generateWhisperTwiML();
    res.set('Content-Type', 'text/xml');
    res.send(twiML);
  }
});

// Webhook endpoint for generating whisper message for screened calls
app.post('/generate-screened-whisper', (req, res) => {
  try {
    const summary = req.query.summary || req.body.summary;
    
    console.log(`Generating screened whisper for: ${summary || 'unknown purpose'}`);
    
    // Generate screened whisper TwiML
    const twiML = twiMLHelpers.generateScreenedWhisperTwiML(summary);
    
    res.set('Content-Type', 'text/xml');
    res.send(twiML);
    
  } catch (error) {
    console.error('Error generating screened whisper:', error);
    
    // Fallback whisper
    const twiML = twiMLHelpers.generateScreenedWhisperTwiML();
    res.set('Content-Type', 'text/xml');
    res.send(twiML);
  }
});

// Webhook endpoint for handling call acceptance
app.post('/handle-call-acceptance', (req, res) => {
  try {
    const fromNumber = req.body.From;
    const digits = req.body.Digits;
    
    console.log(`Call acceptance response from ${fromNumber}: ${digits || 'no key pressed'}`);
    
    if (digits) {
      // Key was pressed - accept the call
      console.log('Call accepted by recipient');
      
      // Emit call acceptance event
      io.emit('call-accepted', {
        from: fromNumber,
        timestamp: new Date().toISOString()
      });
      
      // Generate acceptance TwiML (connects the call)
      const twiML = twiMLHelpers.generateCallAcceptanceTwiML();
      
      res.set('Content-Type', 'text/xml');
      res.send(twiML);
      
    } else {
      // No key pressed - reject the call
      console.log('Call not accepted by recipient');
      
      // Emit call rejection event
      io.emit('call-not-accepted', {
        from: fromNumber,
        timestamp: new Date().toISOString()
      });
      
      // Hang up
      const twiML = twiMLHelpers.generateRejectionTwiML();
      res.set('Content-Type', 'text/xml');
      res.send(twiML);
    }
    
  } catch (error) {
    console.error('Error handling call acceptance:', error);
    
    // Fallback - reject call
    const twiML = twiMLHelpers.generateRejectionTwiML();
    res.set('Content-Type', 'text/xml');
    res.send(twiML);
  }
});

// Webhook endpoint for handling dial status
app.post('/handle-dial-status', (req, res) => {
  try {
    const fromNumber = req.body.From;
    const dialStatus = req.body.DialStatus;
    const callDuration = req.body.CallDuration;
    
    console.log(`Dial completed from ${fromNumber}: status=${dialStatus}, duration=${callDuration}`);
    
    // Emit dial completion event
    io.emit('dial-completed', {
      from: fromNumber,
      status: dialStatus,
      duration: callDuration,
      timestamp: new Date().toISOString()
    });
    
    // Generate dial status TwiML
    const twiML = twiMLHelpers.generateDialStatusTwiML();
    
    res.set('Content-Type', 'text/xml');
    res.send(twiML);
    
  } catch (error) {
    console.error('Error handling dial status:', error);
    
    const twiML = twiMLHelpers.generateDialStatusTwiML();
    res.set('Content-Type', 'text/xml');
    res.send(twiML);
  }
});

// Webhook endpoint for handling TCPA compliance responses
app.post('/handle-tcpa-response', async (req, res) => {
  try {
    const fromNumber = req.body.From;
    const digits = req.body.Digits;
    const callSid = req.body.CallSid;
    
    console.log(`TCPA response from blacklisted number ${fromNumber}: ${digits || 'no response'}`);
    
    if (digits === '1') {
      // Transfer to removal line
      console.log('Blacklisted caller requested removal line transfer');
      
      // Emit TCPA removal request event
      io.emit('tcpa-removal-requested', {
        from: fromNumber,
        callSid: callSid,
        timestamp: new Date().toISOString()
      });
      
      // Log the removal request
      await database.logCall(fromNumber, 'TCPA Removal', 'Caller requested removal line transfer');
      
      // Generate removal line TwiML
      const twiML = twiMLHelpers.generateTCPARemovalTwiML();
      
      res.set('Content-Type', 'text/xml');
      res.send(twiML);
      
    } else {
      // No valid response - hang up
      console.log('No valid TCPA response from blacklisted caller');
      
      // Emit TCPA no response event
      io.emit('tcpa-no-response', {
        from: fromNumber,
        callSid: callSid,
        timestamp: new Date().toISOString()
      });
      
      // Hang up
      const twiML = twiMLHelpers.generateRejectionTwiML();
      res.set('Content-Type', 'text/xml');
      res.send(twiML);
    }
    
  } catch (error) {
    console.error('Error handling TCPA response:', error);
    
    // Fallback - hang up
    const twiML = twiMLHelpers.generateRejectionTwiML();
    res.set('Content-Type', 'text/xml');
    res.send(twiML);
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

// Download recording directly from Twilio for mobile app
app.get('/api/download-recording', async (req, res) => {
  try {
    const { url } = req.query;
    
    if (!url) {
      return res.status(400).json({ error: 'Recording URL is required' });
    }

    console.log(`Downloading recording from Twilio: ${url}`);
    
    // Convert JSON URL to WAV format if needed
    const audioUrl = url.replace('.json', '.wav');
    console.log(`Audio URL: ${audioUrl}`);

    // Use https module instead of fetch for better Twilio API compatibility
    const urlObj = new URL(audioUrl);
    const options = {
      hostname: urlObj.hostname,
      path: urlObj.pathname + urlObj.search,
      method: 'GET',
      headers: {
        'Authorization': `Basic ${Buffer.from(`${process.env.TWILIO_ACCOUNT_SID}:${process.env.TWILIO_AUTH_TOKEN}`).toString('base64')}`,
        'Accept': 'audio/wav,audio/mpeg,audio/*'
      }
    };

    const request = https.request(options, (response) => {
      if (response.statusCode !== 200) {
        console.error(`Twilio API error: ${response.statusCode}`);
        return res.status(response.statusCode).json({ error: `Twilio error: ${response.statusCode}` });
      }

      // Set headers for download
      res.setHeader('Content-Type', 'audio/wav');
      res.setHeader('Content-Disposition', 'attachment; filename="recording.wav"');
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Cache-Control', 'public, max-age=3600');
      
      // Stream the response directly to client
      response.pipe(res);
    });

    request.on('error', (error) => {
      console.error('HTTPS request error:', error);
      res.status(500).json({ error: 'Failed to download recording', details: error.message });
    });

    request.end();
    
  } catch (error) {
    console.error('Error downloading recording:', error);
    res.status(500).json({ error: 'Failed to download recording', details: error.message });
  }
});

// Serve dashboard
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start HTTP server
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Call forwarding HTTP app listening on 0.0.0.0:${PORT}`);
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