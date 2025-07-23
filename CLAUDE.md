# CLAUDE.md - Call Forwarding App Project Context

## Global Context Framework Reference
**Context Engineering Framework Path**: `/home/michael5cents/Downloads/context-engineering-starter.sh`
**Implementation Date**: July 22, 2025

## Project Identity
- **Name**: Personal Call Forwarding App with AI Gatekeeper
- **Type**: Node.js web application with Progressive Web App capabilities
- **Primary Purpose**: Intelligent call screening and forwarding using Twilio and Claude AI
- **Target Platform**: Samsung Galaxy Z Fold 3 as PWA, Web Dashboard
- **Version**: v2.2 - Smart Authentication with Mobile Bypass
- **Port**: 3001 (for home server deployment)

## Technology Stack
- **Backend**: Node.js with Express.js
- **Database**: SQLite3 for contacts, call logs, and blacklist
- **AI Integration**: Anthropic Claude API for call analysis
- **Telephony**: Twilio for call handling and TwiML responses
- **Real-time**: Socket.io for live dashboard updates
- **Frontend**: Vanilla JavaScript with PWA enhancements
- **Authentication**: Smart bypass system (web protected, mobile open)
- **Service Worker**: Background sync and push notifications

## Architecture Overview
```
Incoming Call → Twilio → Webhook → Call Forwarding App → AI Analysis → Route Decision
                                        ↓
                               Live Dashboard (PWA)
                                        ↓
                            Samsung Galaxy Z Fold 3
```

## Context Engineering Implementation

### Hierarchical Classification
- **Core Call Logic**: DNA level (fundamental call routing algorithms)
- **TwiML Helpers**: Protein level (specific call response functions)
- **Database Operations**: Molecule level (data management components)
- **Real-time Dashboard**: Cell level (complete UI ecosystem)
- **PWA System**: Organ level (integrated mobile app experience)
- **Complete Solution**: Neural System level (AI-powered call management)

### Biological Metaphor Mapping
- **DNA (Core Logic)**: Call routing algorithms, AI analysis, security policies
- **Proteins (Functions)**: TwiML generators, API endpoints, socket handlers
- **Membranes (Interfaces)**: REST API, Socket.io events, Twilio webhooks
- **Organelles (Sub-components)**: Contact manager, blacklist system, call logger, AI analyzer

## Core Features (Current Implementation v2.2)
1. **AI-Powered Call Screening**: Claude AI analyzes unknown callers
2. **Contact Whitelisting**: Direct forwarding for known contacts
3. **Blacklist Management**: TCPA-compliant spam blocking
4. **Real-time Dashboard**: Live call monitoring with Socket.io
5. **Call Logging**: Complete history with AI summaries
6. **Voicemail Recording**: In-browser playback system
7. **PWA Capabilities**: Offline support and background notifications
8. **Smart Authentication**: Web dashboard protected, mobile app bypass
9. **Server Management**: Desktop controls and auto-startup service

## Authentication Architecture (v2.2)

### Smart Authentication Strategy
- **Web Dashboard**: Full login protection (michael5cents/5904)
- **Mobile Endpoints**: Authentication bypassed for usability
- **Twilio Webhooks**: Authentication bypassed (required for functionality)
- **Health Checks**: Authentication bypassed for monitoring

### Security Balance
```javascript
// Authentication bypass logic
if (req.path.startsWith('/voice') || 
    req.path.startsWith('/handle-') || 
    req.path === '/api/health' ||
    req.path.startsWith('/api/')) {
  return next(); // Bypass authentication
}
// Web dashboard requires login
```

## Code Standards & Patterns

