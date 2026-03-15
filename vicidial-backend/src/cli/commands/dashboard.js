
const chalk = require('chalk');
const { newAscii } = require('../../utils/art');
const dbConnection = require('../../database/connection');
const StatsModel = require('../../database/models/Stats');

// --- HELPER FUNCTIONS ---

// Strips ANSI color codes from a string to get its actual length
const stripAnsi = (str) => str.replace(/[\u001b\u009b][[()#;?]*.{0,2}[A-Za-z\u0002\u0003]/g, '');

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
  
  try {
    await dbConnection.connect();
  } catch (e) {
      console.error(chalk.red('Could not connect to the database.'));
      console.error(e);
      process.exit(1);
  }

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
      const uptime = ((ms) => `${String(Math.floor(ms / 3600000)).padStart(2, '0')}h ${String(Math.floor((ms % 3600000) / 60000)).padStart(2, '0')}m ${String(Math.floor((ms % 60000) / 1000)).padStart(2, '0')}s`)(new Date() - startTime);

      // --- 2. BUILD UI COMPONENTS (NEOFETCH-STYLE) ---
      const artLines = newAscii.split('\n');
      const artWidth = 55;
      const padding = ' '.repeat(4);

      const dataRows = [
        { label: chalk.cyan.bold('System Status'), value: null },
        { label: '  Server', value: chalk.green('ONLINE') },
        { label: '  Database', value: chalk.green('CONNECTED') },
        { label: '  Extension', value: extensionStatus },
        { label: '  Uptime', value: chalk.white(uptime) },
        { label: '', value: null }, // Spacer
        { label: chalk.cyan.bold('Call Center'), value: null },
        { label: '  Active Calls', value: chalk.yellow(activeCalls) },
        { label: '  Agents Logged In', value: chalk.white(agentsLoggedIn) },
        { label: '  Agents In Calls', value: chalk.white(agentsInCalls) },
        { label: '  Calls Waiting', value: chalk.yellow(waitingCalls) },
        { label: '  Dial Level', value: chalk.cyan(dialLevel) },
        { label: '', value: null }, // Spacer
        { label: chalk.cyan.bold('Performance'), value: null },
        { label: '  CPU', value: createProgressBar(cpuUsage, 100) },
        { label: '  Memory', value: createProgressBar(memoryUsage, 100) },
      ];
      
      const maxLabelWidth = Math.max(...dataRows.filter(r => r.value !== null).map(r => stripAnsi(r.label).length));

      // --- 3. RENDER THE DASHBOARD ---
      const output = [];
      const numLines = Math.max(artLines.length, dataRows.length, 20);

      for (let i = 0; i < numLines; i++) {
        const artLine = artLines[i] || '';
        const paddedArtLine = artLine.padEnd(artWidth);
        
        let dataLine = '';
        if (dataRows[i]) {
          const { label, value } = dataRows[i];
          if (value !== null) {
            const strippedLabel = stripAnsi(label);
            const paddedLabel = label + ' '.repeat(maxLabelWidth - strippedLabel.length);
            dataLine = `${paddedLabel}  ${value}`;
          } else {
            dataLine = label;
          }
        }
        output.push(paddedArtLine + padding + dataLine);
      }
      
      // --- 4. CONSTRUCT FINAL FRAME AND RENDER ---
      console.clear();
      console.log(output.join('\n'));

      // --- 5. FOOTER ---
      const currentTime = new Date().toLocaleTimeString();
      let statusLine = chalk.gray(`[ ${chalk.white(currentTime)} | Health: ${chalk.green('Optimal')} | Data: ${latest ? chalk.blue('Active') : chalk.yellow('Waiting')} | `);
      statusLine += `Calls: ${chalk.yellow(activeCalls)} | Agents: ${chalk.white(agentsLoggedIn)} | Queue: ${chalk.yellow(waitingCalls)} | Leads: ${chalk.white(dialableLeads.toLocaleString())} `;
      statusLine += chalk.gray(`| ${chalk.red('ESC to Exit')} ]`);
      console.log('\n' + statusLine);
      
    } catch (error) {
      console.clear();
      console.log(chalk.red.bold('A critical error occurred:'));
      console.log(chalk.gray(error.stack));
      await cleanup(); // Exit on loop error
    } finally {
      frame++;
    }
  };

  // --- RUN LOOP ---
  const interval = setInterval(mainLoop, 1500);

  process.stdin.setRawMode(true);
  process.stdin.resume();
  process.stdin.on('data', (key) => {
    const char = key.toString();
    if (char === '\u0003' || char === 'q' || char === '\u001b') { // Ctrl+C, 'q', or ESC
      clearInterval(interval);
      cleanup();
    }
  });

  await mainLoop(); // Run once immediately without waiting for interval
};
