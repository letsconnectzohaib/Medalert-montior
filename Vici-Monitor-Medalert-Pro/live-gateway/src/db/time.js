function parseHm(hm) {
  const m = String(hm || '').match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return null;
  const h = Number(m[1]);
  const mi = Number(m[2]);
  if (!Number.isFinite(h) || !Number.isFinite(mi)) return null;
  if (h < 0 || h > 23 || mi < 0 || mi > 59) return null;
  return { h, m: mi };
}

function toLocalParts(tsIso, tzOffsetMinutes) {
  const d = new Date(tsIso || Date.now());
  const utcMs = d.getTime();
  const local = new Date(utcMs + Number(tzOffsetMinutes || 0) * 60 * 1000);
  return {
    ymd: local.toISOString().slice(0, 10),
    hour: local.getUTCHours(),
    minute: local.getUTCMinutes()
  };
}

function computeShiftDateWithSettings(tsIso, shift) {
  const offset = Number(shift?.tzOffsetMinutes ?? 0);
  const end = parseHm(shift?.end) || { h: 4, m: 30 };
  const local = toLocalParts(tsIso, offset);

  if (local.hour < end.h || (local.hour === end.h && local.minute < end.m)) {
    const dt = new Date(`${local.ymd}T00:00:00Z`);
    dt.setUTCDate(dt.getUTCDate() - 1);
    return dt.toISOString().slice(0, 10);
  }
  return local.ymd;
}

module.exports = {
  parseHm,
  toLocalParts,
  computeShiftDateWithSettings
};

