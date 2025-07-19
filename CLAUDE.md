# CLAUDE.md - Call Forwarding App Project Context

## Global Context Framework Reference
**Context Engineering Framework Path**: `/home/nichols-ai/workspace/context-engineering-framework`
**Quick Access**: `~/cef` (symbolic link)
**Environment Variable**: `$CONTEXT_FRAMEWORK_PATH`

## Project Identity
- **Name**: Personal Call Forwarding App with AI Gatekeeper
- **Type**: Node.js web application with PWA capabilities
- **Primary Purpose**: Intelligent call screening and forwarding using Twilio and Claude AI
- **Target Platform**: Samsung Galaxy Z Fold 3 as PWA
- **Port**: 3001 (for home server deployment)

## Technology Stack
- **Backend**: Node.js with Express
- **Database**: SQLite3 for contacts, call logs, and blacklist
- **AI Integration**: Anthropic Claude API for call analysis
- **Telephony**: Twilio for call handling and TwiML
- **Real-time**: Socket.io for live dashboard updates
- **Frontend**: Vanilla JavaScript with PWA enhancements
- **Service Worker**: Background sync and push notifications

## Architecture Overview
```
Incoming Call → Twilio → Webhook → Call Forwarding App → AI Analysis → Route Decision
                                        ↓
                               Live Dashboard (PWA)
                                        ↓
                            Samsung Galaxy Z Fold 3
```

## Context Engineering Framework Application

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

## Core Features (Current Implementation)
1. **AI-Powered Call Screening**: Claude AI analyzes unknown callers
2. **Contact Whitelisting**: Direct forwarding for known contacts
3. **Blacklist Management**: TCPA-compliant spam blocking
4. **Real-time Dashboard**: Live call monitoring with Socket.io
5. **Call Logging**: Complete history with AI summaries
6. **Voicemail Recording**: In-browser playback system
7. **PWA Capabilities**: Offline support and background notifications

## PWA Implementation Details

### Samsung Galaxy Z Fold 3 Optimizations - ✅ SUCCESSFULLY DEPLOYED
- **Foldable Support**: Responsive design for folded/unfolded modes
- **Background Connectivity**: Service worker with Socket.io fallbacks
- **Push Notifications**: Real-time call alerts even when backgrounded
- **Battery Optimization**: Adaptive polling based on battery level
- **Screen Orientation**: Automatic layout adjustments for screen changes

### PWA Installation Success Log
**Date**: July 19, 2025
**Device**: Samsung Galaxy Z Fold 3
**Status**: ✅ INSTALLED AND ACTIVE

**Installation Process:**
1. **Issue Identified**: localhost:3001 doesn't support PWA installation (requires HTTPS)
2. **Solution Applied**: Used ngrok HTTPS URL: https://1dfc4aaa3e39.ngrok-free.app
3. **Missing Icons**: Generated all required PWA icon sizes (72x72 to 512x512)
4. **Manifest Fixed**: Added `id` field and optimized `display_override` for Samsung
5. **Installation Success**: PWA icon created on Samsung home screen

**Current Status:**
- ✅ PWA installed on Samsung Galaxy Z Fold 3 home screen
- ✅ Service worker active and registered
- ✅ Background monitoring enabled
- ✅ Real-time call notifications ready
- ✅ Offline functionality working
- ⏳ Testing background call monitoring in progress

### Service Worker Features
- **Background Sync**: Syncs call logs, contacts, and blacklist when offline
- **Push Notifications**: Critical call alerts with vibration patterns
- **Offline Support**: Cached data and graceful degradation
- **Update Management**: Automatic service worker updates

### Connectivity Strategy
- **Primary**: WebSocket via Socket.io for real-time updates
- **Fallback**: HTTP polling for mobile network limitations
- **Background**: Service worker sync for missed updates
- **Offline**: LocalStorage cache with automatic sync on reconnection

## API Endpoints

### Twilio Webhooks
- `POST /voice` - Main call entry point with intelligent routing
- `POST /handle-gather` - AI speech analysis and routing decision
- `POST /handle-recording` - Voicemail completion handler
- `POST /handle-dial-status` - Call completion status tracking

### Contact Management
- `GET /api/contacts` - List whitelisted contacts
- `POST /api/contacts` - Add new whitelisted contact
- `DELETE /api/contacts/:id` - Remove contact from whitelist

### Blacklist Management  
- `GET /api/blacklist` - List blacklisted numbers
- `POST /api/blacklist` - Add number to blacklist with TCPA compliance
- `DELETE /api/blacklist/:id` - Remove number from blacklist
- `DELETE /api/blacklist` - Clear entire blacklist

### Call Logs
- `GET /api/call-logs` - Retrieve call history with AI summaries
- `DELETE /api/call-logs/:id` - Delete specific call log
- `DELETE /api/call-logs` - Clear all call logs

### Recording Playback
- `GET /recording/:recordingSid` - Proxy for Twilio recordings (bypasses auth)

