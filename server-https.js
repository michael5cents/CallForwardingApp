require('dotenv').config();
const express = require('express');
const path = require('path');
const http = require('http');
const https = require('https');
const fs = require('fs');
const socketIo = require('socket.io');
const helmet = require('helmet'); // Security headers
const rateLimit = require('express-rate-limit'); // Rate limiting
const database = require('../server/database');
const twiMLHelpers = require('../server/twiML_helpers');
const anthropicHelper = require('../server/anthropic_helper');

const app = express();
const PORT = process.env.PORT || 3001;
const DOMAIN = process.env.DOMAIN || 'localhost';
const SSL_KEY_PATH = process.env.SSL_KEY_PATH || '/etc/letsencrypt/live/' + DOMAIN + '/privkey.pem';
const SSL_CERT_PATH = process.env.SSL_CERT_PATH || '/etc/letsencrypt/live/' + DOMAIN + '/fullchain.pem';

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "wss:", "ws:"],
    },
  },
}));

// Rate limiting - prevent API abuse
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(limiter);

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json({ limit: '10mb' }));
app.use(express.static('public'));

// Enhanced CORS middleware for mobile app access
app.use((req, res, next) => {
  const origin = req.headers.origin;
  const allowedOrigins = [
    `https://${DOMAIN}`,
    `https://www.${DOMAIN}`,
    'http://localhost:3001', // For local development
    'http://192.168.68.69:3001' // For local network access
  ];

  if (allowedOrigins.includes(origin)) {
    res.header('Access-Control-Allow-Origin', origin);
  } else {
    res.header('Access-Control-Allow-Origin', '*'); // Allow all for API access
  }
  
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, User-Agent, Accept');
  res.header('Access-Control-Allow-Credentials', 'true');
  
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});

// Force HTTPS redirect (except for Let's Encrypt verification)
app.use((req, res, next) => {
  // Allow HTTP for Let's Encrypt ACME challenge
  if (req.path.startsWith('/.well-known/acme-challenge/')) {
    return next();
  }
  
  // Allow HTTP for local development
  if (req.hostname === 'localhost' || req.hostname === '192.168.68.69') {
    return next();
  }
  
  // Force HTTPS for production
  if (!req.secure && req.headers['x-forwarded-proto'] !== 'https') {
    return res.redirect(301, `https://${req.headers.host}${req.url}`);
  }
  
  next();
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    domain: DOMAIN,
    secure: req.secure,
    protocol: req.protocol,
    uptime: process.uptime()
  });
});

// Initialize database on startup
database.initializeDatabase()
  .then(() => {
    console.log('Database initialized successfully');
  })
  .catch((err) => {
    console.error('Failed to initialize database:', err);
    process.exit(1);
  });

// Create servers (HTTP and HTTPS)
let server;
let io;

// Try to create HTTPS server if certificates exist
if (fs.existsSync(SSL_CERT_PATH) && fs.existsSync(SSL_KEY_PATH)) {
  console.log('SSL certificates found, starting HTTPS server...');
  
  const sslOptions = {
    key: fs.readFileSync(SSL_KEY_PATH),
    cert: fs.readFileSync(SSL_CERT_PATH)
  };
  
  // Create HTTPS server
  server = https.createServer(sslOptions, app);
  
  // Also create HTTP server for redirects
  const httpApp = express();
  httpApp.use((req, res) => {
    res.redirect(301, `https://${req.headers.host}${req.url}`);
  });
  
  const httpServer = http.createServer(httpApp);
  httpServer.listen(80, () => {
    console.log('HTTP redirect server running on port 80');
  });
  
  // HTTPS on port 443
  const httpsPort = 443;
  server.listen(httpsPort, () => {
    console.log(`🔒 HTTPS Server running on https://${DOMAIN}:${httpsPort}`);
  });
  
} else {
  console.log('SSL certificates not found, starting HTTP server...');
  console.log(`Expected certificate paths:`);
  console.log(`  Key: ${SSL_KEY_PATH}`);
  console.log(`  Cert: ${SSL_CERT_PATH}`);
  
  // Create HTTP server
  server = http.createServer(app);
  server.listen(PORT, () => {
    console.log(`🌐 HTTP Server running on http://${DOMAIN}:${PORT}`);
    console.log(`To enable HTTPS, install SSL certificates and restart server.`);
  });
}

// Socket.IO setup
io = socketIo(server, {
  cors: {
    origin: [`https://${DOMAIN}`, `https://www.${DOMAIN}`, 'http://localhost:3001', 'http://192.168.68.69:3001'],
    methods: ["GET", "POST"],
    credentials: true
  }
});

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('Dashboard connected via Socket.IO');
  
  // Send immediate test event to verify connection
  socket.emit('connection-test', {
    message: 'Connection established successfully',
    timestamp: new Date().toISOString(),
    secure: true
  });
  
  // Handle dashboard requests for app state
  socket.on('request-app-state', () => {
    database.getAppState()
      .then(state => {
        socket.emit('app-state', state);
      })
      .catch(err => {
        console.error('Error fetching app state:', err);
        socket.emit('error', { message: 'Failed to fetch app state' });
      });
  });
  
  socket.on('disconnect', () => {
    console.log('Dashboard disconnected');
  });
});

// Load existing routes
const webhookRoutes = require('../server/routes/webhooks');
const apiRoutes = require('../server/routes/api');

app.use('/', webhookRoutes);
app.use('/api', apiRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not found',
    message: 'The requested resource was not found'
  });
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

module.exports = { app, server, io };