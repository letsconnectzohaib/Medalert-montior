const chalk = require('chalk');
const ora = require('ora');
const CLIHelpers = require('../../utils/cli-helpers');

module.exports = async function stats(options) {
  const { days, json } = options;
  
  const spinner = ora('Loading database statistics...').start();
  
  try {
    // Connect to database
    const dbConnection = require('../../database/connection');
    await dbConnection.connect();
    
    // Get statistics
    const StatsModel = require('../../database/models/Stats');
    const dbStats = await StatsModel.getDatabaseStats();
    const dbInfo = dbConnection.getDatabaseInfo();
    
    // Get hourly stats for the specified period
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - parseInt(days));
    
    const hourlyStats = await StatsModel.getHourlyStats({
      start: startDate.toISOString(),
      end: endDate.toISOString()
    });
    
    const dailyStats = await StatsModel.getDailyStats({
      start: startDate.toISOString(),
      end: endDate.toISOString()
    });
    
    spinner.succeed('Statistics loaded');
    
    if (json) {
      // Output JSON format
      const output = {
        summary: {
          totalRecords: dbStats.totalRecords,
          todayRecords: dbStats.todayRecords,
          databaseSize: dbInfo.size,
          databasePath: dbInfo.path,
          periodDays: days
        },
        hourlyStats: hourlyStats,
        dailyStats: dailyStats,
        generatedAt: new Date().toISOString()
      };
      
      console.log(JSON.stringify(output, null, 2));
    } else {
      // Display formatted output
      CLIHelpers.header('📊 Database Statistics');
      
      // Calculate averages
      const daysSinceOldest = dbStats.oldestRecord ? 
        Math.max(1, (Date.now() - new Date(dbStats.oldestRecord)) / (1000 * 60 * 60 * 24)) : 1;
      
      // Summary box
      const summaryBox = CLIHelpers.createStatsBox('📈 Summary Statistics', {
        totalRecords: dbStats.totalRecords.toLocaleString(),
        todayRecords: dbStats.todayRecords.toLocaleString(),
        databaseSize: CLIHelpers.formatBytes(dbInfo.size),
        periodAnalyzed: `${days} days`,
        averageRecordsPerDay: Math.round(dbStats.totalRecords / daysSinceOldest).toLocaleString(),
        estimatedAnnualRecords: Math.round(dbStats.totalRecords / daysSinceOldest * 365).toLocaleString()
      });
      
      console.log(summaryBox);
      
      // Hourly averages
      if (hourlyStats.length > 0) {
        CLIHelpers.subheader('🕐 Hourly Averages (Last ' + days + ' days)');
        
        const hourlyTable = CLIHelpers.createTable(['Hour', 'Avg Calls', 'Max Calls', 'Min Calls', 'Avg Agents', 'Data Points']);
        
        hourlyStats.slice(0, 24).forEach(stat => {
          hourlyTable.push([
            stat.hour,
            Math.round(stat.avg_active_calls),
            stat.max_active_calls,
            stat.min_active_calls,
            Math.round(stat.avg_agents_logged_in),
            stat.data_points
          ]);
        });
        
        console.log(hourlyTable.toString());
      }
      
      // Daily summaries
      if (dailyStats.length > 0) {
        CLIHelpers.subheader('📅 Daily Summaries (Last ' + days + ' days)');
        
        const dailyTable = CLIHelpers.createTable(['Date', 'Avg Calls', 'Max Calls', 'Min Calls', 'Avg Agents', 'Data Points']);
        
        dailyStats.slice(0, 30).forEach(stat => {
          dailyTable.push([
            stat.day,
            Math.round(stat.avg_active_calls),
            stat.max_active_calls,
            stat.min_active_calls,
            Math.round(stat.avg_agents_logged_in),
            stat.data_points
          ]);
        });
        
        console.log(dailyTable.toString());
      }
      
      // Performance metrics
      CLIHelpers.subheader('⚡ Performance Metrics');
      
      const avgCallsPerHour = hourlyStats.length > 0 
        ? Math.round(hourlyStats.reduce((sum, stat) => sum + stat.avg_active_calls, 0) / hourlyStats.length)
        : 0;
      
      const peakHour = hourlyStats.length > 0
        ? hourlyStats.reduce((max, stat) => stat.max_active_calls > max.max_active_calls ? stat : max)
        : null;
      
      const performanceTable = CLIHelpers.createTable(['Metric', 'Value']);
      performanceTable.push(
        ['Average Calls per Hour', avgCallsPerHour.toLocaleString()],
        ['Peak Hour', peakHour ? `${peakHour.hour} (${peakHour.max_active_calls} calls)` : 'N/A'],
        ['Data Points Analyzed', hourlyStats.reduce((sum, stat) => sum + stat.data_points, 0).toLocaleString()],
        ['Database Growth Rate', CLIHelpers.formatBytes(dbInfo.size / daysSinceOldest * 86400) + '/day'],
        ['Storage Efficiency', `${Math.round((dbStats.totalRecords * 300) / dbInfo.size * 100)}%`]
      );
      
      console.log(performanceTable.toString());
      
      // Recommendations
      CLIHelpers.subheader('💡 Recommendations');
      
      const recommendations = [];
      
      if (dbInfo.size > 1000000000) { // 1GB
        recommendations.push('🔧 Consider implementing data archival for records older than 90 days');
      }
      
      if (dbStats.todayRecords < 1000) {
        recommendations.push('⚠️  Low data volume detected. Check if extension is running properly');
      }
      
      if (avgCallsPerHour > 50) {
        recommendations.push('📈 High call volume detected. Consider scaling infrastructure');
      }
      
      if (recommendations.length === 0) {
        recommendations.push('✅ System is operating within normal parameters');
      }
      
      recommendations.forEach(rec => console.log(`  ${rec}`));
    }
    
    await dbConnection.close();
    
  } catch (error) {
    spinner.fail('Failed to load statistics');
    CLIHelpers.error(error.message);
    process.exit(1);
  }
};
