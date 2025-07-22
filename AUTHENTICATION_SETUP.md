# Authentication Setup Guide

## Overview
The Call Forwarding System now includes simple authentication to protect both the web dashboard and mobile app from unauthorized access.

## Default Credentials

### Web Dashboard Login
- **Username**: `michael5cents`
- **Password**: `CallForward2025!`

### Mobile App API Key
- **API Key**: Auto-generated on first startup (check server logs or `/api/auth-info` endpoint)

## Environment Variables
You can customize authentication credentials using environment variables:

```bash
# Web dashboard credentials
AUTH_USERNAME=your_username
AUTH_PASSWORD=your_secure_password

# API key for mobile app (optional - auto-generated if not provided)
API_KEY=your_custom_api_key

# Session security
SESSION_SECRET=your_session_secret_key
```

## How It Works

### Web Dashboard Protection
1. **Login Required**: All web dashboard pages require authentication
2. **Session Management**: 24-hour session cookies for persistent login
3. **Basic Auth Support**: Also supports HTTP Basic Authentication
4. **Bypass for Webhooks**: Twilio webhooks and health checks bypass authentication

### Mobile App Protection
1. **API Key Required**: Mobile app must provide valid API key in `X-API-Key` header
2. **Automatic Integration**: HttpService automatically includes API key in requests
3. **Settings Configuration**: API key configured in mobile app Settings screen

### Bypass Rules
These endpoints skip authentication (required for Twilio integration):
- `/voice` - Twilio voice webhooks
- `/handle-*` - All Twilio callback endpoints
- `/api/health` - Health check endpoint

## Setup Instructions

### 1. Web Dashboard Access
1. Navigate to your server URL (e.g., `http://calls.popzplace.com:3001`)
2. Enter username: `michael5cents`
3. Enter password: `CallForward2025!`
4. Click Login

### 2. Mobile App Setup
1. Open mobile app Settings
2. Enter your server URL
3. Get API key from server logs or visit `/api/auth-info` endpoint
4. Enter API key in the "API Key" field
5. Save settings

### 3. Get API Key
Visit `http://your-server-url/api/auth-info` in a browser to see current credentials:
```json
{
  "credentials": {
    "username": "michael5cents",
    "apiKey": "cf_1234567890abcdef..."
  },
  "message": "Use these credentials for mobile app configuration"
}
```

## Security Features

### Authentication Methods
- **Web**: Username/password with session management
- **Mobile**: API key authentication via headers
- **Combined**: Middleware automatically detects and handles both types

### Session Security
- **Secure Sessions**: Express-session with configurable secrets
- **24-hour Expiration**: Sessions automatically expire
- **HTTPS Ready**: Set `cookie.secure: true` for HTTPS deployments

### API Security
- **API Key Validation**: Cryptographically secure API key generation
- **Header-based Auth**: Standard `X-API-Key` header pattern
- **Bearer Token Support**: Also accepts `Authorization: Bearer <apikey>`

## Customization

### Change Default Credentials
1. **Environment Variables** (recommended):
   ```bash
   export AUTH_USERNAME=your_username
   export AUTH_PASSWORD=your_secure_password
   export API_KEY=your_custom_api_key
   ```

2. **Direct Code Modification**:
   Edit `auth.js` lines 6-10 to change hardcoded defaults

### Custom Session Settings
Edit `server.js` session configuration:
```javascript
app.use(session({
  secret: process.env.SESSION_SECRET || 'your-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: { 
    secure: true, // Set to true for HTTPS
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));
```

## Troubleshooting

### Web Dashboard Issues
- **401 Unauthorized**: Check username/password combination
- **Session Expired**: Login again (sessions last 24 hours)
- **Cookie Issues**: Clear browser cookies and try again

### Mobile App Issues
- **Authentication Required**: Verify API key is configured in Settings
- **Invalid API Key**: Get current API key from `/api/auth-info` endpoint
- **Connection Refused**: Check if authentication is interfering with other settings

### Common Solutions
1. **Reset Credentials**: Restart server to regenerate API key
2. **Check Logs**: Server logs show authentication attempts and failures
3. **Test Endpoint**: Use `/api/health` to test basic connectivity
4. **Clear Cache**: Clear browser/app cache if experiencing login issues

## API Key Management

### Generate New API Key
1. Stop the server
2. Remove or comment out `API_KEY` environment variable
3. Restart server (new key auto-generated)
4. Check server logs for new API key
5. Update mobile app settings with new key

### Secure API Key Storage
- **Environment Variables**: Best practice for production
- **Docker Secrets**: For containerized deployments
- **Key Management**: Rotate API keys regularly for security

## Production Deployment

### HTTPS Configuration
```javascript
// Set secure cookies for HTTPS
cookie: { 
  secure: true, // HTTPS only
  sameSite: 'strict', // CSRF protection
  maxAge: 24 * 60 * 60 * 1000
}
```

### Environment Security
```bash
# Production .env file
AUTH_USERNAME=secure_username
AUTH_PASSWORD=complex_password_123!
API_KEY=cf_secure_api_key_here
SESSION_SECRET=random_session_secret_key
```

### Rate Limiting (Optional)
Consider adding rate limiting middleware for additional security:
```bash
npm install express-rate-limit
```

## Integration Testing

### Test Web Authentication
```bash
# Test login endpoint
curl -X POST http://your-server/login \
  -d "username=michael5cents&password=CallForward2025!"

# Test protected endpoint
curl -H "Authorization: Basic bWljaGFlbDVjZW50czpDYWxsRm9yd2FyZDIwMjUh" \
  http://your-server/api/contacts
```

### Test Mobile API Authentication
```bash
# Test API key authentication
curl -H "X-API-Key: your_api_key" \
  http://your-server/api/contacts

# Test bearer token format
curl -H "Authorization: Bearer your_api_key" \
  http://your-server/api/contacts
```

## System Status
- ✅ Web dashboard protection active
- ✅ Mobile app API key authentication active
- ✅ Session management configured
- ✅ Twilio webhook bypass configured
- ✅ Health check bypass configured

**Your Call Forwarding System is now secured against unauthorized access while maintaining full functionality for legitimate users and Twilio integration.**