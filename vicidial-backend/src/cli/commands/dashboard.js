
const chalk = require('chalk');
const os = require('os');
const { newAscii } = require('../../utils/art');
const dbConnection = require('../../database/connection');
const StatsModel = require('../../database/models/Stats');

// --- HELPER FUNCTIONS ---

function createProgressBar(value, max, width = 15) {
  const percentage = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  const filled = Math.round((width * percentage) / 100);
  let bar = '';
  for (let i = 0; i < width; i++) {
    if (i < filled) {
      if (percentage < 40) bar += chalk.green('█');
      else if (percentage < 75) bar += chalk.yellow('█');
      else bar += chalk.red('█');
    } else {
      bar += chalk.gray('░');
    }
  }
  const percentageString = `${percentage.toFixed(1)}%`.padStart(6, ' ');
  return `${bar} ${percentageString}`;
}

function createSparkline(history, width = 10) {
    const sparks = [' ', '▂', '▃', '▄', '▅', '▆', '▇', '█'];
    const max = Math.max(...history);
    if (history.length === 0) return ' '.repeat(width);
    let line = history.slice(-width).map(v => sparks[Math.round((v / (max || 1)) * (sparks.length - 1))]).join('');
    return line.padEnd(width);
}

function getTrend(current, previous) {
    if (current > previous) return chalk.green.bold('↑');
    if (current < previous) return chalk.red.bold('↓');
    return ' ';
}

// --- MAIN DASHBOARD FUNCTION ---

