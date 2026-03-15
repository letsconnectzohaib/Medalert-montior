const chalk = require('chalk');
const ora = require('ora');
const CLIHelpers = require('../../utils/cli-helpers');

module.exports = async function start(options) {
  const { port, dev } = options;
  
  CLIHelpers.header('🚀 Starting ViciDial Monitor Server');
  
  const spinner = ora('Initializing database...').start();
  
  try {
    // Import and initialize database
    const migration = require('../../database/migrations/001_initial');
    await migration.up();
    
    spinner.succeed('Database initialized');
    
    // Start the server
    const serverSpinner = ora(`Starting server on port ${port}...`).start();
    
    // Import server (we'll create this next)
    const startServer = require('../../services/ServerService');
    const server = await startServer(port);
    
    serverSpinner.succeed(`Server running on ${chalk.cyan(`http://localhost:${port}`)}`);
    
    CLIHelpers.success('ViciDial Monitor Server started successfully!');
    
    console.log('\n📡 Available API Endpoints:');
    const endpoints = [
      'POST /api/logs - Extension data ingestion',
      'GET  /api/stats - Raw data with pagination',
      'GET  /api/stats/hourly - Hourly aggregations',
      'GET  /api/stats/daily - Daily summaries',
      'GET  /api/health - System health check'
    ];
    
    endpoints.forEach(endpoint => {
      console.log(`  ${chalk.gray('•')} ${chalk.cyan(endpoint)}`);
    });
    
    console.log('\n🛠 Management Commands:');
    console.log(`  ${chalk.gray('•')} ${chalk.cyan('vicidial-monitor status')} - Show system status`);
    console.log(`  ${chalk.gray('•')} ${chalk.cyan('vicidial-monitor stats')} - Database statistics`);
    console.log(`  ${chalk.gray('•')} ${chalk.cyan('vicidial-monitor health')} - Health check`);
    console.log(`  ${chalk.gray('•')} ${chalk.cyan('vicidial-monitor monitor')} - Real-time monitoring`);
    
    console.log('\n📝 Server Information:');
    console.log(`  ${chalk.cyan('Port:')} ${port}`);
    console.log(`  ${chalk.cyan('Mode:')} ${dev ? 'Development' : 'Production'}`);
    console.log(`  ${chalk.cyan('Database:')} SQLite`);
    console.log(`  ${chalk.cyan('Developer:')} Mr. Zohaib`);
    
    console.log(chalk.green('\n🎉 Server is ready to receive data from the extension!'));
    
    // Handle graceful shutdown
    process.on('SIGINT', () => {
      console.log(chalk.yellow('\n\n🛑 Shutting down server...'));
      server.close(() => {
        CLIHelpers.success('Server stopped gracefully');
        process.exit(0);
      });
    });
    
  } catch (error) {
    spinner.fail('Failed to start server');
    CLIHelpers.error(error.message);
    process.exit(1);
  }
};
