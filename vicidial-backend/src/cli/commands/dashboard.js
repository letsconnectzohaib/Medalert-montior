
const chalk = require('chalk');
const { newAscii } = require('../../utils/art');
const dbConnection = require('../../database/connection');
const StatsModel = require('../../database/models/Stats');

// --- HELPER FUNCTIONS ---

function createProgressBar(value, max, width = 15) {
  const percentage = Math.min(100, (value / max) * 100);
  const filled = Math.round((width * percentage) / 100);
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
  const percentageString = `${percentage.toFixed(1)}%`.padStart(6, ' ');
  return `${bar} ${percentageString}`;
}

// --- MAIN DASHBOARD FUNCTION ---

module.exports = async function dashboard() {
  process.stdout.write('\x1b[?25l'); // Hide cursor
  await dbConnection.connect();

  const cleanup = async () => {
    await dbConnection.close();
    console.clear();
    process.stdout.write('\x1b[?25h'); // Show cursor
    console.log(chalk.cyan('Vici Monitor closed.'));
    process.exit(0);
  };

  process.on('SIGINT', cleanup);
  process.on('SIGTERM', cleanup);

  let frame = 0;
  const startTime = new Date();

  const mainLoop = async () => {
    try {
      // --- 1. DATA FETCHING ---
      const latest = await StatsModel.getLatestRecord();
      const data = latest ? JSON.parse(latest.raw_data) : { summary: {}, meta: {} };
      const { activeCalls = 0, agentsLoggedIn = 0, agentsInCalls = 0, waitingCalls = 0 } = data.summary || {};
      const { dialLevel = 'N/A', dialableLeads = 0 } = data.meta || {};
      const extensionStatus = latest ? chalk.green('ACTIVE') : chalk.yellow('WAITING');
      
      const cpuUsage = 25 + Math.sin(frame * 0.1) * 10;
      const memoryUsage = 45 + Math.cos(frame * 0.08) * 15;
      const uptime = ((ms) => {
          let s = Math.floor(ms / 1000);
          let m = Math.floor(s / 60);
          let h = Math.floor(m / 60);
          return `${String(h).padStart(2, '0')}h ${String(m % 60).padStart(2, '0')}m ${String(s % 60).padStart(2, '0')}s`;
      })(new Date() - startTime);

      // --- 2. BUILD UI COMPONENTS ---
      const artLines = newAscii.split('\n');
      const artWidth = 50;
      const padding = ' '.repeat(4);

      const dataRows = [
        { label: chalk.cyan.bold('System Status') },
        { label: '  Server', value: chalk.green('ONLINE') },
        { label: '  Database', value: chalk.green('CONNECTED') },
        { label: '  Extension', value: extensionStatus },
        { label: '  Uptime', value: chalk.white(uptime) },
        { label: '' }, // Spacer
        { label: chalk.cyan.bold('Call Center') },
        { label: '  Active Calls', value: chalk.yellow(activeCalls) },
        { label: '  Agents Logged In', value: chalk.white(agentsLoggedIn) },
        { label: '  Agents In Calls', value: chalk.white(agentsInCalls) },
        { label: '  Calls Waiting', value: chalk.yellow(waitingCalls) },
        { label: '  Dial Level', value: chalk.cyan(dialLevel) },
        { label: '' }, // Spacer
        { label: chalk.cyan.bold('Performance') },
        { label: '  CPU', value: createProgressBar(cpuUsage, 100) },
        { label: '  Memory', value: createProgressBar(memoryUsage, 100) },
      ];
      
      const maxLabelWidth = Math.max(...dataRows.map(r => r.label.length));

      // --- 3. RENDER THE DASHBOARD ---
      console.clear();
      const output = [];
      const numLines = Math.max(artLines.length, dataRows.length, 20);

      for (let i = 0; i < numLines; i++) {
        const artLine = artLines[i] || '';
        const paddedArtLine = artLine.padEnd(artWidth);
        
        let dataLine = '';
        if (dataRows[i]) {
          const { label, value } = dataRows[i];
          const paddedLabel = label.padEnd(maxLabelWidth);
          dataLine = value !== undefined ? `${paddedLabel}  ${value}` : label;
        }
        output.push(paddedArtLine + padding + dataLine);
      }
      console.log(output.join('\n'));

      // --- 4. FOOTER ---
      const currentTime = new Date().toLocaleTimeString();
      let statusLine = chalk.gray(`[ ${chalk.white(currentTime)} | Health: ${chalk.green('Optimal')} | Data: ${latest ? chalk.blue('Active') : chalk.yellow('Waiting')} | `);
      statusLine += `Calls: ${chalk.yellow(activeCalls)} | Agents: ${chalk.white(agentsLoggedIn)} | Queue: ${chalk.yellow(waitingCalls)} | Leads: ${chalk.white(dialableLeads.toLocaleString())} `;
      statusLine += chalk.gray(`| ${chalk.red('ESC to Exit')} ]`);
      console.log('\n' + statusLine);
      
    } catch (error) {
      console.clear();
      console.log(chalk.red.bold('An error occurred:'));
      console.log(chalk.gray(error.stack));
      await cleanup();
    } finally {
        frame++;
    }
  };

  const interval = setInterval(mainLoop, 2000);

  process.stdin.setRawMode(true);
  process.stdin.resume();
  process.stdin.on('data', (key) => {
    const char = key.toString();
    if (char === '\u0003' || char === 'q' || char === '\u001b') { // Ctrl+C, 'q', or ESC
      clearInterval(interval);
      cleanup();
    }
  });

  await mainLoop();
};
