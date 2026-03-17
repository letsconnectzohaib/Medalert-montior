const $s = (id) => document.getElementById(id);

async function fetchShiftSummary() {
  const date = $s('shiftDate').value;
  const url = `http://localhost:3100/api/shift/summary?date=${encodeURIComponent(date)}`;
  const res = await fetch(url);
  const json = await res.json();
  return json;
}

function renderShiftSummary(data) {
  const peak = data.peakHour;
  $s('peakInfo').textContent = peak
    ? `Peak hour: ${peak.hour}:00 with total agents ${peak.total_agents}`
    : 'No data for this shift yet.';

  const hours = data.hours || {};
  const rows = Object.keys(hours)
    .sort((a, b) => Number(a) - Number(b))
    .map((h) => {
      const buckets = hours[h];
      const purple = buckets.oncall_gt_5m || 0;
      const violet = buckets.oncall_gt_1m || 0;
      const blue = buckets.waiting_gt_1m || 0;
      return `${h}:00  | purple=${purple}  violet=${violet}  blue=${blue}`;
    });

  $s('shiftLines').textContent = rows.join('\n') || 'No hourly buckets yet.';
}

async function onLoadShift() {
  $s('shiftMsg').textContent = '';
  try {
    const data = await fetchShiftSummary();
    if (!data.success) {
      $s('shiftMsg').textContent = data.error || 'Failed to load summary.';
      return;
    }
    renderShiftSummary(data);
  } catch (e) {
    $s('shiftMsg').textContent = e?.message || 'Error loading summary.';
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const today = new Date().toISOString().slice(0, 10);
  $s('shiftDate').value = today;
  $s('loadShift').addEventListener('click', onLoadShift);
});

