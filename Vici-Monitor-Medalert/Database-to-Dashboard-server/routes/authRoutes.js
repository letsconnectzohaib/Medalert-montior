
const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

// A secret key for signing JWTs. In a real production app, this should be stored in environment variables!
const JWT_SECRET = 'your-super-secret-key-that-should-be-in-a-env-file';

// POST /api/auth/login
router.post('/login', (req, res) => {
  const { username, password } = req.body;
  const db = req.db;

  if (!username || !password) {
    return res.status(400).json({ success: false, message: 'Username and password are required.' });
  }

  const query = 'SELECT * FROM users WHERE username = ?';
  db.get(query, [username], async (err, user) => {
    if (err) {
      console.error("Login DB Error:", err.message);
      return res.status(500).json({ success: false, message: 'Server error during login.' });
    }

    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid credentials.' }); // User not found
    }

    try {
      const passwordMatch = await bcrypt.compare(password, user.password_hash);
      if (!passwordMatch) {
        return res.status(401).json({ success: false, message: 'Invalid credentials.' }); // Password doesn't match
      }

      // Passwords match, user is authenticated. Generate a JWT.
      const payload = { 
        userId: user.id,
        username: user.username,
        role: user.role
      };

      const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '8h' }); // Token expires in 8 hours

      res.json({ 
          success: true, 
          message: 'Login successful!',
          token: token,
          user: payload
      });

    } catch (compareError) {
      console.error("Password comparison error:", compareError);
      return res.status(500).json({ success: false, message: 'Server error during authentication.' });
    }
  });
});

// Middleware to protect routes
const verifyToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer <TOKEN>

    if (token == null) return res.sendStatus(401); // if no token, unauthorized

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return res.sendStatus(403); // if token is invalid, forbidden
        req.user = user;
        next(); // proceed to the next middleware or route handler
    });
};

module.exports = { router, verifyToken };
