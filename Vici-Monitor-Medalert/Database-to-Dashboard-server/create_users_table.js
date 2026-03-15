const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcrypt');

const DB_FILE = path.join(__dirname, 'vicidial.db');

console.log('Creating users table and default admin user...');

const db = new sqlite3.Database(DB_FILE, (err) => {
    if (err) {
        console.error('Error opening database:', err.message);
        process.exit(1);
    }
    
    console.log('Database connected successfully.');
});

db.serialize(() => {
    // Create users table
    db.run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'user',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`, (err) => {
        if (err) {
            console.error('Error creating users table:', err.message);
            db.close();
            process.exit(1);
        }
        console.log('Users table created successfully.');
        
        // Create default admin user
        const defaultUsername = 'admin';
        const defaultPassword = 'password';
        
        bcrypt.hash(defaultPassword, 10, (hashErr, passwordHash) => {
            if (hashErr) {
                console.error('Error hashing password:', hashErr.message);
                db.close();
                process.exit(1);
            }
            
            // Insert default admin user
            db.run('INSERT OR IGNORE INTO users (username, password_hash, role) VALUES (?, ?, ?)', 
                   [defaultUsername, passwordHash, 'admin'], (insertErr) => {
                if (insertErr) {
                    console.error('Error inserting admin user:', insertErr.message);
                } else {
                    console.log('✅ Default admin user created successfully.');
                    console.log('   Username:', defaultUsername);
                    console.log('   Password:', defaultPassword);
                    console.log('   Role: admin');
                }
                
                db.close((closeErr) => {
                    if (closeErr) {
                        console.error('Error closing database:', closeErr.message);
                    } else {
                        console.log('Database connection closed.');
                        console.log('🎉 Users table setup complete!');
                    }
                });
            });
        });
    });
});
