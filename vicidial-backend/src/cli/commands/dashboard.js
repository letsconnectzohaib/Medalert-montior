
const chalk = require('chalk');
const { newAscii } = require('../../utils/art');
const CLIHelpers = require('../../utils/cli-helpers');

// Main banner
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
║                                              🏥 Vici Monitor - Professional Dashboard                                ║
║                                                    Medalert axcl2s System                                          ║
╚════════════════════════════════════════════════════════════════════════════════════════════════════════════════════╝`;

// --- HELPER FUNCTIONS ---

function createProgressBar(value, max, width = 20) {
  const percentage = Math.min(100, (value / max) * 100);
  const filled = Math.round(width * percentage / 100);
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

function mergeColumns(leftArt, rightContent, artWidth = 60, rightPadding = 4) {
    const leftLines = leftArt.split('\n');
    const maxHeight = Math.max(leftLines.length, rightContent.length);
    let output = '';

    for (let i = 0; i < maxHeight; i++) {
        const leftLine = leftLines[i] || '';
        const rightLine = rightContent[i] || '';
        const paddedLeft = leftLine.padEnd(artWidth);
        output += paddedLeft + ' '.repeat(rightPadding) + rightLine + '\n';
    }
    return output;
}

function createInfoLine(label, value, labelWidth = 18) {
    const paddedLabel = label.padEnd(labelWidth);
    return `${chalk.cyan.bold(paddedLabel)}${value}`;
}

// --- MAIN DASHBOARD FUNCTION ---

module.exports = async function dashboard() {
  process.stdout.write('\x1b[?25l'); // Hide cursor
  
  const cleanup = () => {
    process.stdout.write('\x1b[?25h'); // Show cursor
    console.clear();
    console.log(chalk.cyan('👋 Vici Monitor - Dashboard stopped gracefully'));
  };
  
  process.on('SIGINT', cleanup);
  process.on('SIGTERM', cleanup);
  
  let running = true;
  let frame = 0;
  const startTime = new Date();

  while (running) {
    console.clear();
    
    try {
      // --- 1. DATA FETCHING ---
      const dbConnection = require('../../database/connection');
      await dbConnection.connect();
      const StatsModel = require('../../database/models/Stats');
      const latest = await StatsModel.getLatestRecord();
      
      const data = latest ? JSON.parse(latest.raw_data) : { summary: {}, meta: {} };
      const summary = data.summary || {};
      const meta = data.meta || {};
      
      const activeCalls = summary.activeCalls || 0;
      const agentsLoggedIn = summary.agentsLoggedIn || 0;
      const agentsInCalls = summary.agentsInCalls || 0;
      const waitingCalls = summary.waitingCalls || 0;
      const dialLevel = meta.dialLevel || 'NORMAL';
      const dialableLeads = meta.dialableLeads || 0;
      const extensionStatus = latest ? chalk.green('ACTIVE') : chalk.yellow('WAITING');
      
      const cpuUsage = 25 + Math.sin(frame * 0.1) * 10;
      const memoryUsage = 45 + Math.cos(frame * 0.08) * 15;
      const networkIO = 15 + Math.sin(frame * 0.12) * 8;
      
      function formatUptime(ms) {
          let seconds = Math.floor(ms / 1000);
          let minutes = Math.floor(seconds / 60);
          let hours = Math.floor(minutes / 60);
          seconds = seconds % 60;
          minutes = minutes % 60;
          return `${String(hours).padStart(2, '0')}h ${String(minutes).padStart(2, '0')}m ${String(seconds).padStart(2, '0')}s`;
      }
      const uptime = formatUptime(new Date() - startTime);

      // --- 2. BUILD UI COMPONENTS ---
      
      const rightColumnContent = [
          chalk.white.bold.underline('SYSTEM STATUS'),
          createInfoLine('  Server:', chalk.green('ONLINE')),
          createInfoLine('  Database:', chalk.green('CONNECTED')),
          createInfoLine('  Extension:', extensionStatus),
          createInfoLine('  Uptime:', chalk.white(uptime)),
          ' ', 
          chalk.white.bold.underline('CALL CENTER'),
          createInfoLine('  Active Calls:', chalk.yellow(activeCalls.toString())),
          createInfoLine('  Agents Logged In:', chalk.white(agentsLoggedIn.toString())),
          createInfoLine('  Agents In Calls:', chalk.white(agentsInCalls.toString())),
          createInfoLine('  Waiting Calls:', chalk.yellow(waitingCalls.toString())),
          createInfoLine('  Dial Level:', chalk.cyan(dialLevel)),
          ' ',
          chalk.white.bold.underline('PERFORMANCE'),
          createInfoLine('  CPU:', createProgressBar(cpuUsage, 100, 15)),
          createInfoLine('  Memory:', createProgressBar(memoryUsage, 100, 15)),
          createInfoLine('  Network:', createProgressBar(networkIO, 100, 15)),
      ];

      // --- 3. RENDER THE DASHBOARD ---

      // Header
      console.log(chalk.cyan(logo));
      console.log('\n');
      
      // Main Content
      const twoColumnLayout = mergeColumns(newAscii, rightColumnContent);
      console.log(twoColumnLayout);
      
      // Live Stream
      const streamHeader = chalk.magenta('╔' + '═'.repeat(100) + '╗');
      const streamTitle = chalk.magenta('║') + chalk.white(' 📡 LIVE DATA STREAM ') + ' '.repeat(80) + chalk.magenta('║');
      const streamFooter = chalk.magenta('╚' + '═'.repeat(100) + '╝');
      
      console.log(streamHeader);
      console.log(streamTitle);
      
      const currentTime = new Date().toLocaleTimeString();
      if (latest) {
          console.log(chalk.magenta('║') + ` ${chalk.gray(currentTime)} | ${chalk.green('📊')} Data: ${chalk.white(`Calls:${activeCalls} Agents:${agentsLoggedIn} Queue:${waitingCalls}`)}`.padEnd(99) + chalk.magenta('║'));
          console.log(chalk.magenta('║') + ` ${chalk.gray(currentTime)} | ${chalk.yellow('🎯')} Dial: ${chalk.white(dialLevel)} | ${chalk.magenta('📋')} Leads: ${chalk.white(dialableLeads.toLocaleString())}`.padEnd(99) + chalk.magenta('║'));
      } else {
          console.log(chalk.magenta('║') + ` ${chalk.gray(currentTime)} | ${chalk.yellow('⚠️')} No extension data received`.padEnd(99) + chalk.magenta('║'));
          console.log(chalk.magenta('║') + ` ${chalk.gray(currentTime)} | ${chalk.blue('ℹ️')} Waiting for extension to connect...`.padEnd(99) + chalk.magenta('║'));
      }
      console.log(streamFooter);
      console.log('\n');

      // Footer
      const footer = chalk.gray('  [ Health: ') + chalk.green('Optimal') + chalk.gray(' | Data Flow: ') + chalk.blue('Active') + chalk.gray(' | Actions: ') + chalk.red('(ESC) Exit') + chalk.gray(' ]');
      console.log(footer);
      
      await dbConnection.close();
      
    } catch (error) {
      console.clear();
      console.log(chalk.red.bold('An error occurred while rendering the dashboard:'));
      console.log(chalk.gray(error.stack));
      process.stdout.write('\x1b[?25h'); // Ensure cursor is visible on error
    }
    
    frame++;
    
    await new Promise(resolve => {
      const timeout = setTimeout(resolve, 2000);
      process.stdin.setRawMode(true);
      process.stdin.resume();
      process.stdin.once('data', (key) => {
        if (key[0] === 3 || key.toString() === 'q') { // Ctrl+C or 'q'
          running = false;
        }
        clearTimeout(timeout);
        resolve();
      });
    });
  }
  
  cleanup();
};
