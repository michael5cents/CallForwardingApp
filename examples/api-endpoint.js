// Example API Endpoint Pattern for Call Forwarding App
// This demonstrates the established patterns for creating new API endpoints

const express = require('express');
const app = express();

// Example: Contact management endpoint
app.get('/api/contacts', async (req, res) => {
  try {
    // Input validation (if query parameters)
    const limit = parseInt(req.query.limit) || 100;
    const offset = parseInt(req.query.offset) || 0;
    
    // Validate input ranges
    if (limit > 1000) {
      return res.status(400).json({ error: 'Limit cannot exceed 1000' });
    }
    
    // Database query with prepared statements (security)
    const stmt = db.prepare(`
      SELECT id, name, phone_number, date_added 
      FROM contacts 
      ORDER BY name 
      LIMIT ? OFFSET ?
    `);
    const contacts = stmt.all(limit, offset);
    
    // Get total count for pagination
    const countStmt = db.prepare('SELECT COUNT(*) as count FROM contacts');
    const { count } = countStmt.get();
    
    // Prepare response data
    const result = {
      contacts,
      pagination: {
        total: count,
        limit,
        offset,
        hasMore: offset + limit < count
      }
    };
    
    // Emit real-time update to dashboard (if data changed)
    if (req.method !== 'GET') {
      io.emit('contactsUpdate', { 
        type: 'contacts',
        count: contacts.length,
        data: contacts 
      });
    }
    
    // Return JSON response
    res.json(result);
    
  } catch (error) {
    // Comprehensive error logging
    console.error('Get contacts error:', error, {
      timestamp: new Date().toISOString(),
      path: req.path,
      method: req.method,
      query: req.query
    });
    
    // User-friendly error response
    res.status(500).json({ 
      error: 'Internal server error',
      message: process.env.NODE_ENV === 'development' ? error.message : 'Contact support'
    });
  }
});

// Example: Create new contact endpoint
app.post('/api/contacts', async (req, res) => {
  try {
    // Input validation
    const { name, phone_number } = req.body;
    
    if (!name || !phone_number) {
      return res.status(400).json({ 
        error: 'Missing required fields',
        required: ['name', 'phone_number']
      });
    }
    
    // Sanitize phone number (basic example)
    const cleanPhone = phone_number.replace(/[^\d+]/g, '');
    if (cleanPhone.length < 10) {
      return res.status(400).json({ 
        error: 'Invalid phone number format' 
      });
    }
    
    // Check for duplicate
    const existingStmt = db.prepare('SELECT id FROM contacts WHERE phone_number = ?');
    const existing = existingStmt.get(cleanPhone);
    
    if (existing) {
      return res.status(409).json({ 
        error: 'Contact already exists',
        conflictId: existing.id 
      });
    }
    
    // Insert new contact
    const insertStmt = db.prepare(`
      INSERT INTO contacts (name, phone_number) 
      VALUES (?, ?)
    `);
    const result = insertStmt.run(name.trim(), cleanPhone);
    
    // Get the created contact
    const newContact = {
      id: result.lastInsertRowid,
      name: name.trim(),
      phone_number: cleanPhone,
      date_added: new Date().toISOString()
    };
    
    // Emit real-time update to dashboard
    io.emit('contactsUpdate', {
      type: 'contact_added',
      data: newContact
    });
    
    // Update stats
    const countStmt = db.prepare('SELECT COUNT(*) as count FROM contacts');
    const { count } = countStmt.get();
    
    io.emit('statsUpdate', {
      totalContacts: count
    });
    
    // Return created contact
    res.status(201).json({
      success: true,
      contact: newContact
    });
    
  } catch (error) {
    console.error('Create contact error:', error, {
      timestamp: new Date().toISOString(),
      body: req.body
    });
    
    // Handle specific database errors
    if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      return res.status(409).json({ 
        error: 'Contact with this phone number already exists' 
      });
    }
    
    res.status(500).json({ 
      error: 'Failed to create contact',
      message: process.env.NODE_ENV === 'development' ? error.message : 'Contact support'
    });
  }
});

