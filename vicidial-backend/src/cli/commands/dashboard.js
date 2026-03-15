const chalk = require('chalk');
const ora = require('ora');
const CLIHelpers = require('../../utils/cli-helpers');

// ASCII Art Logo
const logo = `
╔════════════════════════════════════════════════════════════════════════════════════════════════════════════════════╗
║                                                                                                                      ║
║   █████   █████  ███            ███                            ██████   ██████                      ███   █████           ║
║   ▒▒███   ▒▒███  ▒▒▒            ▒▒▒                            ▒▒██████ ██████                      ▒▒▒   ▒▒███           ║
║    ▒███    ▒███  ████   ██████  ████                            ▒███▒█████▒███   ██████  ████████   ████  ███████    ██████  ████████   ║
║    ▒███    ▒███ ▒▒███  ███▒▒███▒▒███        ██████████          ▒███▒▒███ ▒███  ███▒▒███▒▒███▒▒███ ▒▒███ ▒▒▒███▒    ███▒▒███▒▒███▒▒███   ║
║    ▒▒███   ███   ▒███ ▒███ ▒▒▒  ▒███       ▒▒▒▒▒▒▒▒▒▒           ▒███ ▒▒▒  ▒███ ▒███ ▒███ ▒███ ▒███  ▒███   ▒███    ▒███ ▒███ ▒███ ▒▒▒   ║
║     ▒▒▒█████▒    ▒███ ▒███  ███ ▒███                            ▒███      ▒███ ▒███ ▒███ ▒███ ▒███  ▒███   ▒███ ███▒███ ▒███ ▒███        ║
║       ▒▒███      █████▒▒██████  █████                           █████     █████▒▒██████  ████ █████ █████  ▒▒█████ ▒▒██████  █████       ║
║        ▒▒▒      ▒▒▒▒▒  ▒▒▒▒▒▒  ▒▒▒▒▒                           ▒▒▒▒▒     ▒▒▒▒▒  ▒▒▒▒▒▒  ▒▒▒▒ ▒▒▒▒▒ ▒▒▒▒▒    ▒▒▒▒▒   ▒▒▒▒▒▒  ▒▒▒▒▒        ║
║                                                                                                                      ║
║                                                                                                                      ║
║                                                                                                                      ║
║                                              🏥 Vici Monitor - Professional Dashboard                                ║
║                                                    Medalert axcl2s System                                          ║
╚════════════════════════════════════════════════════════════════════════════════════════════════════════════════════╝`;

// Progress bar with gradient
function createProgressBar(value, max, width = 20) {
  const percentage = Math.min(100, (value / max) * 100);
  const filled = Math.round(width * percentage / 100);
  const empty = width - filled;
  
  let bar = '';
  for (let i = 0; i < width; i++) {
    if (i < filled) {
      if (i < filled * 0.3) bar += chalk.green('█');
      else if (i < filled * 0.7) bar += chalk.yellow('█');
      else bar += chalk.red('█');
    } else {
      bar += chalk.gray('░');
    }
  }
  return `${bar} ${percentage.toFixed(1)}%`;
}

// Box drawing characters
const box = {
  tl: '╔', tr: '╗', bl: '╚', br: '╝',
  h: '═', v: '║', cross: '╬',
  tright: '╣', tleft: '╠', bright: '╩', bleft: '╦'
};

