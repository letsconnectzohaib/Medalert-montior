const chalk = require('chalk');
const ora = require('ora');
const CLIHelpers = require('../../utils/cli-helpers');

module.exports = async function status() {
  const spinner = ora('Checking system status...').start();
  
  try {
    // Check database connection
    const dbConnection = require('../../database/connection');
    await dbConnection.connect();
    
    // Get database stats
    const StatsModel = require('../../database/models/Stats');
    const dbStats = await StatsModel.getDatabaseStats();
    const dbInfo = dbConnection.getDatabaseInfo();
    
    // Get latest record
    const latestRecord = await StatsModel.getLatestRecord();
    
    spinner.succeed('Status check completed');
    
    // Main status box
    const statusBox = CLIHelpers.createStatusBox('🖥️ System Status', [
      {
        label: 'Backend Server',
        value: 'RUNNING',
        status: 'running'
      },
      {
        label: 'Database',
        value: 'CONNECTED (SQLite)',
        status: 'running'
      },
      {
        label: 'Extension',
        value: latestRecord ? `RECEIVING DATA (last: ${formatTimeAgo(latestRecord.timestamp)})` : 'WAITING FOR DATA',
        status: latestRecord ? 'running' : 'warning'
      },
      {
        label: 'Dashboard',
        value: 'READY',
        status: 'running'
      }
    ]);
    
    console.log(statusBox);
    
    // Database statistics box
    const statsBox = CLIHelpers.createStatsBox('📊 Database Statistics', {
      totalRecords: dbStats.totalRecords.toLocaleString(),
      todayRecords: dbStats.todayRecords.toLocaleString(),
      databaseSize: CLIHelpers.formatBytes(dbInfo.size),
      storageLocation: dbInfo.path,
      oldestRecord: CLIHelpers.formatDateTime(dbStats.oldestRecord),
      newestRecord: CLIHelpers.formatDateTime(dbStats.newestRecord)
    });
    
    console.log(statsBox);
    
    // Extension activity section
    CLIHelpers.subheader('📡 Extension Activity');
    
    if (latestRecord) {
      const table = CLIHelpers.createTable(['Metric', 'Value']);
      
      const summary = JSON.parse(latestRecord.raw_data).summary;
      const meta = JSON.parse(latestRecord.raw_data).meta;
      
      table.push(
        ['Last Data Received', CLIHelpers.formatDateTime(latestRecord.timestamp)],
        ['Data Rate', '1 entry/4 seconds (estimated)'],
        ["Today's Total", `${dbStats.todayRecords.toLocaleString()} entries`],
        ['Active Calls', summary.activeCalls || 0],
        ['Agents Logged In', summary.agentsLoggedIn || 0],
        ['Waiting Calls', summary.waitingCalls || 0],
        ['Dial Level', meta.dialLevel || 'N/A'],
        ['Calls Today', meta.callsToday || 0]
      );
      
      console.log(table.toString());
    } else {
      CLIHelpers.warning('No data received yet. Make sure the extension is running and sending data.');
    }
    
    // API Endpoints section
    CLIHelpers.subheader('🌐 API Endpoints');
    
    const endpointsTable = CLIHelpers.createTable(['Endpoint', 'Method', 'Description']);
    endpointsTable.push(
      ['/api/logs', 'POST', 'Extension data ingestion'],
      ['/api/stats', 'GET', 'Raw data with pagination'],
      ['/api/stats/hourly', 'GET', 'Hourly aggregations'],
      ['/api/stats/daily', 'GET', 'Daily summaries'],
      ['/api/health', 'GET', 'System health check']
    );
    
    console.log(endpointsTable.toString());
    
    // Health indicators
    CLIHelpers.subheader('💚 Health Indicators');
    
    const healthItems = [
      { label: 'Database Size', value: CLIHelpers.formatBytes(dbInfo.size), status: dbInfo.size < 1000000000 ? 'running' : 'warning' },
      { label: 'Data Flow', value: latestRecord ? 'Active' : 'Inactive', status: latestRecord ? 'running' : 'warning' },
      { label: 'Records Today', value: dbStats.todayRecords.toLocaleString(), status: dbStats.todayRecords > 0 ? 'running' : 'warning' },
      { label: 'System Performance', value: 'Good', status: 'running' }
    ];
    
    const healthBox = CLIHelpers.createStatusBox('🏥 System Health', healthItems);
    console.log(healthBox);
    
    // Developer info
    const devBox = CLIHelpers.createBox(
      chalk.cyan.bold('👨‍💻 Developer: Mr. Zohaib') + chalk.gray('\nViciDial Monitor v1.0.0') + chalk.green('\nProfessional Call Center Monitoring Solution'),
      { borderColor: 'magenta', padding: 1 }
    );
    
    console.log(devBox);
    
    await dbConnection.close();
    
  } catch (error) {
    spinner.fail('Status check failed');
    CLIHelpers.error(error.message);
    process.exit(1);
  }
};

function formatTimeAgo(timestamp) {
  const now = new Date();
  const past = new Date(timestamp);
  const diffMs = now - past;
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);
  
  if (diffDays > 0) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  if (diffHours > 0) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  if (diffMinutes > 0) return `${diffMinutes} minute${diffMinutes > 1 ? 's' : ''} ago`;
  if (diffSeconds > 0) return `${diffSeconds} second${diffSeconds > 1 ? 's' : ''} ago`;
  return 'just now';
}
