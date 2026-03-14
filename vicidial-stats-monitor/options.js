// options.js - Settings logic

document.addEventListener('DOMContentLoaded', async () => {
    // Load settings
    const settings = await Utils.storage.loadSettings();

    document.getElementById('waitingCallsThreshold').value = settings.waitingCallsThreshold;
    document.getElementById('pausedAgentsThreshold').value = settings.pausedAgentsThreshold;
    document.getElementById('slackWebhookUrl').value = settings.slackWebhookUrl || '';
    document.getElementById('slackChannel').value = settings.slackChannel || '#general';
    document.getElementById('refreshRate').value = settings.refreshRate;
    document.getElementById('debugMode').checked = settings.debugMode;

    // Test Slack
    document.getElementById('testSlack').addEventListener('click', async () => {
        const webhookUrl = document.getElementById('slackWebhookUrl').value;
        if (!webhookUrl) {
            alert('Please enter a Webhook URL first.');
            return;
        }

        const status = document.getElementById('status');
        status.textContent = 'Sending test message...';
        status.style.color = '#fff';

        try {
            const response = await fetch(webhookUrl, {
                method: 'POST',
                body: JSON.stringify({
                    text: "🔔 *Test Notification from Vicidial Monitor*\nYour Slack integration is working correctly!"
                })
            });

            if (response.ok) {
                status.textContent = 'Test message sent successfully!';
                status.style.color = '#4CAF50';
            } else {
                status.textContent = 'Failed to send test message. Check URL.';
                status.style.color = '#f44336';
            }
        } catch (error) {
            console.error(error);
            status.textContent = 'Error sending test message.';
            status.style.color = '#f44336';
        }
        
        setTimeout(() => {
            status.textContent = '';
        }, 3000);
    });

    // Save settings
    document.getElementById('save').addEventListener('click', async () => {
        const newSettings = {
            waitingCallsThreshold: parseInt(document.getElementById('waitingCallsThreshold').value),
            pausedAgentsThreshold: parseInt(document.getElementById('pausedAgentsThreshold').value),
            slackWebhookUrl: document.getElementById('slackWebhookUrl').value,
            slackChannel: document.getElementById('slackChannel').value,
            refreshRate: parseInt(document.getElementById('refreshRate').value),
            debugMode: document.getElementById('debugMode').checked
        };

        await Utils.storage.saveSettings(newSettings);

        // Notify user
        const status = document.getElementById('status');
        status.textContent = 'Settings saved successfully!';
        setTimeout(() => {
            status.textContent = '';
        }, 2000);
    });
});