// Example: Delete contact endpoint
app.delete('/api/contacts/:id', async (req, res) => {
  try {
    const contactId = parseInt(req.params.id);
    
    if (isNaN(contactId)) {
      return res.status(400).json({ 
        error: 'Invalid contact ID' 
      });
    }
    
    // Check if contact exists
    const existingStmt = db.prepare('SELECT * FROM contacts WHERE id = ?');
    const contact = existingStmt.get(contactId);
    
    if (!contact) {
      return res.status(404).json({ 
        error: 'Contact not found' 
      });
    }
    
    // Delete contact
    const deleteStmt = db.prepare('DELETE FROM contacts WHERE id = ?');
    const result = deleteStmt.run(contactId);
    
    if (result.changes === 0) {
      return res.status(404).json({ 
        error: 'Contact not found' 
      });
    }
    
    // Emit real-time update
    io.emit('contactsUpdate', {
      type: 'contact_deleted',
      data: { id: contactId, ...contact }
    });
    
    // Update stats
    const countStmt = db.prepare('SELECT COUNT(*) as count FROM contacts');
    const { count } = countStmt.get();
    
    io.emit('statsUpdate', {
      totalContacts: count
    });
    
    res.json({
      success: true,
      message: 'Contact deleted successfully',
      deletedContact: contact
    });
    
  } catch (error) {
    console.error('Delete contact error:', error, {
      timestamp: new Date().toISOString(),
      contactId: req.params.id
    });
    
    res.status(500).json({ 
      error: 'Failed to delete contact',
      message: process.env.NODE_ENV === 'development' ? error.message : 'Contact support'
    });
  }
});

// Example: Twilio webhook endpoint pattern
app.post('/voice', (req, res) => {
  try {
    const fromNumber = req.body.From;
    const toNumber = req.body.To;
    
    console.log(`Incoming call from ${fromNumber} to ${toNumber}`);
    
    // Create TwiML response
    const twiml = new VoiceResponse();
    
    // Check whitelist first
    const contactStmt = db.prepare('SELECT * FROM contacts WHERE phone_number = ?');
    const contact = contactStmt.get(fromNumber);
    
    if (contact) {
      // Whitelisted contact - direct forward
      twiml.say(`Connecting call from ${contact.name}`);
      twiml.dial(process.env.MY_PERSONAL_NUMBER);
      
      // Log whitelisted call
      const logStmt = db.prepare(`
        INSERT INTO call_logs (from_number, status, summary) 
        VALUES (?, ?, ?)
      `);
      logStmt.run(fromNumber, 'Whitelisted', `Direct call from ${contact.name}`);
      
      // Real-time update
      io.emit('callUpdate', {
        type: 'whitelisted',
        from: fromNumber,
        contact: contact.name,
        timestamp: new Date().toISOString()
      });
      
    } else {
      // Unknown caller - start AI screening
      twiml.say('Hello. What can I help you with today?');
      twiml.record({
        timeout: 10,
        transcribe: true,
        action: '/handle-gather'
      });
      
      // Log screening start
      const logStmt = db.prepare(`
        INSERT INTO call_logs (from_number, status, summary) 
        VALUES (?, ?, ?)
      `);
      logStmt.run(fromNumber, 'Screening', 'AI gatekeeper engaged');
      
      // Real-time update
      io.emit('callUpdate', {
        type: 'screening',
        from: fromNumber,
        timestamp: new Date().toISOString()
      });
    }
    
    // Return TwiML response
    res.type('text/xml');
    res.send(twiml.toString());
    
  } catch (error) {
    console.error('Voice webhook error:', error, {
      timestamp: new Date().toISOString(),
      body: req.body
    });
    
    // Fallback TwiML
    const twiml = new VoiceResponse();
    twiml.say('System temporarily unavailable. Please try again later.');
    twiml.hangup();
    
    res.type('text/xml');
    res.send(twiml.toString());
  }
});

module.exports = app;