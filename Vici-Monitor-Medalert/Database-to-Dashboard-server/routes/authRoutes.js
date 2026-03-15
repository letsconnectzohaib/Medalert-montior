
const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const { get } = require('../database');
const rateLimit = require('express-rate-limit');

// Apply rate limiting to the login route to prevent brute-force attacks
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    standardHeaders: true, 
    legacyHeaders: false, 
    message: { success: false, error: 'Too many login attempts from this IP, please try again after 15 minutes' }
});

// POST /api/auth/login - SECURE & ROBUST
router.post('/login', loginLimiter, async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ success: false, error: 'Username and password are required.' });
    }

    try {
        const user = await get('SELECT * FROM users WHERE username = ?', [username]);

        if (!user) {
            return res.status(401).json({ success: false, error: 'Invalid credentials.' });
        }

        const isMatch = await bcrypt.compare(password, user.password_hash);

        if (!isMatch) {
            return res.status(401).json({ success: false, error: 'Invalid credentials.' });
        }

        // Create a JWT. The secret should be in an environment variable.
        const token = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '1h' });

        // QA FIX: Return the token in the Authorization header and user object in the body.
        res.setHeader('Authorization', `Bearer ${token}`);
        res.json({
            success: true,
            user: {
                id: user.id,
                username: user.username,
                role: user.role
            }
        });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ success: false, error: 'An internal server error occurred.' });
    }
});

module.exports = router;
