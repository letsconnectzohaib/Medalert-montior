// Authentication Routes
const express = require('express');
const router = express.Router();

/**
 * Login endpoint
 */
router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        
        if (!username || !password) {
            return res.status(400).json({ 
                success: false, 
                error: 'Username and password are required' 
            });
        }

        const user = await req.runSingleQuery(`
            SELECT id, username, password, full_name, role, is_active 
            FROM users 
            WHERE username = ? AND is_active = 1
        `, [username]);

        if (!user || user.password !== password) {
            return res.status(401).json({ 
                success: false, 
                error: 'Invalid username or password' 
            });
        }

        // Update last login
        await req.runQuery(`
            UPDATE users 
            SET last_login = CURRENT_TIMESTAMP 
            WHERE id = ?
        `, [user.id]);

        // Return user info without password
        const userInfo = {
            id: user.id,
            username: user.username,
            full_name: user.full_name,
            role: user.role
        };

        res.json({ 
            success: true, 
            message: 'Login successful',
            user: userInfo
        });

    } catch (error) {
        console.error('❌ Login error:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Internal server error' 
        });
    }
});

/**
 * Get current user info (protected endpoint)
 */
router.get('/me', async (req, res) => {
    try {
        const token = req.headers.authorization?.replace('Bearer ', '');
        
        if (!token) {
            return res.status(401).json({ 
                success: false, 
                error: 'No token provided' 
            });
        }

        // For now, just return a simple user (token validation can be added later)
        res.json({ 
            success: true, 
            user: {
                id: 1,
                username: 'admin',
                full_name: 'Administrator',
                role: 'admin'
            }
        });

    } catch (error) {
        console.error('❌ Auth error:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Internal server error' 
        });
    }
});

module.exports = router;
