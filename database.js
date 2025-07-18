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

const getContactByPhoneNumber = (phoneNumber) => {
  return new Promise((resolve, reject) => {
    db.get('SELECT * FROM contacts WHERE phone_number = ?', [phoneNumber], (err, row) => {
      if (err) {
        reject(err);
      } else {
        resolve(row);
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
  closeDatabase
};