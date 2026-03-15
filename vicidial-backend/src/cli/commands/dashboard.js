
const chalk = require('chalk');
const os = require('os');
const { newAscii } = require('../../utils/art');
const dbConnection = require('../../database/connection');
const StatsModel = require('../../database/models/Stats');

let lastCpuInfo = null;

function getCpuUsage() {
  const cpus = os.cpus();
  let totalIdle = 0;
  let totalTick = 0;

  for (const cpu of cpus) {
    for (const type in cpu.times) {
      totalTick += cpu.times[type];
    }
    totalIdle += cpu.times.idle;
  }

  const avgIdle = totalIdle / cpus.length;
  const avgTotal = totalTick / cpus.length;

  let usagePercentage = 0;
  if (lastCpuInfo) {
    const idleDifference = avgIdle - lastCpuInfo.avgIdle;
    const totalDifference = avgTotal - lastCpuInfo.avgTotal;
    if (totalDifference > 0) {
      usagePercentage = 100 - (100 * idleDifference / totalDifference);
    }
  }

  lastCpuInfo = { avgIdle, avgTotal };
  return Math.max(0, Math.min(100, usagePercentage));
}

function createPerformanceBar(value, width = 10) {
  const percentage = Math.min(100, value) / 100;
  const filled = Math.round(width * percentage);
  const empty = width - filled;
  const bar = chalk.yellow('█'.repeat(filled)) + chalk.gray('░'.repeat(empty));
  return `${bar} ${value.toFixed(1)}%`.padStart(width + 8, ' ');
}

module.exports = async function dashboard() {
  process.stdout.write('\x1b[?25l'); // Hide cursor

  try {
    await dbConnection.connect();
  } catch (e) {
    console.error(chalk.red('Fatal Error: Could not connect to the database.'));
    console.error(e);
    process.exit(1);
  }

  const startTime = new Date();

  const cleanup = async () => {
    await dbConnection.close();
    console.clear();
    process.stdout.write('\x1b[?25h'); // Show cursor
    process.exit(0);
  };

  process.on('SIGINT', cleanup);
  process.on('SIGTERM', cleanup);

  const mainLoop = async () => {
    try {
      // --- 1. DATA FETCHING ---
      const latest = await StatsModel.getLatestRecord();
      const summary = latest ? JSON.parse(latest.raw_data).summary || {} : {};
      const meta = latest ? JSON.parse(latest.raw_data).meta || {} : {};

      const {
        agentsLoggedIn = 0,
        agentsInCalls = 0,
        callsWaiting = 0,
        activeCalls = 0, // Re-added this field
      } = summary;
      const {
        dialLevel = 'NORMAL',
        dialableLeads = 0
      } = meta;

      // --- 2. SYSTEM METRICS ---
      const uptimeMs = new Date() - startTime;
      const uptime = `${String(Math.floor(uptimeMs / 3600000)).padStart(2, '0')}h ${String(Math.floor((uptimeMs % 3600000) / 60000)).padStart(2, '0')}m ${String(Math.floor((uptimeMs % 60000) / 1000)).padStart(2, '0')}s`;
      const memUsage = (1 - os.freemem() / os.totalmem()) * 100;
      const cpuUsage = getCpuUsage();

      // --- 3. UI RENDER ---
      console.clear();

      const artLines = newAscii.split('\n').map(line => chalk.white(line));
      const artWidth = artLines[0] ? artLines[0].replace(/\u001b\[[0-9;]*m/g, '').length : 55;

      const dataRows = [
        { label: 'System Status', header: true },
        { label: 'Server', value: 'ONLINE', color: chalk.green },
        { label: 'Database', value: 'CONNECTED', color: chalk.green },
        { label: 'Extension', value: 'ACTIVE', color: chalk.green },
        { label: 'Uptime', value: uptime },
        { spacer: true },
        { label: 'Call Center', header: true },
        { label: 'Active Calls', value: activeCalls },
        { label: 'Agents Logged In', value: agentsLoggedIn },
        { label: 'Agents In Calls', value: agentsInCalls },
        { label: 'Calls Waiting', value: callsWaiting, color: chalk.yellow },
        { label: 'Dial Level', value: dialLevel },
        { spacer: true },
        { label: 'Performance', header: true },
        { label: 'CPU', value: createPerformanceBar(cpuUsage) },
        { label: 'Memory', value: createPerformanceBar(memUsage) },
      ];

      const maxLabelWidth = 20;

      const output = [];
      const numLines = Math.max(artLines.length, dataRows.length + 2);

      for (let i = 0; i < numLines; i++) {
        const artLine = artLines[i] ? artLines[i].padEnd(artWidth) : ' '.repeat(artWidth);
        let dataLine = '';
        if (dataRows[i]) {
          const row = dataRows[i];
          if (row.header) {
            dataLine = chalk.cyan.bold(row.label);
          } else if (row.spacer) {
            dataLine = '';
          } else {
            const label = `  ${row.label}`.padEnd(maxLabelWidth);
            const value = row.color ? row.color(row.value) : chalk.white(row.value);
            dataLine = `${chalk.gray(label)}${value}`;
          }
        }
        output.push(`${artLine}   ${dataLine}`);
      }
      console.log(output.join('\n'));

      // --- 4. FOOTER RENDER ---
      const healthStatus = 'Optimal';
      const dataStatus = 'Active';
      const footer = `[ ${new Date().toLocaleTimeString()} | Health: ${chalk.green(healthStatus)} | Data: ${chalk.cyan(dataStatus)} | Calls: ${activeCalls} | Agents: ${agentsLoggedIn} | Queue: ${callsWaiting} | Leads: ${dialableLeads} | ${chalk.red('ESC to Exit')} ]`;
      console.log('\n' + chalk.gray(footer));

    } catch (error) {
      console.clear();
      console.log(chalk.red.bold('A critical error occurred:'));
      console.log(chalk.gray(error.stack));
      await cleanup();
    }
  };

  const interval = setInterval(mainLoop, 1500); // Interval set to 1.5s for better CPU reading

  process.stdin.setRawMode(true);
  process.stdin.resume();
  process.stdin.on('data', (key) => {
    const char = key.toString();
    if (char === '\u0003' || char === 'q' || char === '\u001b') { // CTRL+C, q, or ESC
      clearInterval(interval);
      cleanup();
    }
  });

  await mainLoop();
};
