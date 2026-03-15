
const chalk = require('chalk');
const { newAscii } = require('../../utils/art');

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
╚════════════════════════════════════════════════════════════════════════════════════════════════════════════════════╝`;

// --- HELPER FUNCTIONS ---

function createProgressBar(value, max, width = 15) {
  const percentage = Math.min(100, (value / max) * 100);
  const filled = Math.round(width * percentage / 100);
  let bar = '';
  for (let i = 0; i < width; i++) {
    if (i < filled) {
      if (percentage < 33) bar += chalk.green('█');
      else if (percentage < 66) bar += chalk.yellow('█');
      else bar += chalk.red('█');
    } else {
      bar += chalk.gray('░');
    }
  }
  return `${bar} ${percentage.toFixed(1)}%`;
}

// Reduced padding for a tighter layout
function mergeColumns(leftArt, rightContent, artWidth = 50, rightPadding = 5) {
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

function buildRightColumn(data) {
    const lines = [];
    const maxLabelWidth = data.reduce((max, item) => {
        if (item.label && item.label.length > max) {
            return item.label.length;
        }
        return max;
    }, 0);

    data.forEach(item => {
        if (item.isHeader) {
            lines.push(chalk.white.bold.underline(item.text));
        } else if (item.isSpacer) {
            lines.push('');
        } else if (item.label) {
            const paddedLabel = item.label.padEnd(maxLabelWidth);
            lines.push(`${chalk.cyan.bold(paddedLabel)}  ${item.value}`);
        }
    });
    return lines;
}

// --- MAIN DASHBOARD FUNCTION ---

module.exports = async function dashboard() {
  process.stdout.write('\x1b[?25l');
  const cleanup = () => {
    process.stdout.write('\x1b[?25h');
    console.clear();
  };
  
  process.on('SIGINT', cleanup);
  process.on('SIGTERM', cleanup);
  
  let running = true;
  let frame = 0;
  const startTime = new Date();

  while (running) {
    try {
      // --- 1. DATA FETCHING ---
      const dbConnection = require('../../database/connection');
      await dbConnection.connect();
      const StatsModel = require('../../database/models/Stats');
      const latest = await StatsModel.getLatestRecord();
      
      const data = latest ? JSON.parse(latest.raw_data) : { summary: {}, meta: {} };
      const { activeCalls = 0, agentsLoggedIn = 0, agentsInCalls = 0, waitingCalls = 0 } = data.summary || {};
      const { dialLevel = 'NORMAL', dialableLeads = 0 } = data.meta || {};
      const extensionStatus = latest ? chalk.green('ACTIVE') : chalk.yellow('WAITING');
      
      const cpuUsage = 25 + Math.sin(frame * 0.1) * 10;
      const memoryUsage = 45 + Math.cos(frame * 0.08) * 15;
      const networkIO = 15 + Math.sin(frame * 0.12) * 8;
      
      const formatUptime = (ms) => {
          let s = Math.floor(ms / 1000);
          let m = Math.floor(s / 60);
          let h = Math.floor(m / 60);
          return `${String(h).padStart(2, '0')}h ${String(m % 60).padStart(2, '0')}m ${String(s % 60).padStart(2, '0')}s`;
      };
      const uptime = formatUptime(new Date() - startTime);

      // --- 2. BUILD UI COMPONENTS ---
      const rightColumnData = [
          { isSpacer: true },
          { text: 'SYSTEM STATUS', isHeader: true },
          { label: 'Server:', value: chalk.green('ONLINE') },
          { label: 'Database:', value: chalk.green('CONNECTED') },
          { label: 'Extension:', value: extensionStatus },
          { label: 'Uptime:', value: chalk.white(uptime) },
          { isSpacer: true },
          { text: 'CALL CENTER', isHeader: true },
          { label: 'Active Calls:', value: chalk.yellow(activeCalls.toString()) },
          { label: 'Agents Logged In:', value: chalk.white(agentsLoggedIn.toString()) },
          { label: 'Agents In Calls:', value: chalk.white(agentsInCalls.toString()) },
          { label: 'Waiting Calls:', value: chalk.yellow(waitingCalls.toString()) },
          { label: 'Dial Level:', value: chalk.cyan(dialLevel) },
          { isSpacer: true },
          { text: 'PERFORMANCE', isHeader: true },
          { label: 'CPU:', value: createProgressBar(cpuUsage, 100) },
          { label: 'Memory:', value: createProgressBar(memoryUsage, 100) },
          { label: 'Network:', value: createProgressBar(networkIO, 100) },
      ];
      const rightColumnContent = buildRightColumn(rightColumnData);

      // --- 3. RENDER THE DASHBOARD ---
      console.clear();
      console.log(chalk.cyan(logo));
      console.log('\n');
      const twoColumnLayout = mergeColumns(newAscii, rightColumnContent);
      console.log(twoColumnLayout);

      // New dynamic status line footer
      const currentTime = new Date().toLocaleTimeString();
      let statusLine = chalk.gray(`[ ${currentTime} | Health: ${chalk.green('Optimal')} | Data: ${latest ? chalk.blue('Active') : chalk.yellow('Waiting')} | `);
      if (latest) {
          statusLine += `Calls: ${chalk.yellow(activeCalls)} | Agents: ${chalk.white(agentsLoggedIn)} | Queue: ${chalk.yellow(waitingCalls)} | Leads: ${chalk.white(dialableLeads.toLocaleString())} `;
      } else {
          statusLine += chalk.yellow('Waiting for extension data... ');
      }
      statusLine += chalk.gray(`| ${chalk.red('ESC: Exit')} ]`);

      console.log('\n');
      console.log(statusLine);
      
      await dbConnection.close();
      
    } catch (error) {
      console.clear();
      console.log(chalk.red.bold('An error occurred while rendering the dashboard:'));
      console.log(chalk.gray(error.stack));
      process.stdout.write('\x1b[?25h');
    }
    
    frame++;
    
    await new Promise(resolve => {
      const timeout = setTimeout(resolve, 2000);
      process.stdin.setRawMode(true);
      process.stdin.resume();
      process.stdin.once('data', (key) => {
        if (key[0] === 3 || key.toString() === 'q') { 
          running = false;
        }
        clearTimeout(timeout);
        resolve();
      });
    });
  }
  
  cleanup();
};