### File Organization
```
call-forwarding-app/
├── CLAUDE.md (this file - project context)
├── server.js (main Express server)
├── auth.js (smart authentication system)
├── database.js (SQLite database management)
├── anthropic_helper.js (Claude AI integration)
├── twiML_helpers.js (TwiML response generators)
├── manage-server.sh (server management script)
├── public/
│   ├── index.html (PWA dashboard)
│   ├── app.js (frontend JavaScript with PWA)
│   ├── styles.css (responsive CSS)
│   ├── manifest.json (PWA manifest)
│   └── sw.js (service worker)
├── .claude/commands/ (workflow templates)
├── docs/PRPs/ (product requirements)
├── examples/ (code patterns)
└── templates/ (reusable templates)
```

### Coding Standards
- **ES6+ JavaScript**: Modern syntax and features
- **Async/Await**: For asynchronous operations
- **Error Handling**: Comprehensive try-catch blocks
- **Logging**: Detailed debug output for troubleshooting
- **Security**: Input validation, prepared statements, environment variables
- **Testing**: Manual testing via Twilio webhook tools

### API Endpoint Patterns
```javascript
// Standard API response format
app.get('/api/endpoint', async (req, res) => {
  try {
    const result = await operation();
    res.json(result);
  } catch (error) {
    console.error('Operation error:', error);
    res.status(500).json({ error: error.message });
  }
});
```

## Development Workflow

### New Feature Process
1. **Context Gathering**: Review CLAUDE.md and existing patterns
2. **PRP Creation**: Use template for complex features
3. **Implementation**: Follow established patterns
4. **Testing**: Manual testing with Twilio tools
5. **Documentation**: Update relevant docs
6. **Version Control**: Commit to main branch with version tag

### Debugging Process
1. **Log Analysis**: Check server logs and debug output
2. **Webhook Testing**: Use Twilio webhook tools
3. **Database Inspection**: Query SQLite directly if needed
4. **Real-time Monitoring**: Use dashboard and Socket.io events
5. **Error Reproduction**: Create minimal test cases

### Deployment Process
1. **Local Testing**: Verify all functionality works
2. **Server Restart**: Use desktop controls or management script
3. **Health Check**: Verify /api/health endpoint
4. **Integration Test**: Test complete call flow
5. **Documentation**: Update deployment logs

## Environment Configuration

### Required Environment Variables
```env
# Twilio Configuration
TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token  
TWILIO_PHONE_NUMBER=your_twilio_phone_number

# Anthropic Claude API
ANTHROPIC_API_KEY=your_anthropic_api_key

# Personal Configuration
MY_PERSONAL_NUMBER=your_personal_phone_number

# Server Configuration
PORT=3001
BASE_URL=https://your-domain.com

# Authentication (v2.2)
AUTH_USERNAME=michael5cents
AUTH_PASSWORD=5904
SESSION_SECRET=your_session_secret_key
```

## Database Schema

