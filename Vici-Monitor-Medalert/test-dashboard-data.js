const http = require('http');

// Test dashboard data with time parsing
const options = {
    hostname: 'localhost',
    port: 3001,
    path: '/api/dashboard/summary',
    method: 'GET'
};

const req = http.request(options, (res) => {
    console.log(`Status: ${res.statusCode}`);
    console.log(`Response: ${res.statusMessage}`);
    
    res.on('data', (chunk) => {
        try {
            const data = JSON.parse(chunk);
            console.log('\n=== DASHBOARD DATA ANALYSIS ===');
            
            if (data.success) {
                console.log('✅ API Success: true');
                console.log(`📊 Timestamp: ${data.data.timestamp}`);
                console.log(`📞 Active Calls: ${data.data.summary.activeCalls}`);
                console.log(`👥 Agents Logged In: ${data.data.summary.agentsLoggedIn}`);
                console.log(`⏳ Waiting Calls: ${data.data.summary.callsWaiting}`);
                
                console.log(`\n📋 Agent Details (${data.data.details.agents.length} agents):`);
                data.data.details.agents.slice(0, 3).forEach((agent, i) => {
                    console.log(`  ${i+1}. ${agent.user} (${agent.status}) - ${agent.campaign}`);
                });
                
                console.log(`\n📞 Waiting Calls Details (${data.data.details.waitingCalls.length} calls):`);
                data.data.details.waitingCalls.slice(0, 3).forEach((call, i) => {
                    console.log(`  ${i+1}. ${call.phone} - ${call.campaign} - dialtime: ${call.dialtime}`);
                });
                
                // Test time parsing
                console.log(`\n⏱️  Time Parsing Test:`);
                data.data.details.waitingCalls.slice(0, 3).forEach((call, i) => {
                    const dialtime = call.dialtime;
                    console.log(`  ${i+1}. "${dialtime}" -> ${call.dialtime ? 'parsed' : 'null/undefined'}`);
                });
                
            } else {
                console.log('❌ API Success: false');
                console.log(`Error: ${data.error}`);
            }
        } catch (error) {
            console.error('❌ Failed to parse JSON:', error);
            console.log('Raw response:', chunk.toString());
        }
    });
});

req.on('error', (e) => {
    console.error(`Problem with request: ${e.message}`);
});

req.end();
