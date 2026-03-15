# Vicidial Stats Monitor Pro

A professional, modern Chrome extension for real-time monitoring of Vicidial dialer statistics with automatic Slack reporting.

## Features

- **Real-Time Dashboard**: View Active Calls, Agents Online, and Pending Calls instantly.
- **Compact UI**: Modern, dark-themed interface designed to take up minimal screen space without scrollbars.
- **Hourly Slack Reports**: Automatically sends a summary of call statistics to your private Slack channel every hour.
- **Local History**: Stores the last 90 minutes of data locally to generate accurate reports.
- **Status Indicators**: 
  - **Green Dot**: Monitoring is active and data is flowing.
  - **Red Dot**: Monitoring is paused.
  - **Yellow Dot**: Connecting or experiencing issues.
- **Toggle Control**: Easily enable or disable monitoring with a single click.

## Installation

1. Open Chrome and navigate to `chrome://extensions`.
2. Enable "Developer mode" in the top right.
3. Click "Load unpacked" and select this folder.
4. Pin the extension to your toolbar for easy access.

## Slack Configuration (Private Channel)

To enable hourly reports to a private channel:

1. **Create a Slack App**:
   - Go to [api.slack.com/apps](https://api.slack.com/apps) and click "Create New App".
   - Select "From scratch", name it (e.g., "Vicidial Monitor"), and pick your workspace.

2. **Enable Incoming Webhooks**:
   - In the left sidebar, click **Incoming Webhooks**.
   - Toggle "Activate Incoming Webhooks" to **On**.

3. **Add Webhook to Private Channel**:
   - Click **Add New Webhook to Workspace**.
   - **Important**: If your private channel does not appear in the dropdown:
     1. Open your Slack desktop/web app.
     2. Go to the private channel.
     3. Type `/invite @Vicidial Monitor` (or whatever you named your app).
     4. Refresh the "Add New Webhook" page in your browser.
   - Select your private channel and click **Allow**.

4. **Configure Extension**:
   - Copy the **Webhook URL** (starts with `https://hooks.slack.com/services/...`).
   - Open the extension, go to the **Settings** tab.
   - Paste the URL into the "Webhook URL" field.
   - Click **Save Settings**.

## Usage

1. Log in to your Vicidial Real-Time Report page.
2. Click the extension icon to view stats.
3. The extension will automatically collect data and send a report every hour.

## Technical Details

- **Manifest V3**: Compliant with the latest Chrome Extension standards.
- **Efficient Scraping**: Uses throttled DOM observation to minimize performance impact on the dialer page.
- **Local Storage**: Uses `chrome.storage.local` to buffer recent stats for reporting without external databases.
