const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Database file path
const dbPath = path.join(__dirname, 'call_forwarding.db');

// Initialize database connection
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database:', err.message);
  } else {
    console.log('Connected to SQLite database.');
  }
});

// Initialize database tables
const initializeDatabase = () => {
  return new Promise((resolve, reject) => {
    // Create contacts table
    db.run(`
      CREATE TABLE IF NOT EXISTS contacts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        phone_number TEXT NOT NULL UNIQUE
      )
    `, (err) => {
      if (err) {
        console.error('Error creating contacts table:', err.message);
        reject(err);
        return;
      }
      console.log('Contacts table ready.');
      
      // Create call_logs table
      db.run(`
        CREATE TABLE IF NOT EXISTS call_logs (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          from_number TEXT NOT NULL,
          status TEXT NOT NULL,
          summary TEXT,
          recording_url TEXT,
          timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `, (err) => {
        if (err) {
          console.error('Error creating call_logs table:', err.message);
          reject(err);
          return;
        }
        console.log('Call logs table ready.');
        
        // Create blacklist table
        db.run(`
          CREATE TABLE IF NOT EXISTS blacklist (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            phone_number TEXT NOT NULL UNIQUE,
            reason TEXT,
            date_added DATETIME DEFAULT CURRENT_TIMESTAMP,
            pattern_type TEXT DEFAULT 'exact'
          )
        `, (err) => {
          if (err) {
            console.error('Error creating blacklist table:', err.message);
            reject(err);
            return;
          }
          console.log('Blacklist table ready.');
          
          // Add recording_url column if it doesn't exist (for existing databases)
          db.run('ALTER TABLE call_logs ADD COLUMN recording_url TEXT', (err) => {
            if (err && !err.message.includes('duplicate column name')) {
              console.error('Error adding recording_url column:', err.message);
            } else {
              console.log('Recording URL column ready.');
            }
            resolve();
          });
        });
      });
    });
  });
};

// Contact management functions
const addContact = (name, phoneNumber) => {
  return new Promise((resolve, reject) => {
    const stmt = db.prepare('INSERT INTO contacts (name, phone_number) VALUES (?, ?)');
    stmt.run([name, phoneNumber], function(err) {
      if (err) {
        reject(err);
      } else {
        resolve({ id: this.lastID, name, phone_number: phoneNumber });
      }
    });
    stmt.finalize();
  });
};

// Helper function to normalize phone numbers for comparison
const normalizePhoneNumber = (phoneNumber) => {
  if (!phoneNumber) return '';
  // Remove all non-digit characters and ensure it starts with +1 for US numbers
  const digits = phoneNumber.replace(/\D/g, '');
  if (digits.length === 10) {
    return `+1${digits}`;
  } else if (digits.length === 11 && digits.startsWith('1')) {
    return `+${digits}`;
  }
  return `+${digits}`;
};

const getContactByPhoneNumber = (phoneNumber) => {
  return new Promise((resolve, reject) => {
    const normalizedIncoming = normalizePhoneNumber(phoneNumber);
    
    // Get all contacts and check normalized versions
    db.all('SELECT * FROM contacts', (err, rows) => {
      if (err) {
        reject(err);
      } else {
        const match = rows.find(contact => {
          const normalizedStored = normalizePhoneNumber(contact.phone_number);
          return normalizedStored === normalizedIncoming;
        });
        resolve(match || null);
      }
    });
  });
};

const getAllContacts = () => {
  return new Promise((resolve, reject) => {
    db.all('SELECT * FROM contacts ORDER BY name', (err, rows) => {
      if (err) {
        reject(err);
      } else {
        resolve(rows);
      }
    });
  });
};

const deleteContact = (id) => {
  return new Promise((resolve, reject) => {
    db.run('DELETE FROM contacts WHERE id = ?', [id], function(err) {
      if (err) {
        reject(err);
      } else {
        resolve({ changes: this.changes });
      }
    });
  });
};

// Call logging functions
const logCall = (fromNumber, status, summary = null) => {
  return new Promise((resolve, reject) => {
    const stmt = db.prepare('INSERT INTO call_logs (from_number, status, summary) VALUES (?, ?, ?)');
    stmt.run([fromNumber, status, summary], function(err) {
      if (err) {
        reject(err);
      } else {
        resolve({ id: this.lastID, from_number: fromNumber, status, summary });
      }
    });
    stmt.finalize();
  });
};

const getCallLogs = (limit = 50) => {
  return new Promise((resolve, reject) => {
    db.all('SELECT * FROM call_logs ORDER BY timestamp DESC LIMIT ?', [limit], (err, rows) => {
      if (err) {
        reject(err);
      } else {
        resolve(rows);
      }
    });
  });
};

