const express = require('express');
const {
  ymdAddDays,
  buildShiftHours,
  sumCountsForHours,
  totalAgents,
  sumCallflowRows
} = require('../lib/shiftMath');

function createShiftRoutes({
  requireAuth,
  computeShiftDate,
  getShiftSummary,
  getPeakHour,
  getSettings,
  getCallflowHourly,
  getCallflowPeakHour
}) {
  const router = express.Router();

  router.get('/api/shift/summary', requireAuth, async (req, res) => {
    const date = req.query.date || (await computeShiftDate(new Date().toISOString()));
    const hours = await getShiftSummary(date);
    const peak = await getPeakHour(date);
    res.json({ success: true, shiftDate: date, peakHour: peak, hours });
  });

  router.get('/api/shift/intelligence', requireAuth, async (req, res) => {
    const date = req.query.date || (await computeShiftDate(new Date().toISOString()));
    const settings = await getSettings();
    const shift = settings.shift || {};
    const { hours: shiftHours, start, end } = buildShiftHours(shift);

    const series = await getShiftSummary(date);
    const peak = await getPeakHour(date);

    const firstHourHours = shiftHours.slice(0, 1);
    const halfHours = shiftHours.slice(0, Math.max(1, Math.ceil(shiftHours.length / 2)));

    const fullTotals = sumCountsForHours(series, shiftHours);
    const firstHourTotals = sumCountsForHours(series, firstHourHours);
    const halfTotals = sumCountsForHours(series, halfHours);

    const prevDate = ymdAddDays(date, -1);
    const prevSeries = await getShiftSummary(prevDate);
    const prevFullTotals = sumCountsForHours(prevSeries, shiftHours);

    res.json({
      success: true,
      shiftDate: date,
      shiftWindow: {
        start: `${String(start.h).padStart(2, '0')}:${String(start.m).padStart(2, '0')}`,
        end: `${String(end.h).padStart(2, '0')}:${String(end.m).padStart(2, '0')}`
      },
      shiftHours,
      peakHour: peak,
      rollups: {
        firstHour: { hours: firstHourHours, totals: firstHourTotals, totalAgents: totalAgents(firstHourTotals) },
        halfShift: { hours: halfHours, totals: halfTotals, totalAgents: totalAgents(halfTotals) },
        fullShift: { hours: shiftHours, totals: fullTotals, totalAgents: totalAgents(fullTotals) }
      },
      compare: {
        previousShiftDate: prevDate,
        fullShift: { totals: prevFullTotals, totalAgents: totalAgents(prevFullTotals) }
      },
      series
    });
  });

  router.get('/api/shift/callflow', requireAuth, async (req, res) => {
    const date = req.query.date || (await computeShiftDate(new Date().toISOString()));
    const settings = await getSettings();
    const shift = settings.shift || {};
    const { hours: shiftHours, start, end } = buildShiftHours(shift);

    const rows = await getCallflowHourly(date);
    const peakWaiting = await getCallflowPeakHour(date);

    const firstHourHours = shiftHours.slice(0, 1);
    const halfHours = shiftHours.slice(0, Math.max(1, Math.ceil(shiftHours.length / 2)));
    const restHours = shiftHours.slice(firstHourHours.length);

    const full = sumCallflowRows(rows, shiftHours);
    const firstHour = sumCallflowRows(rows, firstHourHours);
    const halfShift = sumCallflowRows(rows, halfHours);
    const rest = sumCallflowRows(rows, restHours);

    const prevDate = ymdAddDays(date, -1);
    const prevRows = await getCallflowHourly(prevDate);
    const prevFull = sumCallflowRows(prevRows, shiftHours);

    res.json({
      success: true,
      shiftDate: date,
      shiftWindow: {
        start: `${String(start.h).padStart(2, '0')}:${String(start.m).padStart(2, '0')}`,
        end: `${String(end.h).padStart(2, '0')}:${String(end.m).padStart(2, '0')}`
      },
      shiftHours,
      peak: { waiting: peakWaiting },
      rollups: { firstHour, halfShift, restOfShift: rest, fullShift: full },
      compare: { previousShiftDate: prevDate, fullShift: prevFull },
      series: rows
    });
  });

  return router;
}

module.exports = { createShiftRoutes };

