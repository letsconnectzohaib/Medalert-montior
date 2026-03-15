const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

class DatabaseConnection {
  constructor() {
    this.db = null;
    this.dbPath = path.join(__dirname, '../../vicidial_stats.db');
  }

  async connect() {
    return new Promise((resolve, reject) => {
      // Ensure database directory exists
      const dbDir = path.dirname(this.dbPath);
      if (!fs.existsSync(dbDir)) {
        fs.mkdirSync(dbDir, { recursive: true });
      }

      this.db = new sqlite3.Database(this.dbPath, (err) => {
        if (err) {
          console.error('Error opening database:', err);
          reject(err);
        } else {
          console.log(`✅ Connected to SQLite database at ${this.dbPath}`);
          resolve(this.db);
        }
      });
    });
  }

  async close() {
    return new Promise((resolve, reject) => {
      if (this.db) {
        this.db.close((err) => {
          if (err) {
            reject(err);
          } else {
            console.log('✅ Database connection closed');
            resolve();
          }
        });
      } else {
        resolve();
      }
    });
  }

  getDatabase() {
    if (!this.db) {
      throw new Error('Database not connected. Call connect() first.');
    }
    return this.db;
  }

  async run(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.run(sql, params, function(err) {
        if (err) {
          reject(err);
        } else {
          resolve({ id: this.lastID, changes: this.changes });
        }
      });
    });
  }

  async get(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.get(sql, params, (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(row);
        }
      });
    });
  }

  async all(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.all(sql, params, (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });
  }

  async serialize(callback) {
    return new Promise((resolve, reject) => {
      this.db.serialize(() => {
        try {
          callback();
          resolve();
        } catch (err) {
          reject(err);
        }
      });
    });
  }

  getDatabaseInfo() {
    return {
      path: this.dbPath,
      size: fs.existsSync(this.dbPath) ? fs.statSync(this.dbPath).size : 0,
      connected: !!this.db
    };
  }
}

// Singleton instance
const dbConnection = new DatabaseConnection();

module.exports = dbConnection;
