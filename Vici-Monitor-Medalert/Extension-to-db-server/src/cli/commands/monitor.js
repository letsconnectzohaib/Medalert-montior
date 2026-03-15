const chalk = require('chalk');
const ora = require('ora');
const CLIHelpers = require('../../utils/cli-helpers');

module.exports = async function monitor(options) {
  const { refresh } = options;
  const refreshInterval = parseInt(refresh) * 1000;
  
  CLIHelpers.header('📡 Real-Time ViciDial Monitor');
  console.log(chalk.gray(`Refresh interval: ${refresh} seconds | Press Ctrl+C to stop\n`));
  
  let running = true;
  
  // Handle graceful shutdown
  process.on('SIGINT', () => {
    running = false;
    console.log(chalk.yellow('\n\n🛑 Stopping monitor...'));
    process.exit(0);
  });
  
  // Monitor loop
  while (running) {
    try {
      // Clear screen for real-time effect
      console.clear();
      
      // Redraw header
      CLIHelpers.header('📡 Real-Time ViciDial Monitor');
      console.log(chalk.gray(`Refresh interval: ${refresh} seconds | Last update: ${new Date().toLocaleString()}\n`));
      
      const spinner = ora('Fetching data...').start();
      
      // Get current stats
      const dbConnection = require('../../database/connection');
      await dbConnection.connect();
      
      const StatsModel = require('../../database/models/Stats');
      const latestRecord = await StatsModel.getLatestRecord();
      const dbStats = await StatsModel.getDatabaseStats();
      
      spinner.succeed('Data loaded');
      
      if (latestRecord) {
        const data = JSON.parse(latestRecord.raw_data);
        const summary = data.summary || {};
        const meta = data.meta || {};
        
        // Main status box
        const statusBox = CLIHelpers.createStatusBox('🖥️ Live Status', [
          {
            label: 'System Status',
            value: 'RUNNING',
            status: 'running'
          },
          {
            label: 'Last Update',
            value: CLIHelpers.formatDateTime(latestRecord.timestamp),
            status: Date.now() - new Date(latestRecord.timestamp) < 30000 ? 'running' : 'warning'
          },
          {
            label: 'Data Flow',
            value: dbStats.todayRecords > 0 ? 'Active' : 'Inactive',
            status: dbStats.todayRecords > 0 ? 'running' : 'warning'
          }
        ]);
        
        console.log(statusBox);
        
        // Call metrics
        CLIHelpers.subheader('📞 Call Metrics');
        
        const callMetricsTable = CLIHelpers.createTable(['Metric', 'Value', 'Status']);
        callMetricsTable.push(
          ['Active Calls', summary.activeCalls || 0, summary.activeCalls > 20 ? '🔴 High' : summary.activeCalls > 10 ? '🟡 Medium' : '🟢 Normal'],
          ['Waiting Calls', summary.waitingCalls || 0, summary.waitingCalls > 5 ? '🔴 High' : summary.waitingCalls > 2 ? '🟡 Medium' : '🟢 Normal'],
          ['Ringing Calls', summary.ringingCalls || 0, '🟢 Normal'],
          ['IVR Calls', summary.ivrCalls || 0, '🟢 Normal'],
          ['Calls Today', meta.callsToday || 0, meta.callsToday > 1000 ? '🟢 High' : '🟡 Normal']
        );
        
        console.log(callMetricsTable.toString());
        
        // Agent metrics
        CLIHelpers.subheader('👥 Agent Metrics');
        
        const agentMetricsTable = CLIHelpers.createTable(['Metric', 'Value', 'Status']);
        agentMetricsTable.push(
          ['Agents Logged In', summary.agentsLoggedIn || 0, summary.agentsLoggedIn > 15 ? '🟢 Good' : '🟡 Low'],
          ['Agents In Calls', summary.agentsInCalls || 0, '🟢 Active'],
          ['Agents Waiting', summary.agentsWaiting || 0, summary.agentsWaiting > 0 ? '🟡 Waiting' : '🟢 Ready'],
          ['Agents Paused', summary.agentsPaused || 0, summary.agentsPaused > 3 ? '🔴 High' : '🟢 Normal'],
          ['Agents Dead', summary.agentsDead || 0, summary.agentsDead > 0 ? '🔴 Issue' : '🟢 Good'],
          ['Agents Dispo', summary.agentsDispo || 0, '🟢 Normal']
        );
        
        console.log(agentMetricsTable.toString());
        
        // System info
        CLIHelpers.subheader('⚙️ System Information');
        
        const systemTable = CLIHelpers.createTable(['Parameter', 'Value']);
        systemTable.push(
          ['Dial Level', meta.dialLevel || 'N/A'],
          ['Dialable Leads', (meta.dialableLeads || 0).toLocaleString()],
          ['Dial Method', meta.dialMethod || 'N/A'],
          ['Average Agents', meta.avgAgents || 0],
          ['Database Records', dbStats.totalRecords.toLocaleString()],
          ['Today Records', dbStats.todayRecords.toLocaleString()]
        );
        
        console.log(systemTable.toString());
        
        // Visual indicators
        CLIHelpers.subheader('📊 Visual Indicators');
        
        // Call volume indicator
        const callPercentage = Math.min(100, (summary.activeCalls || 0) * 5);
        console.log(`Call Volume: ${CLIHelpers.progressBar(callPercentage)}`);
        
        // Agent utilization indicator
        const agentUtilization = summary.agentsLoggedIn > 0 ? 
          Math.min(100, ((summary.agentsInCalls || 0) / summary.agentsLoggedIn) * 100) : 0;
        console.log(`Agent Utilization: ${CLIHelpers.progressBar(agentUtilization)}`);
        
        // Waiting calls indicator
        const waitingPercentage = Math.min(100, (summary.waitingCalls || 0) * 20);
        console.log(`Queue Load: ${CLIHelpers.progressBar(waitingPercentage)}`);
        
        // Recent activity
        CLIHelpers.subheader('📈 Recent Activity (Last Hour)');
        
        const oneHourAgo = new Date(Date.now() - 3600000).toISOString();
        const recentStats = await StatsModel.getHourlyStats({
          start: oneHourAgo,
          end: new Date().toISOString()
        });
        
        if (recentStats.length > 0) {
          const activityTable = CLIHelpers.createTable(['Time Period', 'Avg Calls', 'Max Calls', 'Data Points']);
          recentStats.slice(0, 6).forEach(stat => {
            activityTable.push([
              stat.hour.split(' ')[1] || stat.hour,
              Math.round(stat.avg_active_calls),
              stat.max_active_calls,
              stat.data_points
            ]);
          });
          console.log(activityTable.toString());
        } else {
          console.log(chalk.gray('No recent activity data available'));
        }
        
      } else {
        const noDataBox = CLIHelpers.createBox(
          chalk.yellow('⚠️ No data available\n\nMake sure the ViciDial extension is running and sending data to the server.'),
          { borderColor: 'yellow' }
        );
        console.log(noDataBox);
      }
      
      await dbConnection.close();
      
      // Wait for next refresh
      if (running) {
        console.log(chalk.gray(`\n⏱️  Next refresh in ${refresh} seconds...`));
        await new Promise(resolve => setTimeout(resolve, refreshInterval));
      }
      
    } catch (error) {
      console.clear();
      CLIHelpers.header('📡 Real-Time ViciDial Monitor');
      CLIHelpers.error(`Monitor error: ${error.message}`);
      console.log(chalk.yellow(`\n⏱️  Retrying in ${refresh} seconds...`));
      
      if (running) {
        await new Promise(resolve => setTimeout(resolve, refreshInterval));
      }
    }
  }
};
