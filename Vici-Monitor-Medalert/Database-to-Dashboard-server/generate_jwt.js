const crypto = require('crypto');

// Generate a secure JWT secret
const jwtSecret = crypto.randomBytes(32).toString('base64');

console.log('Generated JWT Secret:', jwtSecret);
console.log('\nCopy this to your .env file:');
console.log('JWT_SECRET=' + jwtSecret);

// Also generate a test token for development
const jwt = require('jsonwebtoken');
const testToken = jwt.sign(
    { id: 1, username: 'admin', role: 'admin' }, 
    jwtSecret, 
    { expiresIn: '1h' }
);

console.log('\nTest Token (for development):');
console.log(testToken);