## Database Schema

### Contacts Table
```sql
CREATE TABLE contacts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  phone_number TEXT NOT NULL UNIQUE,
  date_added DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### Blacklist Table
```sql
CREATE TABLE blacklist (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  phone_number TEXT NOT NULL UNIQUE,
  reason TEXT NOT NULL,
  pattern_type TEXT DEFAULT 'exact',
  date_added DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### Call Logs Table
```sql
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

### Whitelisted Contacts
1. Incoming call checked against contacts database
2. Direct forwarding with personalized whisper message
3. Real-time dashboard update: "Whitelisted"

### Unknown Callers
1. AI greeting: "Hello. What can I help you with today?"
2. Speech-to-text capture and Claude AI analysis
3. Intelligent routing based on AI classification:
   - **Urgent/Sales**: Forward with AI summary whisper
   - **Support/Personal**: Send to voicemail for later review
   - **Spam**: Polite rejection and immediate hangup

### Blacklisted Numbers
1. TCPA compliance message with legal warning
2. Option to press 1 for Do Not Call removal line
3. Automatic call termination after compliance message

## AI Assistant Guidelines

### Context Awareness
- Always reference this CLAUDE.md for project context
- Apply Context Engineering Framework principles from `$CONTEXT_FRAMEWORK_PATH`
- Maintain hierarchical thinking for feature complexity
- Use biological metaphors for system organization

### Development Standards
- **Code Quality**: ES6+ JavaScript, error handling, meaningful names
- **Security**: Input validation, SQLite prepared statements, environment variables
- **Testing**: Manual testing via Twilio webhook tools and browser
- **Documentation**: Self-documenting code with inline comments

### PWA Best Practices
- **Performance**: Efficient caching strategies and minimal resource usage
- **Accessibility**: Mobile-first design with touch-friendly interfaces
- **Battery Life**: Adaptive background activity based on device state
- **Network**: Graceful handling of connection loss and recovery

## Environment Configuration
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
BASE_URL=https://your-ngrok-url.ngrok.io
```

## Deployment Context

### Home Server Integration
- **Target Server**: Mac Mini 2012 i7 (16GB RAM, Catalina)
- **Process Manager**: PM2 for automatic restart and monitoring
- **Reverse Proxy**: nginx routing from port 80/443 to 3001
- **External Access**: Tailscale VPN for secure remote connectivity

### Samsung Galaxy Z Fold 3 Access
- **Installation**: PWA install via Samsung Internet Browser
- **Connectivity**: Tailscale VPN or local network access
- **Notifications**: Native push notifications for call alerts
- **Background**: Continuous monitoring via service worker

## Security Considerations
- **HTTPS Required**: Twilio webhooks require secure connections
- **Input Validation**: Phone number formatting and sanitization
- **Rate Limiting**: Prevent API abuse (recommended for production)
- **Credential Management**: Environment variables for all secrets
- **TCPA Compliance**: Legal protection for blacklist handling

## Performance Expectations
- **Response Time**: <100ms for call routing decisions
- **Concurrent Calls**: Handles multiple simultaneous incoming calls
- **Memory Usage**: ~100-150MB typical, scales with call volume
- **Battery Impact**: Optimized for Samsung device battery life
- **Network Usage**: Minimal when cached, efficient real-time updates

## Validation Checkpoints

### Before Deployment Complete
1. **Call Routing**: All three paths (whitelist, screening, blacklist) functional
2. **PWA Installation**: Successfully installs on Samsung Galaxy Z Fold 3
3. **Background Notifications**: Receives call alerts when app is closed
4. **Data Persistence**: Contacts, blacklist, and logs survive app restart
5. **Network Resilience**: Graceful handling of connection loss/recovery

### Success Criteria
- Real-time call monitoring works in foreground and background
- PWA installs and functions properly on Samsung Galaxy Z Fold 3
- AI call screening accurately categorizes caller intent
- Blacklist provides TCPA-compliant spam protection
- System remains stable under normal call volume

## Project Structure
```
call-forwarding-app/
├── CLAUDE.md (this file)
├── PROJECT_PLANS.md (ongoing plans and features)
├── README.md (comprehensive setup guide)
├── server.js (main Express server)
├── database.js (SQLite database management)
├── anthropic_helper.js (Claude AI integration)
├── twiML_helpers.js (TwiML response generators)
├── public/
│   ├── index.html (PWA dashboard)
│   ├── app.js (frontend JavaScript with PWA enhancements)
│   ├── styles.css (responsive CSS)
│   ├── manifest.json (PWA manifest)
│   └── sw.js (service worker)
├── package.json (dependencies)
└── .env (environment configuration)
```

## Framework Integration Notes
- This project applies Context Engineering Framework principles
- Reference framework documentation at `$CONTEXT_FRAMEWORK_PATH` for methodology
- Use hierarchical progression for complex feature development
- Apply biological metaphors for system architecture decisions
- Maintain CLAUDE.md as central context document for all AI interactions