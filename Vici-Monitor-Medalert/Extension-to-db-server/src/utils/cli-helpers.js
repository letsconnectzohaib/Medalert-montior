// Handle chalk v5+ (ESM) vs v4 (CJS) compatibility
let chalk;
try {
  // Try to import chalk (might fail with v5+)
  chalk = require('chalk');
} catch (error) {
  // Fallback color functions
  chalk = {
    red: (text) => `\x1b[31m${text}\x1b[0m`,
    green: (text) => `\x1b[32m${text}\x1b[0m`,
    yellow: (text) => `\x1b[33m${text}\x1b[0m`,
    blue: (text) => `\x1b[34m${text}\x1b[0m`,
    magenta: (text) => `\x1b[35m${text}\x1b[0m`,
    cyan: (text) => `\x1b[36m${text}\x1b[0m`,
    white: (text) => `\x1b[37m${text}\x1b[0m`,
    gray: (text) => `\x1b[90m${text}\x1b[0m`,
    bold: (text) => `\x1b[1m${text}\x1b[0m`
  };
}

const boxen = require('boxen');
const Table = require('cli-table3');

class CLIHelpers {
  static success(message) {
    console.log(chalk.green(`✅ ${message}`));
  }

  static error(message) {
    console.log(chalk.red(`❌ ${message}`));
  }

  static warning(message) {
    console.log(chalk.yellow(`⚠️  ${message}`));
  }

  static info(message) {
    console.log(chalk.blue(`ℹ️  ${message}`));
  }

  static header(title) {
    console.log(chalk.cyan.bold(`\n${'='.repeat(60)}`));
    console.log(chalk.cyan.bold(`  ${title}`));
    console.log(chalk.cyan.bold(`${'='.repeat(60)}\n`));
  }

  static subheader(title) {
    console.log(chalk.yellow.bold(`\n--- ${title} ---\n`));
  }

  static createBox(content, options = {}) {
    const defaultOptions = {
      padding: 1,
      margin: 1,
      borderStyle: 'round',
      borderColor: 'cyan',
      backgroundColor: '#1a1a1a'
    };

    return boxen(content, { ...defaultOptions, ...options });
  }

  static createTable(headers, options = {}) {
    const defaultOptions = {
      head: headers.map(h => chalk.cyan(h)),
      chars: {
        'top': '═',
        'top-mid': '╤',
        'top-left': '╔',
        'top-right': '╗',
        'bottom': '═',
        'bottom-mid': '╧',
        'bottom-left': '╚',
        'bottom-right': '╝',
        'left': '║',
        'left-mid': '╟',
        'mid': '─',
        'mid-mid': '┼',
        'right': '║',
        'right-mid': '╢',
        'middle': '│'
      }
    };

    return new Table({ ...defaultOptions, ...options });
  }

  static formatBytes(bytes, decimals = 2) {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];

    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  }

  static formatUptime(seconds) {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    const parts = [];
    if (days > 0) parts.push(`${days} day${days !== 1 ? 's' : ''}`);
    if (hours > 0) parts.push(`${hours} hour${hours !== 1 ? 's' : ''}`);
    if (minutes > 0) parts.push(`${minutes} minute${minutes !== 1 ? 's' : ''}`);
    if (secs > 0 || parts.length === 0) parts.push(`${secs} second${secs !== 1 ? 's' : ''}`);

    return parts.join(', ');
  }

  static formatDateTime(dateString) {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleString();
  }

  static progressBar(percentage, width = 20) {
    const filled = Math.round(width * percentage / 100);
    const empty = width - filled;
    const filledBar = '█'.repeat(filled);
    const emptyBar = '░'.repeat(empty);
    const color = percentage >= 80 ? chalk.red : percentage >= 60 ? chalk.yellow : chalk.green;
    return color(`${filledBar}${emptyBar} ${percentage}%`);
  }

  static statusIndicator(status, text) {
    const indicators = {
      running: chalk.green('🟢'),
      stopped: chalk.red('🔴'),
      warning: chalk.yellow('🟡'),
      unknown: chalk.gray('⚪')
    };

    return `${indicators[status] || indicators.unknown} ${text}`;
  }

  static createStatusBox(title, items) {
    let content = chalk.cyan.bold(`\n${title}\n`);
    content += chalk.gray('─'.repeat(title.length + 2) + '\n\n');

    items.forEach(item => {
      const { label, value, status } = item;
      if (status) {
        content += `${this.statusIndicator(status, label)}: ${chalk.white(value)}\n`;
      } else {
        content += `${chalk.cyan(label)}: ${chalk.white(value)}\n`;
      }
    });

    return this.createBox(content, { borderColor: 'blue' });
  }

  static createStatsBox(title, stats) {
    let content = chalk.cyan.bold(`\n${title}\n`);
    content += chalk.gray('─'.repeat(title.length + 2) + '\n\n');

    Object.entries(stats).forEach(([key, value]) => {
      const formattedKey = key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
      content += `${chalk.cyan(formattedKey)}: ${chalk.white(value)}\n`;
    });

    return this.createBox(content, { borderColor: 'green' });
  }
}

module.exports = CLIHelpers;
