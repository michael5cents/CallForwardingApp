# New Feature Command - Call Forwarding App

Follow this process for implementing new features in the Call Forwarding App:

## 1. Context Gathering
- **Review CLAUDE.md**: Understand current architecture and patterns
- **Check existing code**: Look at similar implementations in codebase
- **Identify integration points**: Database, API endpoints, real-time updates
- **Consider authentication impact**: Web vs mobile access requirements

## 2. Requirements Analysis
- **Create PRP**: Use docs/PRPs/feature-name.md template
- **Define scope**: Core functionality vs nice-to-have features
- **Identify dependencies**: Twilio, Claude AI, database schema changes
- **Security considerations**: Authentication bypass rules, input validation

## 3. Implementation Planning
- **Database changes**: SQL migration scripts if needed
- **API endpoints**: RESTful design following existing patterns
- **Real-time updates**: Socket.io event planning
- **Frontend updates**: Dashboard UI changes
- **Mobile compatibility**: Ensure mobile app continues working

## 4. Development Process

### Backend Development
```javascript
// Follow established patterns
app.get('/api/new-endpoint', async (req, res) => {
  try {
    // Input validation
    // Database operations with prepared statements
    // Business logic
    // Real-time updates via Socket.io
    res.json(result);
  } catch (error) {
    console.error('Endpoint error:', error);
    res.status(500).json({ error: error.message });
  }
});
```

### Database Operations
```javascript
// Use prepared statements
const stmt = db.prepare('SELECT * FROM table WHERE column = ?');
const result = stmt.get(value);
```

### Real-time Updates
```javascript
// Emit Socket.io events for dashboard
io.emit('dataUpdate', { 
  type: 'feature',
  data: result 
});
```

## 5. Testing Strategy
- **Manual testing**: Use Twilio webhook tools for call flow testing
- **Database testing**: Verify data integrity and performance
- **Real-time testing**: Check Socket.io event propagation
- **Authentication testing**: Verify web protection, mobile bypass
- **Integration testing**: Complete end-to-end call flow

## 6. Documentation Updates
- **Update CLAUDE.md**: Add new feature to core features list
- **API documentation**: Document new endpoints
- **Database schema**: Update schema documentation if changed
- **Deployment notes**: Any configuration changes needed

## 7. Version Control
- **Feature branch**: Create if complex (optional for simple features)
- **Commit message**: Follow v2.x - Feature Name format
- **Version increment**: Update version references
- **Main branch**: Merge only working, tested features

## Common Patterns in Call Forwarding App

### Database Pattern
```javascript
// Initialize database connection
const db = require('./database');

// CRUD operations with error handling
async function createRecord(data) {
  try {
    const stmt = db.prepare('INSERT INTO table (columns) VALUES (?)');
    const result = stmt.run(data);
    return result.lastInsertRowid;
  } catch (error) {
    console.error('Database error:', error);
    throw error;
  }
}
```

### Authentication Pattern
```javascript
// Middleware considerations
if (req.path.startsWith('/api/')) {
  // Mobile endpoints bypass authentication
  return next();
}
// Web dashboard requires authentication
```

### TwiML Response Pattern
```javascript
// Twilio webhook responses
const twiml = new VoiceResponse();
twiml.say('Message to caller');
twiml.redirect('/next-step');
res.type('text/xml');
res.send(twiml.toString());
```

### AI Integration Pattern
```javascript
// Claude AI analysis
const analysis = await anthropic.messages.create({
  model: "claude-3-sonnet-20240229",
  max_tokens: 150,
  messages: [{ role: "user", content: prompt }]
});
```

## Validation Checklist
- [ ] Feature works with existing call flow
- [ ] Database operations are secure (prepared statements)
- [ ] Authentication bypass rules correct
- [ ] Real-time updates working
- [ ] Mobile app compatibility maintained
- [ ] Error handling comprehensive
- [ ] Logging appropriate for debugging
- [ ] Documentation updated
- [ ] No secrets exposed in code