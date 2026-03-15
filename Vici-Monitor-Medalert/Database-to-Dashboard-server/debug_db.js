const { get } = require('./database');

async function debugDatabase() {
    try {
        console.log('🔍 Checking database...');
        
        // Check if users table exists
        const tableExists = await get(`
            SELECT name FROM sqlite_master 
            WHERE type='table' AND name='users'
        `);
        
        console.log('Users table exists:', tableExists ? '✅ Yes' : '❌ No');
        
        if (tableExists) {
            // Check users in table
            const users = await get('SELECT COUNT(*) as count FROM users');
            console.log('Users in table:', users.count);
            
            // Check admin user
            const adminUser = await get('SELECT * FROM users WHERE username = ?', ['admin']);
            if (adminUser) {
                console.log('✅ Admin user found:', adminUser.username);
                console.log('   Role:', adminUser.role);
                console.log('   Password hash exists:', adminUser.password_hash ? '✅ Yes' : '❌ No');
            } else {
                console.log('❌ Admin user not found');
            }
        }
        
    } catch (error) {
        console.error('❌ Database error:', error.message);
    }
}

debugDatabase();
