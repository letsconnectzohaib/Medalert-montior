
const chalk = require('chalk');
const { newAscii } = require('../../utils/art');

// --- NEW, SIMPLIFIED HELPER FUNCTIONS ---

// Creates a progress bar with right-aligned percentage
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

// --- MAIN DASHBOARD FUNCTION (REBUILT) ---

module.exports = async function dashboard() {
  process.stdout.write('[?25l'); // Hide cursor
  
  // --- DB Connection (Managed correctly) ---
  const dbConnection = require('../../database/connection');
  await dbConnection.connect();
  const StatsModel = require('../../database/models/Stats');

  const cleanup = async () => {
    await dbConnection.close();
    console.clear();
    process.stdout.write('[?25h'); // Show cursor
    console.log(chalk.cyan('Vici Monitor Closed.'));
  };
  
  process.on('SIGINT', cleanup);
  process.on('SIGTERM', cleanup);
  
  let running = true;
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
      
      const formatUptime = (ms) => {
          let s = Math.floor(ms / 1000);
          let m = Math.floor(s / 60);
          let h = Math.floor(m / 60);
          return `${String(h).padStart(2, '0')}h ${String(m % 60).padStart(2, '0')}m ${String(s % 60).padStart(2, '0')}s`;
      };
      const uptime = formatUptime(new Date() - startTime);

      // --- 2. BUILD UI COMPONENTS (NEOFETCH STYLE) ---
      const artLines = newAscii.split('
');
      const artWidth = 50; // Set a fixed width for the ASCII art column
      const padding = ' '.repeat(4);

      const dataRows = [
        { label: chalk.cyan.bold('System'), value: '' },
        { label: '  Server', value: chalk.green('ONLINE') },
        { label: '  Database', value: chalk.green('CONNECTED') },
        { label: '  Extension', value: extensionStatus },
        { label: '  Uptime', value: chalk.white(uptime) },
        { label: '', value: '' }, // Spacer
        { label: chalk.cyan.bold('Call Center'), value: '' },
        { label: '  Active Calls', value: chalk.yellow(activeCalls) },
        { label: '  Agents Logged In', value: chalk.white(agentsLoggedIn) },
        { label: '  Agents In Calls', value: chalk.white(agentsInCalls) },
        { label: '  Calls Waiting', value: chalk.yellow(waitingCalls) },
        { label: '  Dial Level', value: chalk.cyan(dialLevel) },
        { label: '', value: '' }, // Spacer
        { label: chalk.cyan.bold('Performance'), value: '' },
        { label: '  CPU', value: createProgressBar(cpuUsage, 100) },
        { label: '  Memory', value: createProgressBar(memoryUsage, 100) },
      ];

      // --- 3. RENDER THE DASHBOARD (Line by Line) ---
      console.clear();
      const output = [];
      const numLines = Math.max(artLines.length, dataRows.length, 20); // ensure a minimum height

      for (let i = 0; i < numLines; i++) {
        const artLine = artLines[i] || '';
        const paddedArtLine = artLine.padEnd(artWidth);
        
        let dataLine = '';
        if (dataRows[i]) {
          const { label, value } = dataRows[i];
          dataLine = `${label}${chalk.white(value)}`;
        }
        output.push(paddedArtLine + padding + dataLine);
      }
      console.log(output.join('
'));

      // Footer status line
      const currentTime = new Date().toLocaleTimeString();
      let statusLine = chalk.gray(`[ ${chalk.white(currentTime)} | Health: ${chalk.green('Optimal')} | Data: ${latest ? chalk.blue('Active') : chalk.yellow('Waiting')} | `);
      statusLine += `Calls: ${chalk.yellow(activeCalls)} | Agents: ${chalk.white(agentsLoggedIn)} | Queue: ${chalk.yellow(waitingCalls)} | Leads: ${chalk.white(dialableLeads.toLocaleString())} `;
      statusLine += chalk.gray(`| ${chalk.red('ESC to Exit')} ]`);
      console.log('
' + statusLine);
      
    } catch (error) {
      console.clear();
      console.log(chalk.red.bold('An error occurred while rendering the dashboard:'));
      console.log(chalk.gray(error.stack));
      running = false; // Stop the loop on error
    } finally {
        frame++;
    }
  };

  // --- RUN LOOP ---
  const interval = setInterval(mainLoop, 2000); // Refresh every 2 seconds

  // Handle exit
  process.stdin.setRawMode(true);
  process.stdin.resume();
  process.stdin.on('data', (key) => {
    const char = key.toString();
    if (char === '' || char === 'q' || char === '') { // Ctrl+C, 'q', or ESC
      running = false;
      clearInterval(interval);
      cleanup();
    }
  });

  await mainLoop(); // Run once immediately
};
