const { WebSocketServer } = require('ws');
const { verifyWsMessageToken } = require('../middleware/auth');

function attachLiveWs({ server, path = '/ws', jwtSecret, getLatest, setLatest, onPublishSnapshot }) {
  const wss = new WebSocketServer({ server, path });

  function safeSend(ws, obj) {
    if (ws.readyState !== ws.OPEN) return;
    ws.send(JSON.stringify(obj));
  }

  wss.on('connection', (ws) => {
    ws.isSubscribed = false;
    safeSend(ws, { type: 'hello', time: new Date().toISOString() });

    ws.on('message', (raw) => {
      let msg;
      try {
        msg = JSON.parse(raw.toString('utf8'));
      } catch {
        return safeSend(ws, { type: 'error', error: 'invalid_json' });
      }

      const user = verifyWsMessageToken(msg, jwtSecret);
      if (!user) return safeSend(ws, { type: 'error', error: 'unauthorized' });

      if (msg.type === 'subscribe') {
        ws.isSubscribed = true;
        const latest = getLatest();
        safeSend(ws, { type: 'subscribed', user, hasLatest: !!latest });
        if (latest) safeSend(ws, { type: 'snapshot', snapshot: latest });
        return;
      }

      if (msg.type === 'publish') {
        if (!msg.snapshot) return safeSend(ws, { type: 'error', error: 'missing_snapshot' });
        setLatest(msg.snapshot);

        for (const client of wss.clients) {
          if (client.isSubscribed) safeSend(client, { type: 'snapshot', snapshot: getLatest() });
        }

        try {
          onPublishSnapshot?.(msg.snapshot);
        } catch {
          // ignore
        }

        return safeSend(ws, { type: 'published', ok: true });
      }

      return safeSend(ws, { type: 'error', error: 'unknown_type' });
    });
  });

  return {
    wss,
    broadcastSnapshot(snapshot) {
      setLatest(snapshot);
      for (const client of wss.clients) {
        if (client.isSubscribed) safeSend(client, { type: 'snapshot', snapshot });
      }
    },
    broadcastAlert(alert) {
      for (const client of wss.clients) {
        if (client.isSubscribed) safeSend(client, { type: 'alert', alert });
      }
    }
  };
}

module.exports = { attachLiveWs };

