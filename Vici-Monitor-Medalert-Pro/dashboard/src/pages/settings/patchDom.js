export function buildPatchFromDom() {
  // Some fields may not exist for inactive tabs; fall back safely.
  const shift = {
    tzOffsetMinutes: document.getElementById('st_tz') ? Number(document.getElementById('st_tz').value || 0) : undefined,
    start: document.getElementById('st_shift_start') ? String(document.getElementById('st_shift_start').value || '').trim() : undefined,
    end: document.getElementById('st_shift_end') ? String(document.getElementById('st_shift_end').value || '').trim() : undefined
  };
  const retention = {
    rawSnapshotsDays: document.getElementById('st_ret_raw') ? Number(document.getElementById('st_ret_raw').value || 14) : undefined,
    bucketsDays: document.getElementById('st_ret_buckets') ? Number(document.getElementById('st_ret_buckets').value || 60) : undefined,
    alertsDays: document.getElementById('st_ret_alerts') ? Number(document.getElementById('st_ret_alerts').value || 30) : undefined
  };
  const alerts = {
    waitingSpikeMax: document.getElementById('st_al_wait_max') ? Number(document.getElementById('st_al_wait_max').value || 25) : undefined,
    waitingSpikeSustainSeconds: document.getElementById('st_al_wait_sus') ? Number(document.getElementById('st_al_wait_sus').value || 120) : undefined,
    waitingSpikeCooldownSeconds: document.getElementById('st_al_wait_cd') ? Number(document.getElementById('st_al_wait_cd').value || 600) : undefined,
    purpleOverloadMin: document.getElementById('st_al_purp_min') ? Number(document.getElementById('st_al_purp_min').value || 8) : undefined,
    purpleOverloadSustainSeconds: document.getElementById('st_al_purp_sus') ? Number(document.getElementById('st_al_purp_sus').value || 180) : undefined,
    purpleOverloadCooldownSeconds: document.getElementById('st_al_purp_cd') ? Number(document.getElementById('st_al_purp_cd').value || 900) : undefined,
    dropPercentMin: document.getElementById('st_al_drop_min') ? Number(document.getElementById('st_al_drop_min').value || 3) : undefined,
    dropPercentJumpPoints: document.getElementById('st_al_drop_jump') ? Number(document.getElementById('st_al_drop_jump').value || 2.5) : undefined,
    dropPercentCooldownSeconds: document.getElementById('st_al_drop_cd') ? Number(document.getElementById('st_al_drop_cd').value || 900) : undefined,
    staffingGapMin: document.getElementById('st_al_staff_gap') ? Number(document.getElementById('st_al_staff_gap').value || 5) : undefined,
    staffingSustainSeconds: document.getElementById('st_al_staff_sus') ? Number(document.getElementById('st_al_staff_sus').value || 120) : undefined,
    staffingCooldownSeconds: document.getElementById('st_al_staff_cd') ? Number(document.getElementById('st_al_staff_cd').value || 900) : undefined,
    notifyToast: document.getElementById('st_al_toast') ? !!document.getElementById('st_al_toast').checked : undefined,
    notifySound: document.getElementById('st_al_sound') ? !!document.getElementById('st_al_sound').checked : undefined
  };
  const notifications = {
    slack: {
      enabled: document.getElementById('st_slack_enabled') ? !!document.getElementById('st_slack_enabled').checked : undefined,
      webhookUrl: document.getElementById('st_slack_webhook') ? String(document.getElementById('st_slack_webhook').value || '').trim() : undefined,
      channel: document.getElementById('st_slack_channel') ? String(document.getElementById('st_slack_channel').value || '').trim() : undefined,
      username: document.getElementById('st_slack_username') ? String(document.getElementById('st_slack_username').value || 'Vici Monitor Pro').trim() : undefined,
      cooldownSeconds: document.getElementById('st_slack_cd') ? Number(document.getElementById('st_slack_cd').value || 300) : undefined,
      routes: {
        bad: {
          enabled: document.getElementById('st_slack_bad_enabled') ? !!document.getElementById('st_slack_bad_enabled').checked : undefined,
          webhookUrl: document.getElementById('st_slack_bad_webhook') ? String(document.getElementById('st_slack_bad_webhook').value || '').trim() : undefined,
          channel: document.getElementById('st_slack_bad_channel') ? String(document.getElementById('st_slack_bad_channel').value || '').trim() : undefined
        },
        warn: {
          enabled: document.getElementById('st_slack_warn_enabled') ? !!document.getElementById('st_slack_warn_enabled').checked : undefined,
          webhookUrl: document.getElementById('st_slack_warn_webhook') ? String(document.getElementById('st_slack_warn_webhook').value || '').trim() : undefined,
          channel: document.getElementById('st_slack_warn_channel') ? String(document.getElementById('st_slack_warn_channel').value || '').trim() : undefined
        },
        info: {
          enabled: document.getElementById('st_slack_info_enabled') ? !!document.getElementById('st_slack_info_enabled').checked : undefined,
          webhookUrl: document.getElementById('st_slack_info_webhook') ? String(document.getElementById('st_slack_info_webhook').value || '').trim() : undefined,
          channel: document.getElementById('st_slack_info_channel') ? String(document.getElementById('st_slack_info_channel').value || '').trim() : undefined
        }
      }
    }
  };

  // Remove undefined keys so we don't overwrite settings from inactive tabs.
  const clean = (obj) => Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined));
  const patch = {};
  const s = clean(shift);
  const r = clean(retention);
  const a = clean(alerts);
  const slack = clean(notifications.slack);
  if (notifications.slack?.routes) {
    const cleanRoute = (r) => Object.fromEntries(Object.entries(r).filter(([, v]) => v !== undefined));
    const routes = notifications.slack.routes;
    const cleanedRoutes = {
      bad: cleanRoute(routes.bad || {}),
      warn: cleanRoute(routes.warn || {}),
      info: cleanRoute(routes.info || {})
    };
    slack.routes = Object.fromEntries(Object.entries(cleanedRoutes).filter(([, v]) => Object.keys(v).length));
  }
  const n = { slack };
  if (Object.keys(s).length) patch.shift = s;
  if (Object.keys(r).length) patch.retention = r;
  if (Object.keys(a).length) patch.alerts = a;
  if (Object.keys(n.slack).length) patch.notifications = n;
  return patch;
}
