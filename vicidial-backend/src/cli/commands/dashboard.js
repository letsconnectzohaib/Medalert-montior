
const chalk = require('chalk');
const os = require('os');
const { execSync } = require('child_process');
const { newAscii } = require('../../utils/art');
const dbConnection = require('../../database/connection');
const StatsModel = require('../../database/models/Stats');

let lastCpuInfo = null;

function getCpuUsage() {
    const cpus = os.cpus();
    let totalIdle = 0, totalTick = 0;
    for (const cpu of cpus) {
        for (const type in cpu.times) totalTick += cpu.times[type];
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
    const bar = chalk.yellow('█'.repeat(filled)) + chalk.gray('░'.repeat(width - filled));
    const percentageString = `${value.toFixed(1)}%`.padStart(7, ' ');
    return `${bar} ${percentageString}`;
}

module.exports = async function dashboard() {
    const REQUIRED_COLS = 140;
    const REQUIRED_ROWS = 40;

    if (os.platform() === 'win32') {
        try {
            execSync(`mode con: cols=${REQUIRED_COLS} lines=${REQUIRED_ROWS}`);
        } catch (error) {
            console.warn(chalk.yellow('Failed to auto-resize terminal. Please adjust manually.'));
        }
    }

    process.stdout.write('\x1b[?25l'); // Hide cursor
    if (process.stdout.columns < REQUIRED_COLS || process.stdout.rows < REQUIRED_ROWS) {
        console.error(chalk.red(`Terminal size must be at least ${REQUIRED_COLS}x${REQUIRED_ROWS}.`));
        console.error(chalk.yellow(`Current size: ${process.stdout.columns}x${process.stdout.rows}. Please resize and try again.`));
        process.exit(1);
    }

    try {
        await dbConnection.connect();
    } catch (e) {
        process.exit(1);
    }

    const startTime = new Date();
    const cleanup = async () => {
        await dbConnection.close();
        console.clear();
        process.stdout.write('\x1b[?25h');
        process.exit(0);
    };

    process.on('SIGINT', cleanup).on('SIGTERM', cleanup);

    const mainLoop = async () => {
        try {
            const latest = await StatsModel.getLatestRecord();
            const summary = latest ? JSON.parse(latest.raw_data).summary || {} : {};
            const meta = latest ? JSON.parse(latest.raw_data).meta || {} : {};

            const {
                agentsLoggedIn = 0, agentsInCalls = 0, callsWaiting = 0, activeCalls = 0
            } = summary;
            const { dialLevel = 'NORMAL', dialableLeads = 0 } = meta;

            const uptimeMs = new Date() - startTime;
            const uptime = `${String(Math.floor(uptimeMs / 3600000)).padStart(2, '0')}h ${String(Math.floor((uptimeMs % 3600000) / 60000)).padStart(2, '0')}m ${String(Math.floor((uptimeMs % 60000) / 1000)).padStart(2, '0')}s`;
            const memUsage = (1 - os.freemem() / os.totalmem()) * 100;
            const cpuUsage = getCpuUsage();

            console.clear();

            const artLines = newAscii.split('\n').map(line => chalk.white(line));
            const artWidth = 60;
            const dataColumnWidth = 45;
            const leftPadding = ' '.repeat(4);
            const separator = '   ' + chalk.gray('│') + '   ';

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
                        const labelStr = `  ${row.label}`;
                        if (row.label === 'CPU' || row.label === 'Memory') {
                            const labelPart = chalk.gray(labelStr.padEnd(20));
                            dataLine = `${labelPart}${row.value}`;
                        } else {
                            const valueStr = row.value.toString();
                            const labelPart = chalk.gray(labelStr);
                            const valuePart = row.color ? row.color(valueStr) : chalk.white(valueStr);
                            const paddingWidth = dataColumnWidth - labelPart.length - valueStr.length - 2;
                            const padding = ' '.repeat(Math.max(1, paddingWidth));
                            dataLine = `${labelPart}${padding}${valuePart}`;
                        }
                    }
                }
                output.push(leftPadding + artLine + separator + dataLine);
            }
            console.log(output.join('\n'));

            const healthStatus = 'Optimal';
            const dataStatus = 'Active';
            const footerContent = `[ ${new Date().toLocaleTimeString()} | Health: ${chalk.green(healthStatus)} | Data: ${chalk.cyan(dataStatus)} | Calls: ${activeCalls} | Agents: ${agentsLoggedIn} | Queue: ${callsWaiting} | Leads: ${dialableLeads} | ${chalk.red('ESC to Exit')} ]`;
            const totalWidth = artWidth + separator.length + dataColumnWidth;
            console.log('\n' + leftPadding + chalk.gray(footerContent.padEnd(totalWidth)));

        } catch (error) {
            await cleanup();
        }
    };

    const interval = setInterval(mainLoop, 1500);

    process.stdin.setRawMode(true).resume().on('data', (key) => {
        if (key.toString() === '\u0003' || key.toString() === 'q' || key.toString() === '\u001b') {
            clearInterval(interval);
            cleanup();
        }
    });

    await mainLoop();
};
