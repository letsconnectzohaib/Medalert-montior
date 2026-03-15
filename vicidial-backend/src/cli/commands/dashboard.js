
const chalk = require('chalk');
const os = require('os');
const { newAscii } = require('../../utils/art');
const dbConnection = require('../../database/connection');
const StatsModel = require('../../database/models/Stats');

// --- HELPER FUNCTIONS ---

function createProgressBar(value, max, width = 12) {
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

    const boxWidth = 80;
    const stoppedMsg = 'Vici Monitor Stopped Gracefully';
    const systemMsg = 'Medalert axcl2s System';
    const stoppedPadding = ' '.repeat(Math.floor((boxWidth - stoppedMsg.length) / 2));
    const systemPadding = ' '.repeat(Math.floor((boxWidth - systemMsg.length) / 2));

    console.log('');
    console.log(chalk.gray('╔' + '═'.repeat(boxWidth) + '╗'));
    console.log(chalk.gray('║' + stoppedPadding + chalk.bold.cyan(stoppedMsg) + stoppedPadding + '║'));
    console.log(chalk.gray('║' + systemPadding + chalk.dim(systemMsg) + systemPadding + '║'));
    console.log(chalk.gray('╚' + '═'.repeat(boxWidth) + '╝'));
    console.log('');

    process.exit(0);
  };

  process.on('SIGINT', cleanup);
  process.on('SIGTERM', cleanup);

  let frame = 0;
  let lastDataTime = null;
  let lastValues = { waitingCalls: 0, handledCalls: 0 };
  let peakWaiting = 0;
  const AVG_HANDLE_TIME_SECONDS = 180; // Assumed average handle time
  const startTime = new Date(); // FIX: Initialize startTime

  const mainLoop = async () => {
    try {
      // --- 1. DATA FETCHING ---
      const latest = await StatsModel.getLatestRecord();
      let summary = {}, meta = {};
      if(latest) {
          const data = JSON.parse(latest.raw_data);
          summary = data.summary || {};
          meta = data.meta || {};
          lastDataTime = new Date();
      }
      const { agentsLoggedIn = 0, agentsInCalls = 0, agentsPaused = 0, waitingCalls = 0, handledCalls = 0 } = summary;
      const { dialLevel = 'N/A', dialableLeads = 0 } = meta;
      
      // --- 2. DERIVED & SIMULATED METRICS ---
      const agentsAvailable = agentsLoggedIn - agentsInCalls - agentsPaused;
      const uptime = ((ms) => `${String(Math.floor(ms / 3600000)).padStart(2, '0')}h ${String(Math.floor((ms % 3600000) / 60000)).padStart(2, '0')}m ${String(Math.floor((ms % 60000) / 1000)).padStart(2, '0')}s`)(new Date() - startTime);
      const droppedCalls = Math.max(0, (lastValues.waitingCalls - waitingCalls) + (handledCalls - lastValues.handledCalls));
      const asr = (handledCalls + droppedCalls) > 0 ? (handledCalls / (handledCalls + droppedCalls)) * 100 : 100;
      const ttcSeconds = agentsAvailable > 0 ? (waitingCalls * AVG_HANDLE_TIME_SECONDS) / agentsAvailable : Infinity;
      if(waitingCalls > peakWaiting) peakWaiting = waitingCalls;

      // --- 3. DYNAMIC STATUS & COLOR LOGIC ---
      let masterStatus, secondaryStatus = '';
      if (waitingCalls > 10) masterStatus = chalk.bgRed.white.bold('  CRITICAL: HIGH QUEUE LOAD!  ');
      else if (droppedCalls > 5) masterStatus = chalk.bgRed.white.bold('  CRITICAL: HIGH DROP RATE!  ');
      else if (waitingCalls > 5) masterStatus = chalk.bgYellow.black.bold('  WARNING: QUEUE RISING  ');
      else if (dialableLeads < 50 && parseFloat(dialLevel) > 1) masterStatus = chalk.bgYellow.black.bold('  WARNING: LEADS RUNNING LOW  ');
      else masterStatus = chalk.bgGreen.black.bold('  SYSTEM NOMINAL  ');

      if(agentsAvailable === 0 && waitingCalls > 0) secondaryStatus = chalk.bgYellow.black('  No agents available to handle queue!  ');
      else if (agentsLoggedIn > 0 && (agentsPaused / agentsLoggedIn) > 0.5) secondaryStatus = chalk.bgYellow.black('  Over 50% of agents are paused.  ');

      // --- 4. UI STRUCTURE DEFINITION ---
      const artLines = newAscii.split('\n').map(line => chalk.blue.bold(line));
      const artWidth = 55;
      const sidePadding = ' '.repeat(2);
      const separator = chalk.gray('│');
      
      const ttcFormatted = isFinite(ttcSeconds) ? `${Math.floor(ttcSeconds / 60)}m ${Math.floor(ttcSeconds % 60)}s` : '∞';

      const dataRows = [
        { header: chalk.blue.bold.underline('Campaign') },
        { label: '  Dial Level', value: chalk.white(dialLevel) },
        { label: '  Dialable Leads', value: chalk.white(dialableLeads.toLocaleString()) },
        { spacer: true },
        { header: chalk.blue.bold.underline('Queue') },
        { label: '  Calls Waiting', value: `${chalk.yellow(waitingCalls.toString())} (Peak: ${peakWaiting})` },
        { label: '  Dropped Calls', value: chalk.red(droppedCalls.toString()) },
        { label: '  Est. Time to Clear', value: chalk.white(ttcFormatted) },
        { label: '  Answer Rate (ASR)', value: createProgressBar(asr, 100) },
        { spacer: true },
        { header: chalk.blue.bold.underline('Agents') },
        { label: '  Available', value: chalk.green(agentsAvailable.toString()) },
        { label: '  In-Call', value: chalk.yellow(agentsInCalls.toString()) },
        { label: '  Paused', value: chalk.red(agentsPaused.toString()) },
        { spacer: true },
        { header: chalk.blue.bold.underline('System') },
        { label: '  Uptime', value: chalk.white(uptime) },
        { label: '  OS', value: chalk.white(os.type()) },
        { label: '  Node', value: chalk.white(process.version) },
      ];
      
      const maxLabelWidth = Math.max(...dataRows.filter(r => r.label).map(r => r.label.length));

      // --- 5. RENDER FRAME ---
      const output = [masterStatus];
      if(secondaryStatus) output.push(secondaryStatus);
      const numLines = Math.max(artLines.length, dataRows.length);

      for (let i = 0; i < numLines; i++) {
        const artLine = artLines[i] ? artLines[i].padEnd(artWidth) : ' '.repeat(artWidth);
        let dataLine = '';
        const row = dataRows[i];
        if (row) {
          if (row.header) dataLine = row.header;
          else if (row.spacer) dataLine = '';
          else if (row.label) {
            const padding = ' '.repeat(maxLabelWidth - row.label.length);
            dataLine = `${chalk.white.bold(row.label)}${padding}  ${row.value}`;
          }
        }
        output.push(artLine + sidePadding + separator + sidePadding + dataLine);
      }
      
      console.clear();
      console.log(output.join('\n'));

      // --- 6. FOOTER ---
      let dataFeedStatus;
      if (!lastDataTime) dataFeedStatus = chalk.red('● No Data');
      else {
          const secondsAgo = Math.floor((new Date() - lastDataTime) / 1000);
          if(secondsAgo > 10) dataFeedStatus = chalk.red(`● Stale (${secondsAgo}s)`);
          else if(secondsAgo > 3) dataFeedStatus = chalk.yellow(`● Delayed (${secondsAgo}s)`);
          else dataFeedStatus = chalk.blue(`● Live`);
      }
      const currentTime = new Date().toLocaleTimeString();
      const statusLine = chalk.gray(`[ ${currentTime} | ${dataFeedStatus} | Frames: ${frame} | ${chalk.red('ESC to Exit')} ]`);
      console.log('\n' + statusLine);

      // --- 7. UPDATE STATE ---
      lastValues = { waitingCalls, handledCalls };
      frame++;
      
    } catch (error) {
      console.clear();
      console.log(chalk.red.bold('A critical error occurred:'));
      console.log(chalk.gray(error.stack));
      await cleanup();
    } 
  };

  const interval = setInterval(mainLoop, 1000);
  process.stdin.setRawMode(true);
  process.stdin.resume();
  process.stdin.on('data', (key) => {
    const char = key.toString();
    if (char === '\u0003' || char === 'q' || char === '\u001b') {
      clearInterval(interval);
      cleanup();
    }
  });

  await mainLoop();
};
