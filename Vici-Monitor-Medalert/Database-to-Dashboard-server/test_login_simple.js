const http = require('http');

async function testLogin() {
    const postData = JSON.stringify({
        username: 'admin',
        password: 'password'
    });

    const options = {
        hostname: 'localhost',
        port: 3001,
        path: '/api/auth/login',
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(postData)
        }
    };

    const req = http.request(options, (res) => {
        console.log('Status:', res.statusCode);
        
        let data = '';
        res.on('data', (chunk) => {
            data += chunk;
        });
        
        res.on('end', () => {
            try {
                const result = JSON.parse(data);
                console.log('Response:', result);
                
                if (res.statusCode === 200) {
                    console.log('✅ Login successful!');
                    console.log('User:', result.user);
                } else {
                    console.log('❌ Login failed:', result.error);
                }
            } catch (e) {
                console.log('❌ JSON Parse Error:', e.message);
            }
        });
    });

    req.on('error', (e) => {
        console.error('Request Error:', e.message);
    });

    req.write(postData);
    req.end();
}

testLogin();
