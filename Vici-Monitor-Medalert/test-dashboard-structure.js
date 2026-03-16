const http = require('http');

// Test what structure the dashboard API returns
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
            console.log('\n=== DASHBOARD API STRUCTURE ANALYSIS ===');
            
            if (data.success) {
                console.log('✅ API Success: true');
                console.log('\n📊 Root Data Structure:');
                console.log('Keys:', Object.keys(data));
                console.log('Data type:', typeof data.data);
                
                if (data.data) {
                    console.log('\n📋 Data Object Keys:');
                    console.log('Keys:', Object.keys(data.data));
                    
                    console.log('\n📈 Summary Structure:');
                    if (data.data.summary) {
                        console.log('Summary exists: true');
                        console.log('Summary keys:', Object.keys(data.data.summary));
                        console.log('Summary sample:', JSON.stringify(data.data.summary, null, 2));
                    } else {
                        console.log('❌ Summary is missing or undefined');
                    }
                    
                    console.log('\n👥 Details Structure:');
                    if (data.data.details) {
                        console.log('Details exists: true');
                        console.log('Details keys:', Object.keys(data.data.details));
                        
                        if (data.data.details.agents) {
                            console.log('Agents array length:', data.data.details.agents.length);
                            console.log('First agent sample:', JSON.stringify(data.data.details.agents[0], null, 2));
                        }
                        
                        if (data.data.details.waitingCalls) {
                            console.log('Waiting calls array length:', data.data.details.waitingCalls.length);
                            console.log('First waiting call sample:', JSON.stringify(data.data.details.waitingCalls[0], null, 2));
                        }
                    } else {
                        console.log('❌ Details is missing or undefined');
                    }
                }
                
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
