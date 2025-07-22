// Simple authentication middleware for Call Forwarding System
const crypto = require('crypto');

class AuthService {
  constructor() {
    // Simple hardcoded credentials (can be moved to environment variables)
    this.validCredentials = {
      username: process.env.AUTH_USERNAME || 'michael5cents',
      password: process.env.AUTH_PASSWORD || '5904',
      apiKey: process.env.API_KEY || this.generateApiKey()
    };
  }

  generateApiKey() {
    return 'cf_' + crypto.randomBytes(32).toString('hex');
  }

  // Verify username/password for web dashboard
  verifyWebCredentials(username, password) {
    return username === this.validCredentials.username && 
           password === this.validCredentials.password;
  }

  // Verify API key for mobile app
  verifyApiKey(apiKey) {
    return apiKey === this.validCredentials.apiKey;
  }

  // Generate session token
  generateSessionToken() {
    return crypto.randomBytes(32).toString('hex');
  }

  // Middleware for web dashboard protection
  requireWebAuth(req, res, next) {
    // Skip auth for Twilio webhooks and health checks
    if (req.path.startsWith('/voice') || 
        req.path.startsWith('/handle-') || 
        req.path === '/api/health') {
      return next();
    }

    // Check if user has valid session
    const sessionToken = req.session?.token;
    if (sessionToken && req.session?.authenticated) {
      return next();
    }

    // Check for basic auth
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Basic ')) {
      const credentials = Buffer.from(authHeader.slice(6), 'base64').toString();
      const [username, password] = credentials.split(':');
      
      if (this.verifyWebCredentials(username, password)) {
        req.session = { authenticated: true, token: this.generateSessionToken() };
        return next();
      }
    }

    // Return 401 for API requests
    if (req.path.startsWith('/api/')) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Return login page for web requests
    res.status(401).send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Call Forwarding System - Login</title>
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
          .error { color: #e74c3c; margin-top: 1rem; text-align: center; }
        </style>
      </head>
      <body>
        <div class="login-container">
          <h1>🔒 Call Forwarding System</h1>
          <form method="POST" action="/login">
            <div class="form-group">
              <label for="username">Username:</label>
              <input type="text" id="username" name="username" required>
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

  // Middleware for mobile API protection
  requireApiAuth(req, res, next) {
    // Skip auth for Twilio webhooks and health checks
    if (req.path.startsWith('/voice') || 
        req.path.startsWith('/handle-') || 
        req.path === '/api/health') {
      return next();
    }

    const apiKey = req.headers['x-api-key'] || req.headers['authorization']?.replace('Bearer ', '');
    
    if (!apiKey || !this.verifyApiKey(apiKey)) {
      return res.status(401).json({ 
        error: 'Invalid API key', 
        message: 'Please provide a valid API key in X-API-Key header' 
      });
    }

    next();
  }

  // Combined middleware that handles both web and mobile
  requireAuth(req, res, next) {
    // Skip auth for Twilio webhooks and health checks
    if (req.path.startsWith('/voice') || 
        req.path.startsWith('/handle-') || 
        req.path === '/api/health') {
      return next();
    }

    // Check for API key first (mobile app)
    const apiKey = req.headers['x-api-key'] || req.headers['authorization']?.replace('Bearer ', '');
    if (apiKey) {
      if (this.verifyApiKey(apiKey)) {
        req.authType = 'api';
        return next();
      } else {
        return res.status(401).json({ error: 'Invalid API key' });
      }
    }

    // Fall back to web authentication
    return this.requireWebAuth(req, res, next);
  }

  getCredentials() {
    return {
      username: this.validCredentials.username,
      apiKey: this.validCredentials.apiKey
    };
  }
}

module.exports = new AuthService();