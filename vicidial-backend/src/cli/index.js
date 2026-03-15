#!/usr/bin/env node

const { Command } = require('commander');
const chalk = require('chalk');
const boxen = require('boxen');

const startCommand = require('./commands/start');
const statusCommand = require('./commands/status');
const statsCommand = require('./commands/stats');
const healthCommand = require('./commands/health');
const monitorCommand = require('./commands/monitor');
const dashboardCommand = require('./commands/dashboard'); // Ensure dashboard is imported

// Handle chalk v5+ (ESM) vs v4 (CJS) compatibility
let cyan, green, yellow;
try {
  // Try chalk v5+ (ESM style)
  cyan = (text) => `\x1b[36m${text}\x1b[0m`;
  green = (text) => `\x1b[32m${text}\x1b[0m`;
  yellow = (text) => `\x1b[33m${text}\x1b[0m`;
} catch (error) {
  // Fallback colors
  cyan = (text) => text;
  green = (text) => text;
  yellow = (text) => text;
}

const program = new Command();

// ASCII Art Banner
const banner = `
╔══════════════════════════════════════════════════════════════╗
║                    ViciDial Monitor CLI                     ║
╠══════════════════════════════════════════════════════════════╣
║ Developer: ${cyan('Mr. Zohaib')}                                    ║
║ Version: ${green('1.0.0')}                                               ║
║ Description: Professional ViciDial Monitoring System          ║
╚══════════════════════════════════════════════════════════════╝
`;

program
  .name('vicidial-monitor')
  .description('Professional CLI for ViciDial Monitoring System')
  .version('1.0.0', '-v, --version', 'Display version number')
  .helpOption('-h, --help', 'Display help for command');

// Display banner when no command is provided
if (process.argv.length <= 2) {
  console.log(cyan(banner));
  console.log(yellow('Usage: vicidial-monitor <command> [options]'));
  console.log('Run "vicidial-monitor --help" for more information.');
  process.exit(0);
}

// Start command
program
  .command('start')
  .description('Start the ViciDial monitor server')
  .option('-p, --port <port>', 'Port to run the server on', '3000')
  .option('-d, --dev', 'Run in development mode', false)
  .action(startCommand);

// Status command
program
  .command('status')
  .description('Show system status and statistics')
  .action(statusCommand);

// Stats command
program
  .command('stats')
  .description('Show database statistics')
  .option('-d, --days <days>', 'Number of days to analyze', '30')
  .option('-j, --json', 'Output in JSON format', false)
  .action(statsCommand);

// Health command
program
  .command('health')
  .description('Perform system health check')
  .action(healthCommand);

// Monitor command
program
  .command('monitor')
  .description('Real-time monitoring dashboard')
  .option('-r, --refresh <seconds>', 'Refresh interval in seconds', '5')
  .action(monitorCommand);

// FIX: Register the dashboard command
program
  .command('dashboard')
  .description('Professional terminal dashboard with fixed layout')
  .action(dashboardCommand);

// Error handling
program.exitOverride();

process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error.message);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection:', reason);
  process.exit(1);
});

// Parse command line arguments
program.parse();

module.exports = program;
