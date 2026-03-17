const cooldown = new Map(); // key -> lastMs

function canSend(key, cooldownSeconds) {
  const now = Date.now();
  const last = cooldown.get(key) || 0;
  const cd = Math.max(0, Number(cooldownSeconds || 0)) * 1000;
  if (cd && now - last < cd) return false;
  cooldown.set(key, now);
  return true;
}

function summarizeProbableCause(prob) {
  const hints = Array.isArray(prob?.hints) ? prob.hints : [];
  return hints.slice(0, 3).map((h) => h.note).join(' | ');
}

function pickRoute(slack, severity) {
  const sev = severity === 'bad' || severity === 'warn' || severity === 'info' ? severity : 'warn';
  const routes = slack?.routes || {};
  const route = routes?.[sev] || null;
  const enabled = !!slack?.enabled && !!route?.enabled;
  const webhookUrl = String(route?.webhookUrl || slack?.webhookUrl || '').trim();
  const channel = String(route?.channel || slack?.channel || '').trim();
  return { sev, enabled, webhookUrl, channel };
}

async function sendSlackWebhook({ webhookUrl, payload }) {
  if (!webhookUrl) return { success: false, error: 'missing_webhookUrl' };
  try {
    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) return { success: false, error: `HTTP ${res.status}` };
    return { success: true };
  } catch (e) {
    return { success: false, error: e?.message || 'fetch_failed' };
  }
}

async function notifySlackForAlert({ settings, alert }) {
  const slack = settings?.notifications?.slack || {};
  const sev = String(alert?.severity || 'warn');
  const route = pickRoute(slack, sev);
  if (!route.enabled) return { success: false, error: 'disabled' };
  if (!route.webhookUrl) return { success: false, error: 'missing_webhookUrl' };

  const key = `${route.sev}_${alert?.type || 'alert'}_${alert?.shift_date || ''}`;
  if (!canSend(key, slack.cooldownSeconds ?? 300)) return { success: false, error: 'cooldown' };

  const title = String(alert?.title || 'Alert');
  const shiftDate = String(alert?.shift_date || '');
  const ts = String(alert?.ts || '');
  const details = alert?.details || {};
  const probable = details?.probableCause;
  const causeText = summarizeProbableCause(probable);

  const username = String(slack.username || 'Vici Monitor Pro').trim();

  const payload = {
    username,
    ...(route.channel ? { channel: route.channel } : {}),
    text: `*[${route.sev.toUpperCase()}]* ${title}\nShift: ${shiftDate}\nTime: ${ts}${causeText ? `\nLikely: ${causeText}` : ''}`
  };

  return await sendSlackWebhook({ webhookUrl: route.webhookUrl, payload });
}

async function sendSlackTest({ settings, severity = 'warn', message }) {
  const slack = settings?.notifications?.slack || {};
  const route = pickRoute(slack, severity);
  const webhookUrl = route.webhookUrl;
  const channel = route.channel;
  const username = String(slack.username || 'Vici Monitor Pro').trim();
  const payload = {
    username,
    ...(channel ? { channel } : {}),
    text: message || `Test ${route.sev.toUpperCase()} message from Vicidial Monitor Pro at ${new Date().toISOString()}`
  };
  return await sendSlackWebhook({ webhookUrl, payload });
}

module.exports = {
  notifySlackForAlert,
  sendSlackTest
};

