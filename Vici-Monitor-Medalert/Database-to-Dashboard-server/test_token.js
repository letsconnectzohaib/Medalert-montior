const jwt = require('jsonwebtoken');
require('dotenv').config();

// Test JWT generation and verification
const testPayload = { id: 1, username: 'admin', role: 'admin' };
const token = jwt.sign(testPayload, process.env.JWT_SECRET, { expiresIn: '1h' });

console.log('✅ JWT Secret:', process.env.JWT_SECRET ? 'Configured' : 'Missing');
console.log('✅ Generated Token:', token);
console.log('✅ Token Length:', token.length);

// Verify the token
try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log('✅ Token Verification: Success');
    console.log('✅ Decoded Payload:', decoded);
} catch (err) {
    console.log('❌ Token Verification: Failed');
    console.log('❌ Error:', err.message);
}
