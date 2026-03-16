const http = require('http');

// Debug dashboard data to find the exact cause of RangeError
const options = {
    hostname: 'localhost',
    port: 3001,
    path: '/api/dashboard/summary',
    method: 'GET'
};

const req = http.request(options, (res) => {
    console.log(`Status: ${res.statusCode}`);
    
    res.on('data', (chunk) => {
        try {
            const data = JSON.parse(chunk);
            console.log('\n=== DEBUGGING DASHBOARD DATA ===');
            
            if (data.success) {
                console.log('✅ API Success: true');
                
                // Check for any potential issues in the data
                console.log('\n🔍 CHECKING FOR POTENTIAL ISSUES:');
                
                // Check summary data
                console.log('\n📊 Summary Data:');
                Object.entries(data.data.summary).forEach(([key, value]) => {
                    if (value === null || value === undefined) {
                        console.log(`  ⚠️  ${key}: ${value} (null/undefined)`);
                    } else if (typeof value === 'string' && value.includes('Invalid')) {
                        console.log(`  ❌ ${key}: ${value} (contains 'Invalid')`);
                    } else {
                        console.log(`  ✅ ${key}: ${value}`);
                    }
                });
                
                // Check agent data
                console.log('\n👥 Agent Data:');
                data.data.details.agents.slice(0, 2).forEach((agent, i) => {
                    console.log(`  Agent ${i+1}:`);
                    Object.entries(agent).forEach(([key, value]) => {
                        if (value === null || value === undefined) {
                            console.log(`    ⚠️  ${key}: ${value} (null/undefined)`);
                        } else if (typeof value === 'string' && value.includes('Invalid')) {
                            console.log(`    ❌ ${key}: ${value} (contains 'Invalid')`);
                        } else {
                            console.log(`    ✅ ${key}: ${value}`);
                        }
                    });
                });
                
                // Check waiting calls data
                console.log('\n📞 Waiting Calls Data:');
                data.data.details.waitingCalls.slice(0, 2).forEach((call, i) => {
                    console.log(`  Call ${i+1}:`);
                    Object.entries(call).forEach(([key, value]) => {
                        if (value === null || value === undefined) {
                            console.log(`    ⚠️  ${key}: ${value} (null/undefined)`);
                        } else if (typeof value === 'string' && value.includes('Invalid')) {
                            console.log(`    ❌ ${key}: ${value} (contains 'Invalid')`);
                        } else {
                            console.log(`    ✅ ${key}: ${value}`);
                        }
                    });
                });
                
                // Check metadata
                console.log('\n🔧 Metadata:');
                Object.entries(data.data.meta).forEach(([key, value]) => {
                    if (value === null || value === undefined) {
                        console.log(`  ⚠️  ${key}: ${value} (null/undefined)`);
                    } else if (typeof value === 'string' && value.includes('Invalid')) {
                        console.log(`    ❌ ${key}: ${value} (contains 'Invalid')`);
                    } else {
                        console.log(`  ✅ ${key}: ${value}`);
                    }
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
