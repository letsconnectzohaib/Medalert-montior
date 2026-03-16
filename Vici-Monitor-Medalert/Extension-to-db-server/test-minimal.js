const http = require('http');

// Test data to send
const testData = {
    summary: {
        activeCalls: 5,
        agentsLoggedIn: 15,
        agentsInCalls: 8,
        callsWaiting: 2
    },
    details: {
        agents: [
            {
                station: "SIP/1001",
                user: "Test Agent",
                status: "INCALL",
                calls: 10
            }
        ],
        waitingCalls: [
            {
                phone: "1234567890",
                campaign: "Test Campaign",
                dialtime: "0:30"
            }
        ]
    },
    meta: {
        dialLevel: "3.5",
        dialableLeads: 100
    }
};

// Send test data to server
const postData = JSON.stringify(testData);

const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/api/logs',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
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

req.write(postData);
req.end();
