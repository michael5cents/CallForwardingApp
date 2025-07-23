# Debug Issue Command - Call Forwarding App

Systematic approach to debugging issues in the Call Forwarding system:

## 1. Problem Analysis

### Issue Classification
- **Call Flow Issues**: Routing, AI analysis, TwiML responses
- **Database Issues**: Data corruption, query performance, connection errors
- **Authentication Issues**: Login failures, mobile app access
- **Real-time Issues**: Socket.io disconnections, dashboard updates
- **PWA Issues**: Installation, service worker, offline functionality

### Data Collection
```bash
# Server logs
tail -f startup.log
# Or check console output

# Database inspection
sqlite3 call_forwarding.db
.tables
.schema table_name
SELECT * FROM table_name WHERE condition;

# Process status
ps aux | grep "node server.js"

# Port status
netstat -tulpn | grep :3001
```

## 2. Context Investigation

### Recent Changes Review
- Check git log for recent commits
- Review CLAUDE.md for architectural changes
- Identify configuration changes (.env, database schema)

### Component Analysis
```javascript
// Add debug logging
console.log('Debug point:', variable);
console.error('Error context:', error, {
  timestamp: new Date().toISOString(),
  context: relevantData
});
```

### Authentication Flow Check
```bash
# Test web authentication
curl -I http://calls.popzplace.com:3001/

# Test mobile API bypass
wget -q -O- http://calls.popzplace.com:3001/api/health

# Test protected endpoint
curl -u michael5cents:5904 http://calls.popzplace.com:3001/
```

## 3. Common Issue Patterns

### Call Flow Debugging
```javascript
// Add to webhook handlers
console.log('Incoming call from:', req.body.From);
console.log('TwiML response:', twiml.toString());

// Database query debugging
console.log('Contact lookup result:', contactResult);
console.log('Blacklist check:', blacklistResult);
```

### Database Issues
```sql
-- Check data integrity
SELECT COUNT(*) FROM contacts;
SELECT COUNT(*) FROM call_logs;
SELECT COUNT(*) FROM blacklist;

-- Check for duplicates
SELECT phone_number, COUNT(*) FROM contacts GROUP BY phone_number HAVING COUNT(*) > 1;

-- Check recent activity
SELECT * FROM call_logs ORDER BY timestamp DESC LIMIT 10;
```

### Authentication Debugging
```javascript
// Add to auth.js
console.log('Auth check for path:', req.path);
console.log('Bypass rule triggered:', req.path.startsWith('/api/'));
console.log('Session data:', req.session);
```

### Real-time Debugging
```javascript
// Socket.io connection debugging
io.on('connection', (socket) => {
  console.log('Dashboard connected:', socket.id);
  
  socket.on('disconnect', () => {
    console.log('Dashboard disconnected:', socket.id);
  });
});

// Event emission debugging
console.log('Emitting update:', updateData);
io.emit('callUpdate', updateData);
```

## 4. Solution Development

### Issue Resolution Steps
1. **Isolate the problem**: Minimal reproduction case
2. **Identify root cause**: Follow the data flow
3. **Implement fix**: Following established patterns
4. **Add preventive measures**: Better error handling, validation

### Testing Fix
```bash
# Restart server
pkill -f "node server.js"
npm start

# Test specific functionality
# Make test call if call flow issue
# Check dashboard if real-time issue
# Test login if authentication issue
```

## 5. Common Solutions

### Server Won't Start
```bash
# Check port usage
sudo lsof -i :3001
pkill -f "node server.js"

# Check environment variables
cat .env
echo $NODE_ENV

# Check dependencies
npm install
```

### Database Errors
```bash
# Backup database
cp call_forwarding.db call_forwarding.db.backup

# Check database integrity
sqlite3 call_forwarding.db "PRAGMA integrity_check;"

# Reset if corrupted
rm call_forwarding.db
# Restart server (will recreate tables)
```

### Authentication Issues
```javascript
// Reset session
app.use(session({
  // Add rolling: true for session refresh
  rolling: true,
  // Clear existing sessions
  secret: 'new-secret-key'
}));
```

### PWA Issues
```javascript
// Update service worker version
const CACHE_VERSION = 'v2.2.1'; // Increment version

// Clear browser cache
// In browser console:
// caches.keys().then(names => names.forEach(name => caches.delete(name)))
```

## 6. Prevention Strategies

### Enhanced Logging
```javascript
// Structured logging
const log = {
  info: (msg, data) => console.log(`[INFO] ${new Date().toISOString()} ${msg}`, data),
  error: (msg, error) => console.error(`[ERROR] ${new Date().toISOString()} ${msg}`, error),
  debug: (msg, data) => console.log(`[DEBUG] ${new Date().toISOString()} ${msg}`, data)
};
```

### Health Monitoring
```javascript
// Expand health check
app.get('/api/health', async (req, res) => {
  try {
    // Test database
    const dbTest = db.prepare('SELECT 1').get();
    
    // Test Twilio (if needed)
    // Test Claude API (if needed)
    
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      database: 'connected',
      version: 'v2.2'
    });
  } catch (error) {
    res.status(500).json({
      status: 'unhealthy',
      error: error.message
    });
  }
});
```

### Error Boundaries
```javascript
// Global error handler
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  // Log to file or external service
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});
```

## 7. Documentation
- Update troubleshooting section in CLAUDE.md
- Document solution in docs/troubleshooting/
- Add prevention measures to prevent recurrence
- Update monitoring and health checks if needed

## Emergency Contacts
- **Server Management**: Use desktop controls or manage-server.sh
- **Database Backup**: Located in project root as .db.backup files
- **Configuration**: Check .env file and environment variables
- **Process Recovery**: systemd service or PM2 restart available