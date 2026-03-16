const http = require('http');

// Test login endpoint
const loginData = JSON.stringify({
    username: 'admin',
    password: 'admin123'
});

const options = {
    hostname: 'localhost',
    port: 3001,
    path: '/api/auth/login',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(loginData)
    }
};

const req = http.request(options, (res) => {
    console.log(`Status: ${res.statusCode}`);
    console.log(`Response: ${res.statusMessage}`);
    
    res.on('data', (chunk) => {
        console.log(`Response body: ${chunk}`);
    });
});

req.on('error', (e) => {
    console.error(`Problem with request: ${e.message}`);
});

req.write(loginData);
req.end();

// Test dashboard summary endpoint
setTimeout(() => {
    console.log('\n--- Testing Dashboard Summary ---');
    
    const summaryOptions = {
        hostname: 'localhost',
        port: 3001,
        path: '/api/dashboard/summary',
        method: 'GET'
    };
    
    const summaryReq = http.request(summaryOptions, (res) => {
        console.log(`Status: ${res.statusCode}`);
        console.log(`Response: ${res.statusMessage}`);
        
        res.on('data', (chunk) => {
            const data = JSON.parse(chunk);
            console.log(`Dashboard data keys: ${Object.keys(data)}`);
            if (data.success) {
                console.log(`Summary active calls: ${data.data.summary.activeCalls}`);
                console.log(`Total agents: ${data.data.details.agents.length}`);
                console.log(`Waiting calls: ${data.data.details.waitingCalls.length}`);
            }
        });
    });
    
    summaryReq.on('error', (e) => {
        console.error(`Problem with summary request: ${e.message}`);
    });
    
    summaryReq.end();
}, 1000);
