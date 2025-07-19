# Personal Call Forwarding App with AI Gatekeeper

A sophisticated Node.js application that intelligently handles incoming calls using Twilio and Claude AI. Known contacts get forwarded directly, while unknown callers are screened by an AI assistant that analyzes their purpose and routes calls accordingly.

## Features

- **🤖 AI-Powered Call Screening**: Uses Claude AI to analyze unknown callers and intelligently route calls
- **👥 Contact Whitelisting**: Direct forwarding for known contacts without screening
- **📞 Flexible Call Routing**: Different handling based on call purpose (Urgent/Sales/Support/Personal/Spam)
- **📊 Real-time Dashboard**: Live call monitoring with Socket.io for instant status updates
- **📋 Call Logging**: Complete history with AI-generated summaries and voicemail recordings
- **🎵 Voicemail Playback**: In-browser audio playback with authentication bypass
- **🗑️ Log Management**: Delete individual call logs or clear all history
- **🔒 Secure Configuration**: Environment-based credential management

## Architecture

### Core Components

- **server.js**: Main Express server handling Twilio webhooks and API endpoints
- **database.js**: SQLite database management for contacts and call logs
- **anthropic_helper.js**: Claude AI integration for call analysis
- **twiML_helpers.js**: TwiML generation utilities for different call scenarios
- **public/**: Web dashboard for contact management and call monitoring

### Call Flow

1. **Incoming Call** → Twilio webhook to `/voice`
2. **Contact Check** → Query database for whitelisted numbers
3. **Path A (Known Contact)** → Direct forwarding with personalized whisper
4. **Path B (Unknown Contact)** → AI gatekeeper engagement
5. **Speech Analysis** → Claude AI analyzes caller intent
6. **Intelligent Routing** → Route based on AI classification

## Prerequisites

- Node.js 18+ and npm
- Twilio account with phone number
- Anthropic Claude API key
- ngrok for local development

## Installation

1. **Clone or download the project**
   ```bash
   cd call-forwarding-app
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Configuration**
   ```bash
   cp .env.example .env
   ```

4. **Configure your `.env` file**
   ```env
   # Twilio Configuration
   TWILIO_ACCOUNT_SID=your_twilio_account_sid_here
   TWILIO_AUTH_TOKEN=your_twilio_auth_token_here
   TWILIO_PHONE_NUMBER=your_twilio_phone_number_here

   # Anthropic Claude API Configuration
   ANTHROPIC_API_KEY=your_anthropic_api_key_here

   # Personal Phone Number (where calls should be forwarded)
   MY_PERSONAL_NUMBER=your_personal_phone_number_here

   # Server Configuration
   PORT=3000
   BASE_URL=https://your-ngrok-url.ngrok.io
   ```

## Setup Instructions

### 1. Twilio Setup

1. **Create Twilio Account**: Sign up at [twilio.com](https://twilio.com)
2. **Purchase Phone Number**: Buy a phone number in the Twilio Console
3. **Get Credentials**: Note your Account SID and Auth Token from the dashboard
4. **Configure Webhook**: Set your phone number's webhook URL to `https://your-ngrok-url.ngrok.io/voice`

### 2. Anthropic API Setup

1. **Create Account**: Sign up at [console.anthropic.com](https://console.anthropic.com)
2. **Generate API Key**: Create a new API key in the dashboard
3. **Add to Environment**: Set `ANTHROPIC_API_KEY` in your `.env` file

### 3. Local Development

1. **Install ngrok**: Download from [ngrok.com](https://ngrok.com)
2. **Start the application**:
   ```bash
   npm start
   ```
3. **Expose with ngrok** (in another terminal):
   ```bash
   ngrok http 3000
   ```
4. **Update BASE_URL**: Copy the ngrok URL to your `.env` file
5. **Configure Twilio**: Set the webhook URL in your Twilio phone number settings

## Usage

### Web Dashboard

Access the dashboard at `http://localhost:3001` to:

- **Live Call Monitoring**: Real-time status updates as calls are processed
- **Manage Contacts**: Add/remove whitelisted contacts for direct forwarding
- **View Call Logs**: Monitor all incoming calls with AI analysis and play voicemail recordings
- **Log Management**: Delete individual logs or clear entire call history
- **System Status**: Check contact count, recent calls, and AI screening status

### Call Routing Logic

**Whitelisted Contacts**:
- Direct forwarding with personalized whisper
- Status: "Whitelisted"

**Unknown Callers**:
- AI greeting: "Hello, you have reached the virtual assistant..."
- Speech-to-text analysis via Claude AI
- Routing based on AI classification:
  - **Urgent/Sales**: Forward with screened whisper
  - **Support/Personal**: Send to voicemail
  - **Spam**: Polite rejection and hangup

## API Endpoints

### Twilio Webhooks
- `POST /voice` - Main call entry point
- `POST /handle-gather` - Process AI screening results
- `POST /handle-recording` - Handle voicemail completion

### Contact Management
- `GET /api/contacts` - List all contacts
- `POST /api/contacts` - Add new contact
- `DELETE /api/contacts/:id` - Remove contact

### Call Logs
- `GET /api/call-logs` - Retrieve call history
- `DELETE /api/call-logs/:id` - Delete specific call log
- `DELETE /api/call-logs` - Clear all call logs

### Recording Playback
- `GET /recording/:recordingSid` - Proxy endpoint for Twilio recordings (bypasses authentication)

## Database Schema

### Contacts Table
```sql
CREATE TABLE contacts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  phone_number TEXT NOT NULL UNIQUE
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

## Security Considerations

- All credentials stored in environment variables
- Input validation for phone numbers and contact data
- SQLite database with prepared statements
- Rate limiting recommended for production
- HTTPS required for Twilio webhooks

## Troubleshooting

### Common Issues

1. **Webhook Not Receiving Calls**
   - Check ngrok is running and URL is correct
   - Verify Twilio phone number webhook configuration
   - Ensure server is running on correct port

2. **AI Analysis Failing**
   - Verify Anthropic API key is valid
   - Check API quota and usage limits
   - Review server logs for specific errors

3. **Call Forwarding Not Working**
   - Confirm `MY_PERSONAL_NUMBER` format (e.g., +1234567890)
   - Check Twilio account balance
   - Verify phone number capabilities

### Development Tips

- Use `npm run dev` with nodemon for auto-restart
- Check browser console for frontend errors
- Monitor server logs for webhook debugging
- Test with Twilio's webhook testing tools

## Production Deployment

For production deployment:

1. **Environment**: Set `NODE_ENV=production`
2. **Database**: Consider PostgreSQL for better performance
3. **Security**: Implement rate limiting and request validation
4. **Monitoring**: Add logging and error tracking
5. **Scaling**: Use PM2 or similar for process management

## License

MIT License - feel free to modify and distribute as needed.

## PWA Installation Success ✅

**Deployed Successfully**: Samsung Galaxy Z Fold 3 (July 19, 2025)

### Key Installation Notes:
- **HTTPS Required**: PWA installation only works over HTTPS, not localhost
- **Ngrok URL**: Use `https://1dfc4aaa3e39.ngrok-free.app` for installation
- **Samsung Internet**: Better PWA support than Chrome on Samsung devices
- **Background Monitoring**: Continues running after installation for real-time call alerts

### Next Steps:
See `PROJECT_PLANS.md` for planned home server deployment and feature enhancements.

## Support

For issues or questions, please check the troubleshooting section or review the server logs for specific error messages.