module.exports = async function dashboard() {
  process.stdout.write('\x1b[?25l'); // Hide cursor

  try {
    await dbConnection.connect();
  } catch (e) {
    console.error(chalk.red('Fatal Error: Could not connect to the database.'));
    console.error(e);
    process.exit(1);
  }

  const cleanup = async () => {
    process.stdin.pause();
    await dbConnection.close();
    console.clear();
    process.stdout.write('\x1b[?25h'); // Show cursor
    console.log(chalk.cyan.bold('Vici Monitor Closed.'));
    process.exit(0);
  };

  process.on('SIGINT', cleanup);
  process.on('SIGTERM', cleanup);

  let frame = 0;
  let lastDataTime = null;
  let lastValues = { waitingCalls: 0, activeCalls: 0, agentsLoggedIn: 0, handledCalls: 0 };
  let waitHistory = [];

  const mainLoop = async () => {
    try {
      // --- 1. DATA FETCHING ---
      const latest = await StatsModel.getLatestRecord();
      let data, summary = {}, meta = {};
      if(latest) {
          data = JSON.parse(latest.raw_data);
          summary = data.summary || {};
          meta = data.meta || {};
          lastDataTime = new Date();
      }
      const { activeCalls = 0, agentsLoggedIn = 0, agentsInCalls = 0, waitingCalls = 0, handledCalls = 0 } = summary;
      const { dialLevel = 'N/A', dialableLeads = 0 } = meta;
      
      // --- 2. DERIVED & SIMULATED METRICS ---
      const agentUtilization = agentsLoggedIn > 0 ? (agentsInCalls / agentsLoggedIn) * 100 : 0;
      const uptime = ((ms) => `${String(Math.floor(ms / 3600000)).padStart(2, '0')}h ${String(Math.floor((ms % 3600000) / 60000)).padStart(2, '0')}m ${String(Math.floor((ms % 60000) / 1000)).padStart(2, '0')}s`)(new Date() - startTime);
      const cpuUsage = 30 + Math.sin(frame * 0.1) * 15;
      const memoryUsage = 50 + Math.cos(frame * 0.08) * 20;
      const avgWaitTime = waitingCalls * (2.5 + Math.sin(frame * 0.2)) * 3; 

      waitHistory.push(waitingCalls);
      if (waitHistory.length > 30) waitHistory.shift();

      const droppedCalls = Math.max(0, (lastValues.waitingCalls - waitingCalls) - (handledCalls - lastValues.handledCalls));
      const asr = (handledCalls + droppedCalls) > 0 ? (handledCalls / (handledCalls + droppedCalls)) * 100 : 0;

      // --- 3. DYNAMIC STATUS & COLOR LOGIC ---
      let systemStatus, waitTimeColor, waitingCallsColor;

      if (droppedCalls > 5 && waitingCalls < lastValues.waitingCalls) systemStatus = chalk.red.bold('High Drop-off Rate!');
      else if (waitingCalls > 10) systemStatus = chalk.red.bold('High Queue Load!');
      else if (waitingCalls > 5) systemStatus = chalk.yellow('Queue Rising');
      else if (dialableLeads < 100 && parseFloat(dialLevel) > 3) systemStatus = chalk.yellow.bold('Leads Low for Dial Level!');
      else if (agentUtilization < 30 && agentsLoggedIn > 1) systemStatus = chalk.yellow('Low Agent Utilization');
      else systemStatus = chalk.green('Nominal');

      if(avgWaitTime > 120) waitTimeColor = chalk.red.bold;
      else if(avgWaitTime > 60) waitTimeColor = chalk.yellow;
      else waitTimeColor = chalk.white;

      if(waitingCalls > 10) waitingCallsColor = chalk.red.bold;
      else if(waitingCalls > 0) waitingCallsColor = chalk.yellow;
      else waitingCallsColor = chalk.white;

      // --- 4. UI STRUCTURE WITH FINAL POLISH ---
      const artLines = newAscii.split('\n');
      const artWidth = 55;
      const sidePadding = ' '.repeat(2);
      const separator = chalk.gray('│');

      const dataRows = [
        { header: chalk.magenta.bold.underline('Vitals') },
        { label: '  Status', value: systemStatus },
        { label: '  Dial Level', value: chalk.cyan(dialLevel) },
        { label: '  Dialable Leads', value: chalk.white(dialableLeads.toLocaleString()) },
        { spacer: true },
        { header: chalk.magenta.bold.underline('Live Metrics') },
        { label: '  Agents Logged In', value: `${chalk.white(agentsLoggedIn.toString())} ${getTrend(agentsLoggedIn, lastValues.agentsLoggedIn)}` },
        { label: '  Active Calls', value: `${chalk.yellow(activeCalls.toString())} ${getTrend(activeCalls, lastValues.activeCalls)}` },
        { label: chalk.yellow.bold('  Calls Waiting'), value: `${waitingCallsColor(waitingCalls.toString())} ${createSparkline(waitHistory)} ${getTrend(waitingCalls, lastValues.waitingCalls)}` },
        { label: '  Avg. Wait Time', value: waitTimeColor(`${Math.floor(avgWaitTime / 60)}m ${Math.floor(avgWaitTime % 60)}s`) },
        { label: '  Agent Utilization', value: createProgressBar(agentUtilization, 100) },
        { label: '  Answer Rate (ASR)', value: createProgressBar(asr, 100) },
        { spacer: true },
        { header: chalk.magenta.bold.underline('System') },
        { label: '  Uptime', value: chalk.white(uptime) },
        { label: '  OS', value: chalk.white(os.type()) },
        { label: '  Node', value: chalk.white(process.version) },
        { label: '  CPU', value: createProgressBar(cpuUsage, 100) },
        { label: '  Memory', value: createProgressBar(memoryUsage, 100) },
      ];
      
      const maxLabelWidth = Math.max(...dataRows.filter(r => r.label).map(r => r.label.replace(/\u001b\[[0-9;]*m/g, '').length));

      // --- 5. RENDER FRAME ---
      const output = [];
      const numLines = Math.max(artLines.length, dataRows.length);

      for (let i = 0; i < numLines; i++) {
        const artLine = artLines[i] ? artLines[i].padEnd(artWidth) : ' '.repeat(artWidth);
        let dataLine = '';
        const row = dataRows[i];
        if (row) {
          if (row.header) dataLine = row.header;
          else if (row.spacer) dataLine = '';
          else if (row.label) {
            const plainLabel = row.label.replace(/\u001b\[[0-9;]*m/g, '');
            const padding = ' '.repeat(maxLabelWidth - plainLabel.length);
            dataLine = `${row.label}${padding}  ${row.value}`;
          }
        }
        output.push(artLine + sidePadding + separator + sidePadding + dataLine);
      }
      
      console.clear();
      console.log(output.join('\n'));

      // --- 6. FOOTER ---
      let dataFeedStatus;
      if(lastDataTime === null) dataFeedStatus = chalk.red('● No Data');
      else {
          const secondsAgo = Math.floor((new Date() - lastDataTime) / 1000);
          if(secondsAgo > 10) dataFeedStatus = chalk.red(`● Stale (${secondsAgo}s)`);
          else if(secondsAgo > 3) dataFeedStatus = chalk.yellow(`● Delayed (${secondsAgo}s)`);
          else dataFeedStatus = chalk.blue(`● Live`);
      }
      const currentTime = new Date().toLocaleTimeString();
      const statusLine = chalk.gray(`[ ${currentTime} | Data Feed: ${dataFeedStatus} | ${chalk.red('ESC to Exit')} ]`);
      console.log('\n' + statusLine);

      // --- 7. UPDATE STATE FOR NEXT FRAME ---
      lastValues = { waitingCalls, activeCalls, agentsLoggedIn, handledCalls };
      frame++;
      
    } catch (error) {
      console.clear();
      console.log(chalk.red.bold('A critical error occurred:'));
      console.log(chalk.gray(error.stack));
      await cleanup();
    } 
  };

  // --- RUN LOOP ---
  const interval = setInterval(mainLoop, 1000); // Increased refresh rate for smoother sparklines

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