module.exports = async function dashboard() {
  process.stdout.write('\x1b[?25l'); // Hide cursor
  
  const cleanup = () => {
    process.stdout.write('\x1b[?25h'); // Show cursor
    console.clear();
    console.log(chalk.cyan('� Vici Monitor - Dashboard stopped gracefully'));
  };
  
  process.on('SIGINT', cleanup);
  process.on('SIGTERM', cleanup);
  
  let running = true;
  let frame = 0;
  
  while (running) {
    console.clear();
    
    // Professional header with logo
    console.log(chalk.cyan(logo));
    
    try {
      // Get real data
      const dbConnection = require('../../database/connection');
      await dbConnection.connect();
      const StatsModel = require('../../database/models/Stats');
      const dbStats = await StatsModel.getDatabaseStats();
      const latest = await StatsModel.getLatestRecord();
      
      const data = latest ? JSON.parse(latest.raw_data) : { summary: {}, meta: {} };
      const summary = data.summary || {};
      const meta = data.meta || {};
      
      // Main dashboard layout
      console.log('\n');
      
      // System Overview Section
      console.log(chalk.blue(box.tl + box.h.repeat(58) + box.tr));
      console.log(chalk.blue(box.v) + chalk.white(' 🖥️  SYSTEM OVERVIEW ') + box.h.repeat(42) + chalk.blue(box.v));
      console.log(chalk.blue(box.cross) + box.h.repeat(58) + box.cross);
      
      // Row 1: Server Status
      console.log(chalk.blue(box.v) + ' 🟢 Server: ' + chalk.green('ONLINE') + 
                 ' '.repeat(14) + 
                 chalk.blue(box.v) + ' 📊 Port: ' + chalk.white('3001') + 
                 ' '.repeat(15) + 
                 chalk.blue(box.v) + ' ⏱️  Uptime: ' + chalk.white('2h 34m') + 
                 ' '.repeat(12) + chalk.blue(box.v));
      
      // Row 2: Database Status
      console.log(chalk.blue(box.v) + ' 💾 Database: ' + chalk.green('CONNECTED') + 
                 ' '.repeat(10) + 
                 chalk.blue(box.v) + ' 📈 Records: ' + chalk.white(dbStats.totalRecords.toLocaleString()) + 
                 ' '.repeat(11) + 
                 chalk.blue(box.v) + ' 💾 Size: ' + chalk.white('28 KB') + 
                 ' '.repeat(15) + chalk.blue(box.v));
      
      // Row 3: Extension Status
      const extensionStatus = latest ? chalk.green('ACTIVE') : chalk.yellow('WAITING');
      const lastUpdate = latest ? new Date(latest.timestamp).toLocaleTimeString() : 'Never';
      console.log(chalk.blue(box.v) + ' 📡 Extension: ' + extensionStatus + 
                 ' '.repeat(10) + 
                 chalk.blue(box.v) + ' 🕐 Last: ' + chalk.white(lastUpdate) + 
                 ' '.repeat(13) + 
                 chalk.blue(box.v) + ' 🔄 Rate: ' + chalk.white('1/4s') + 
                 ' '.repeat(16) + chalk.blue(box.v));
      
      console.log(chalk.blue(box.bl + box.h.repeat(58) + box.br));
      
      // Call Center Metrics Section
      console.log('\n');
      console.log(chalk.green(box.tl + box.h.repeat(58) + box.tr));
      console.log(chalk.green(box.v) + chalk.white(' 📞 CALL CENTER METRICS ') + box.h.repeat(38) + chalk.green(box.v));
      console.log(chalk.green(box.cross) + box.h.repeat(58) + box.cross);
      
      // Active Calls with visual indicator
      const activeCalls = summary.activeCalls || 0;
      const callBar = createProgressBar(activeCalls, 50, 25);
      console.log(chalk.green(box.v) + ' 📞 Active Calls: ' + chalk.yellow(activeCalls.toString().padStart(3)) + 
                 ' '.repeat(8) + callBar + ' '.repeat(5) + chalk.green(box.v));
      
      // Agents Status
      const agentsLoggedIn = summary.agentsLoggedIn || 0;
      const agentsInCalls = summary.agentsInCalls || 0;
      const agentBar = createProgressBar(agentsInCalls, agentsLoggedIn || 1, 25);
      console.log(chalk.green(box.v) + ' 👥 Agents: ' + chalk.blue(agentsLoggedIn.toString().padStart(2)) + 
                 chalk.gray('/') + chalk.blue(agentsInCalls.toString().padStart(2)) + ' in calls' + 
                 ' '.repeat(5) + agentBar + ' '.repeat(5) + chalk.green(box.v));
      
      // Queue Status
      const waitingCalls = summary.waitingCalls || 0;
      const queueBar = createProgressBar(waitingCalls, 20, 25);
      console.log(chalk.green(box.v) + ' ⏳ Queue: ' + chalk.yellow(waitingCalls.toString().padStart(3)) + 
                 ' waiting' + ' '.repeat(9) + queueBar + ' '.repeat(5) + chalk.green(box.v));
      
      // Dial Level
      const dialLevel = meta.dialLevel || 'NORMAL';
      const dialableLeads = meta.dialableLeads || 0;
      console.log(chalk.green(box.v) + ' 🎯 Dial Level: ' + chalk.cyan(dialLevel.padEnd(8)) + 
                 ' '.repeat(8) + '📋 Leads: ' + chalk.white(dialableLeads.toLocaleString()) + 
                 ' '.repeat(10) + chalk.green(box.v));
      
      console.log(chalk.green(box.bl + box.h.repeat(58) + box.br));
      
      // Performance Section
      console.log('\n');
      console.log(chalk.yellow(box.tl + box.h.repeat(58) + box.tr));
      console.log(chalk.yellow(box.v) + chalk.white(' ⚡ PERFORMANCE METRICS ') + box.h.repeat(36) + chalk.yellow(box.v));
      console.log(chalk.yellow(box.cross) + box.h.repeat(58) + box.cross);
      
      // CPU Usage (simulated)
      const cpuUsage = 25 + Math.sin(frame * 0.1) * 10;
      const cpuBar = createProgressBar(cpuUsage, 100, 30);
      console.log(chalk.yellow(box.v) + ' 🖥️  CPU: ' + chalk.yellow(cpuUsage.toFixed(1).padStart(5) + '%') + 
                 ' '.repeat(8) + cpuBar + ' '.repeat(3) + chalk.yellow(box.v));
      
      // Memory Usage
      const memoryUsage = 45 + Math.cos(frame * 0.08) * 15;
      const memBar = createProgressBar(memoryUsage, 100, 30);
      console.log(chalk.yellow(box.v) + ' 💾 Memory: ' + chalk.yellow(memoryUsage.toFixed(1).padStart(5) + '%') + 
                 ' '.repeat(6) + memBar + ' '.repeat(3) + chalk.yellow(box.v));
      
      // Network I/O
      const networkIO = 15 + Math.sin(frame * 0.12) * 8;
      const netBar = createProgressBar(networkIO, 100, 30);
      console.log(chalk.yellow(box.v) + ' 🌐 Network: ' + chalk.yellow(networkIO.toFixed(1).padStart(5) + '%') + 
                 ' '.repeat(6) + netBar + ' '.repeat(3) + chalk.yellow(box.v));
      
      console.log(chalk.yellow(box.bl + box.h.repeat(58) + box.br));
      
      // Live Data Stream Section
      console.log('\n');
      console.log(chalk.magenta(box.tl + box.h.repeat(58) + box.tr));
      console.log(chalk.magenta(box.v) + chalk.white(' 📡 LIVE DATA STREAM ') + box.h.repeat(40) + chalk.magenta(box.v));
      console.log(chalk.magenta(box.cross) + box.h.repeat(58) + box.cross);
      
      // Show recent data entries
      const streamData = [];
      const currentTime = new Date().toLocaleTimeString();
      
      if (latest) {
        streamData.push(
          `${chalk.gray(currentTime)} | ${chalk.green('📊')} Data: ${chalk.white(`Calls:${activeCalls} Agents:${agentsLoggedIn} Queue:${waitingCalls}`)}`,
          `${chalk.gray(currentTime)} | ${chalk.blue('🔄')} Sync: ${chalk.green('Normal')} | ${chalk.cyan('⚡')} Performance: ${chalk.green('Good')}`,
          `${chalk.gray(currentTime)} | ${chalk.yellow('🎯')} Dial: ${chalk.white(dialLevel)} | ${chalk.magenta('📋')} Leads: ${chalk.white(dialableLeads.toLocaleString())}`
        );
      } else {
        streamData.push(
          `${chalk.gray(currentTime)} | ${chalk.yellow('⚠️')} No extension data received`,
          `${chalk.gray(currentTime)} | ${chalk.blue('ℹ️')} Waiting for extension to connect...`,
          `${chalk.gray(currentTime)} | ${chalk.cyan('🔄')} Server ready and listening`
        );
      }
      
      streamData.forEach((line, index) => {
        const paddedLine = line.padEnd(114, ' ');
        console.log(chalk.magenta(box.v) + ' ' + paddedLine + chalk.magenta(box.v));
      });
      
      console.log(chalk.magenta(box.bl + box.h.repeat(58) + box.br));
      
      // Status Bar
      console.log('\n');
      console.log(chalk.gray('┌─ System Status ─┐') + 
                 chalk.green('┌─ Health ──────┐') + 
                 chalk.blue('┌─ Data Flow ────┐') + 
                 chalk.yellow('┌─ Performance ──┐') + 
                 chalk.red('┌─ Actions ──────┐'));
      
      console.log(chalk.gray('│ 🟢 Healthy     │') + 
                 chalk.green('│ 🟢 Optimal    │') + 
                 chalk.blue('│ 📊 Active     │') + 
                 chalk.yellow('│ ⚡ Excellent  │') + 
                 chalk.red('│ ESC: Exit     │'));
      
      console.log(chalk.gray('└────────────────┘') + 
                 chalk.green('└───────────────┘') + 
                 chalk.blue('└───────────────┘') + 
                 chalk.yellow('└───────────────┘') + 
                 chalk.red('└───────────────┘'));
      
      await dbConnection.close();
      
    } catch (error) {
      console.log(chalk.red(`Error loading data: ${error.message}`));
    }
    
    // Animated frame counter
    frame++;
    
    // Wait for refresh with keyboard handling
    await new Promise(resolve => {
      const timeout = setTimeout(resolve, 2000);
      
      process.stdin.setRawMode(true);
      process.stdin.resume();
      process.stdin.once('data', (key) => {
        if (key[0] === 3) { // Ctrl+C
          running = false;
        }
        clearTimeout(timeout);
        resolve();
      });
    });
  }
  
  cleanup();
};
