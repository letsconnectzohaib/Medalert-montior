// Pure helpers (no DOM required).

export function parseNumberLoose(text) {
  if (text == null) return null;
  const cleaned = String(text).replace(/[^\d.-]/g, '').trim();
  if (!cleaned) return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

export function parseDroppedAnswered(text) {
  // Expected like: "484.000 / 2345"
  if (!text) return { dropped: 0, answered: 0 };
  const parts = String(text).split('/');
  const dropped = parseNumberLoose(parts[0]) ?? 0;
  const answered = parseNumberLoose(parts[1]) ?? 0;
  return { dropped, answered };
}

export function mmssToSeconds(mmss) {
  if (!mmss) return null;
  const s = String(mmss).trim();
  // could be "  0:09" or "9:59"
  const m = s.match(/(\d+)\s*:\s*(\d+)/);
  if (!m) return null;
  const minutes = Number(m[1]);
  const seconds = Number(m[2]);
  if (!Number.isFinite(minutes) || !Number.isFinite(seconds)) return null;
  return minutes * 60 + seconds;
}

export function mapStateBucketFromRowClass(rowClass) {
  // rowClass is like "TRpurple"
  const cls = String(rowClass || '').trim();
  switch (cls) {
    case 'TRred':
      return 'chatting';
    case 'TRorange':
      return 'email';
    case 'TRlightblue':
      return 'waiting_lt_1m';
    case 'TRblue':
      return 'waiting_gt_1m';
    case 'TRmidnightblue':
      return 'waiting_gt_5m';
    case 'TRthistle':
      return 'oncall_gt_10s';
    case 'TRviolet':
      return 'oncall_gt_1m';
    case 'TRpurple':
      return 'oncall_gt_5m';
    case 'TRkhaki':
      return 'paused_gt_10s';
    case 'TRyellow':
      return 'paused_gt_1m';
    case 'TRolive':
      return 'paused_gt_5m';
    case 'TRlime':
      return 'threeway_gt_10s';
    case 'TRblack':
      return 'deadcall';
    default:
      return 'unknown';
  }
}