### Core Tables
```sql
-- Contacts (whitelist)
CREATE TABLE contacts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  phone_number TEXT NOT NULL UNIQUE,
  date_added DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Blacklist (spam protection)  
CREATE TABLE blacklist (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  phone_number TEXT NOT NULL UNIQUE,
  reason TEXT NOT NULL,
  pattern_type TEXT DEFAULT 'exact',
  date_added DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Call logs (complete history)
CREATE TABLE call_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  from_number TEXT NOT NULL,
  status TEXT NOT NULL,
  summary TEXT,
  recording_url TEXT,
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

## Call Flow Logic

### Decision Tree
1. **Incoming Call** → Check against contacts database
2. **Whitelisted Contact** → Direct forward with personalized message
3. **Unknown Caller** → AI screening with Claude analysis
4. **Blacklisted Number** → TCPA compliance message + hangup
5. **AI Analysis** → Route based on intent classification
6. **Voicemail** → Record and store with AI summary
7. **Dashboard Update** → Real-time notification via Socket.io

### AI Integration Points
```javascript
// Claude AI analysis pattern
const analysis = await anthropic.messages.create({
  model: "claude-3-sonnet-20240229",
  max_tokens: 150,
  messages: [{
    role: "user", 
    content: `Analyze this caller intent: "${transcript}"`
  }]
});
```

## Performance Expectations
- **Response Time**: <100ms for call routing decisions
- **Concurrent Calls**: Handles multiple simultaneous incoming calls
- **Memory Usage**: ~100-150MB typical, scales with call volume
- **Database Performance**: SQLite optimized for read-heavy workloads
- **Real-time Updates**: Sub-second Socket.io event propagation

## Security Considerations
- **HTTPS Required**: Twilio webhooks require secure connections
- **Input Validation**: Phone number formatting and sanitization
- **SQL Injection Protection**: Prepared statements for all queries
- **Environment Variables**: All secrets stored in .env
- **TCPA Compliance**: Legal protection for blacklist handling
- **Authentication Bypass**: Carefully configured for functionality

## Deployment Architecture

### Local Development
- **Platform**: Mac Mini 2012 i7 (16GB RAM, Catalina)
- **Process Manager**: PM2 or systemd service for auto-restart
- **Port**: 3001 with desktop management controls
- **Database**: SQLite file-based storage

### Production Deployment (DMZ/VPS)
- **VPS Required**: For external mobile app access
- **Domain**: calls.popzplace.com pointing to public IP
- **SSL Certificate**: Required for HTTPS Twilio webhooks
- **Firewall**: Ports 22 (SSH), 80 (HTTP), 443 (HTTPS), 3001 (App)
- **Reverse Proxy**: nginx routing from 80/443 to 3001

## Testing Strategy

### Manual Testing Checklist
- [ ] Incoming call routing (whitelist, screening, blacklist)
- [ ] AI analysis accuracy and response time
- [ ] Real-time dashboard updates
- [ ] PWA installation and functionality
- [ ] Mobile app compatibility
- [ ] Voicemail recording and playback
- [ ] Database operations (CRUD)
- [ ] Authentication system (web login, mobile bypass)

### Integration Testing
- [ ] Twilio webhook delivery and processing
- [ ] Claude API integration and error handling
- [ ] Socket.io real-time communication
- [ ] Database transaction consistency
- [ ] PWA service worker functionality

## AI Assistant Guidelines

### Context Awareness Rules
- Always reference this CLAUDE.md for project context
- Apply context engineering principles from starter script
- Maintain hierarchical thinking for feature complexity
- Use biological metaphors for system organization
- Follow established patterns and conventions

### Development Standards
- **Code Quality**: Modern JavaScript, comprehensive error handling
- **Security**: Never expose secrets, validate inputs, use prepared statements
- **Testing**: Manual verification of complete call flows
- **Documentation**: Self-documenting code with inline comments
- **Version Control**: Meaningful commits with version numbers

### Communication Protocol
- Use PRP templates for complex feature requests
- Reference examples directory for coding patterns
- Follow workflow commands for common tasks
- Update documentation with each significant change
- Maintain changelog for version tracking

## Success Metrics
- **Call Processing Speed**: Sub-100ms routing decisions
- **AI Accuracy**: >90% correct intent classification
- **System Uptime**: 99%+ availability
- **User Experience**: One-click PWA installation success
- **Mobile Compatibility**: All APK versions functional
- **Security**: Zero unauthorized access incidents

## Version History
- **v1.x**: Initial implementation without authentication
- **v2.0**: Added comprehensive feature set and PWA capabilities
- **v2.1**: Complete authentication system (broke mobile usability)
- **v2.2**: Smart authentication bypass (optimal balance)

## Context Engineering Integration
This project now follows context engineering principles for:
- **Comprehensive Context**: This CLAUDE.md provides complete project overview
- **Structured Communication**: PRP templates and workflow commands
- **Example-Driven Development**: Code patterns in examples directory
- **Validation Gates**: Testing checklists and quality assurance
- **Progressive Complexity**: From basic routing to AI-powered screening

**The Call Forwarding App is now optimized for AI assistant collaboration through context engineering principles while maintaining its core functionality as an intelligent call management system.**