const deleteCallLog = (id) => {
  return new Promise((resolve, reject) => {
    db.run('DELETE FROM call_logs WHERE id = ?', [id], function(err) {
      if (err) {
        reject(err);
      } else {
        resolve({ changes: this.changes });
      }
    });
  });
};

const clearAllCallLogs = () => {
  return new Promise((resolve, reject) => {
    db.run('DELETE FROM call_logs', function(err) {
      if (err) {
        reject(err);
      } else {
        resolve({ changes: this.changes });
      }
    });
  });
};

const updateCallLogWithRecording = (fromNumber, recordingUrl) => {
  return new Promise((resolve, reject) => {
    // SQLite doesn't support ORDER BY in UPDATE, so we need to use a subquery
    db.run(`UPDATE call_logs SET recording_url = ? 
            WHERE id = (
              SELECT id FROM call_logs 
              WHERE from_number = ? AND status = "Voicemail" 
              ORDER BY timestamp DESC LIMIT 1
            )`, 
      [recordingUrl, fromNumber], function(err) {
      if (err) {
        reject(err);
      } else {
        resolve({ changes: this.changes });
      }
    });
  });
};

// Blacklist management functions
const addToBlacklist = (phoneNumber, reason = 'Unwanted caller', patternType = 'exact') => {
  return new Promise((resolve, reject) => {
    const normalizedNumber = normalizePhoneNumber(phoneNumber);
    const stmt = db.prepare('INSERT INTO blacklist (phone_number, reason, pattern_type) VALUES (?, ?, ?)');
    stmt.run([normalizedNumber, reason, patternType], function(err) {
      if (err) {
        reject(err);
      } else {
        resolve({ id: this.lastID, phone_number: normalizedNumber, reason, pattern_type: patternType });
      }
    });
    stmt.finalize();
  });
};

const getBlacklistByPhoneNumber = (phoneNumber) => {
  return new Promise((resolve, reject) => {
    const normalizedIncoming = normalizePhoneNumber(phoneNumber);
    
    // Get all blacklist entries and check for matches
    db.all('SELECT * FROM blacklist', (err, rows) => {
      if (err) {
        reject(err);
      } else {
        const match = rows.find(entry => {
          if (entry.pattern_type === 'exact') {
            const normalizedStored = normalizePhoneNumber(entry.phone_number);
            return normalizedStored === normalizedIncoming;
          } else if (entry.pattern_type === 'area_code') {
            // Match area code (first 3 digits after country code)
            const incomingAreaCode = normalizedIncoming.substring(2, 5);
            const storedAreaCode = entry.phone_number.replace(/\D/g, '');
            return storedAreaCode === incomingAreaCode;
          } else if (entry.pattern_type === 'prefix') {
            // Match number prefix
            const cleanStored = entry.phone_number.replace(/\D/g, '');
            const cleanIncoming = normalizedIncoming.replace(/\D/g, '');
            return cleanIncoming.startsWith(cleanStored);
          }
          return false;
        });
        resolve(match || null);
      }
    });
  });
};

const getAllBlacklistEntries = () => {
  return new Promise((resolve, reject) => {
    db.all('SELECT * FROM blacklist ORDER BY date_added DESC', (err, rows) => {
      if (err) {
        reject(err);
      } else {
        resolve(rows);
      }
    });
  });
};

const removeFromBlacklist = (id) => {
  return new Promise((resolve, reject) => {
    db.run('DELETE FROM blacklist WHERE id = ?', [id], function(err) {
      if (err) {
        reject(err);
      } else {
        resolve({ changes: this.changes });
      }
    });
  });
};

const clearAllBlacklist = () => {
  return new Promise((resolve, reject) => {
    db.run('DELETE FROM blacklist', function(err) {
      if (err) {
        reject(err);
      } else {
        resolve({ changes: this.changes });
      }
    });
  });
};

// Close database connection
const closeDatabase = () => {
  return new Promise((resolve, reject) => {
    db.close((err) => {
      if (err) {
        reject(err);
      } else {
        console.log('Database connection closed.');
        resolve();
      }
    });
  });
};

module.exports = {
  initializeDatabase,
  addContact,
  getContactByPhoneNumber,
  getAllContacts,
  deleteContact,
  logCall,
  getCallLogs,
  deleteCallLog,
  clearAllCallLogs,
  updateCallLogWithRecording,
  addToBlacklist,
  getBlacklistByPhoneNumber,
  getAllBlacklistEntries,
  removeFromBlacklist,
  clearAllBlacklist,
  closeDatabase
};