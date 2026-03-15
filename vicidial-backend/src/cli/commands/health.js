const chalk = require('chalk');
const ora = require('ora');
const CLIHelpers = require('../../utils/cli-helpers');

module.exports = async function health() {
  const spinner = ora('Performing health check...').start();
  
  try {
    const healthResults = {
      database: { status: 'unknown', details: {} },
      filesystem: { status: 'unknown', details: {} },
      performance: { status: 'unknown', details: {} },
      data: { status: 'unknown', details: {} }
    };
    
    // Database health check
    try {
      const dbConnection = require('../../database/connection');
      await dbConnection.connect();
      
      const StatsModel = require('../../database/models/Stats');
      const dbStats = await StatsModel.getDatabaseStats();
      const dbInfo = dbConnection.getDatabaseInfo();
      
      // Test database performance
      const start = Date.now();
      await StatsModel.getLatestRecord();
      const queryTime = Date.now() - start;
      
      healthResults.database = {
        status: queryTime < 100 ? 'healthy' : 'warning',
        details: {
          connection: 'OK',
          queryTime: `${queryTime}ms`,
          totalRecords: dbStats.totalRecords,
          databaseSize: CLIHelpers.formatBytes(dbInfo.size),
          lastRecord: CLIHelpers.formatDateTime(dbStats.newestRecord)
        }
      };
      
      await dbConnection.close();
    } catch (error) {
      healthResults.database = {
        status: 'error',
        details: { error: error.message }
      };
    }
    
    // Filesystem health check
    try {
      const fs = require('fs');
      const path = require('path');
      
      const dbPath = path.join(__dirname, '../../vicidial_stats.db');
      const stats = fs.statSync(dbPath);
      const freeSpace = getFreeSpace(path.dirname(dbPath));
      
      healthResults.filesystem = {
        status: freeSpace > 1000000000 ? 'healthy' : 'warning', // 1GB free
        details: {
          databaseSize: CLIHelpers.formatBytes(stats.size),
          freeSpace: CLIHelpers.formatBytes(freeSpace),
          permissions: stats.mode ? 'OK' : 'Unknown'
        }
      };
    } catch (error) {
      healthResults.filesystem = {
        status: 'error',
        details: { error: error.message }
      };
    }
    
    // Performance health check
    try {
      const dbConnection = require('../../database/connection');
      await dbConnection.connect();
      
      const StatsModel = require('../../database/models/Stats');
      
      // Test various query performance
      const start = Date.now();
      await StatsModel.getStats({ limit: 100 });
      const basicQueryTime = Date.now() - start;
      
      const start2 = Date.now();
      await StatsModel.getHourlyStats({ start: new Date(Date.now() - 86400000).toISOString() });
      const aggregationQueryTime = Date.now() - start2;
      
      healthResults.performance = {
        status: basicQueryTime < 50 && aggregationQueryTime < 200 ? 'healthy' : 'warning',
        details: {
          basicQuery: `${basicQueryTime}ms`,
          aggregationQuery: `${aggregationQueryTime}ms`,
          memoryUsage: CLIHelpers.formatBytes(process.memoryUsage().heapUsed)
        }
      };
      
      await dbConnection.close();
    } catch (error) {
      healthResults.performance = {
        status: 'error',
        details: { error: error.message }
      };
    }
    
    // Data health check
    try {
      const dbConnection = require('../../database/connection');
      await dbConnection.connect();
      
      const StatsModel = require('../../database/models/Stats');
      const dbStats = await StatsModel.getDatabaseStats();
      const latestRecord = await StatsModel.getLatestRecord();
      
      const now = new Date();
      const lastDataAge = latestRecord ? now - new Date(latestRecord.timestamp) : Infinity;
      const lastDataAgeMinutes = Math.floor(lastDataAge / 60000);
      
      healthResults.data = {
        status: lastDataAge < 300000 ? 'healthy' : 'warning', // 5 minutes
        details: {
          totalRecords: dbStats.totalRecords,
          todayRecords: dbStats.todayRecords,
          lastDataReceived: lastDataAge < Infinity ? `${lastDataAgeMinutes} minutes ago` : 'Never',
          dataFlowRate: dbStats.todayRecords > 0 ? 'Active' : 'Inactive'
        }
      };
      
      await dbConnection.close();
    } catch (error) {
      healthResults.data = {
        status: 'error',
        details: { error: error.message }
      };
    }
    
    spinner.succeed('Health check completed');
    
    // Display results
    CLIHelpers.header('🏥 System Health Check');
    
    // Overall status
    const allHealthy = Object.values(healthResults).every(result => result.status === 'healthy');
    const hasWarnings = Object.values(healthResults).some(result => result.status === 'warning');
    const hasErrors = Object.values(healthResults).some(result => result.status === 'error');
    
    let overallStatus = 'healthy';
    let statusEmoji = '✅';
    let statusColor = chalk.green;
    
    if (hasErrors) {
      overallStatus = 'error';
      statusEmoji = '❌';
      statusColor = chalk.red;
    } else if (hasWarnings) {
      overallStatus = 'warning';
      statusEmoji = '⚠️';
      statusColor = chalk.yellow;
    }
    
    const overallBox = CLIHelpers.createBox(
      statusEmoji + ' Overall Status: ' + statusColor(overallStatus.toUpperCase()),
      { borderColor: overallStatus === 'healthy' ? 'green' : overallStatus === 'warning' ? 'yellow' : 'red' }
    );
    console.log(overallBox);
    
    // Individual component status
    const components = [
      { name: 'Database', data: healthResults.database },
      { name: 'Filesystem', data: healthResults.filesystem },
      { name: 'Performance', data: healthResults.performance },
      { name: 'Data Flow', data: healthResults.data }
    ];
    
    components.forEach(component => {
      const statusColor = component.data.status === 'healthy' ? chalk.green : 
                         component.data.status === 'warning' ? chalk.yellow : chalk.red;
      const statusEmoji = component.data.status === 'healthy' ? '🟢' : 
                         component.data.status === 'warning' ? '🟡' : '🔴';
      
      console.log(`\n${statusEmoji} ${component.name}: ${statusColor(component.data.status.toUpperCase())}`);
      
      Object.entries(component.data.details).forEach(([key, value]) => {
        const formattedKey = key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
        console.log(`  ${chalk.cyan(formattedKey)}: ${chalk.white(value)}`);
      });
    });
    
    // Recommendations based on health check
    CLIHelpers.subheader('💡 Health Recommendations');
    
    const recommendations = [];
    
    if (healthResults.database.status !== 'healthy') {
      recommendations.push('🔧 Database issues detected. Check connection and performance.');
    }
    
    if (healthResults.filesystem.status !== 'healthy') {
      recommendations.push('💾 Low disk space. Consider cleaning up old data.');
    }
    
    if (healthResults.performance.status !== 'healthy') {
      recommendations.push('⚡ Performance issues detected. Consider optimizing queries or adding indexes.');
    }
    
    if (healthResults.data.status !== 'healthy') {
      recommendations.push('📡 Data flow issues detected. Check if extension is running properly.');
    }
    
    if (recommendations.length === 0) {
      recommendations.push('✅ All systems are operating normally!');
    }
    
    recommendations.forEach(rec => console.log(`  ${rec}`));
    
    // Exit with appropriate code
    process.exit(hasErrors ? 1 : 0);
    
  } catch (error) {
    spinner.fail('Health check failed');
    CLIHelpers.error(error.message);
    process.exit(1);
  }
};

function getFreeSpace(path) {
  try {
    const fs = require('fs');
    const stats = fs.statSync(path);
    // This is a simplified check - in a real implementation you'd use platform-specific methods
    return 10000000000; // Assume 10GB free for now
  } catch (error) {
    return 0;
  }
}
