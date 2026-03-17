const express = require('express');
const fs = require('fs');
const path = require('path');
const { generateShiftReportHtml } = require('../lib/shiftReport');

function createReportsRoutes({
  requireAuth,
  computeShiftDate,
  getShiftSummary,
  getPeakHour,
  getSettings,
  getCallflowHourly,
  getCallflowPeakHour,
  saveReportFile,
  addGeneratedReport,
  listReports,
  getReportById
}) {
  const router = express.Router();

  router.get('/api/reports', requireAuth, async (req, res) => {
    const { kind, limit, shiftDate } = req.query || {};
    const rows = await listReports({
      kind: kind ? String(kind) : null,
      limit: limit ? Number(limit) : 50,
      shiftDate: shiftDate ? String(shiftDate) : null
    });
    res.json({ success: true, reports: rows });
  });

  router.get('/api/reports/shift', requireAuth, async (req, res) => {
    const shiftDate = req.query.date || (await computeShiftDate(new Date().toISOString()));
    const { html } = await generateShiftReportHtml({
      shiftDate,
      getSettings,
      getShiftSummary,
      getPeakHour,
      getCallflowHourly,
      getCallflowPeakHour
    });

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Content-Disposition', `inline; filename="shift_report_${shiftDate}.html"`);
    res.send(html);
  });

  router.post('/api/reports/shift/generate', requireAuth, async (req, res) => {
    const shiftDate = req.body?.date || (await computeShiftDate(new Date().toISOString()));
    const createdAt = new Date().toISOString();
    const { html } = await generateShiftReportHtml({
      shiftDate,
      getSettings,
      getShiftSummary,
      getPeakHour,
      getCallflowHourly,
      getCallflowPeakHour
    });

    const filePath = await saveReportFile({
      kind: 'shift',
      format: 'html',
      shiftDate,
      createdAtIso: createdAt.replaceAll(':', '-'),
      content: html
    });
    const meta = await addGeneratedReport({ shiftDate, kind: 'shift', format: 'html', filePath, createdAtIso: createdAt });
    res.json({ success: true, report: meta });
  });

  router.get('/api/reports/:id/download', requireAuth, async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).json({ success: false, error: 'invalid_id' });
    const r = await getReportById(id);
    if (!r) return res.status(404).json({ success: false, error: 'not_found' });

    const p = String(r.file_path || '');
    if (!p) return res.status(404).json({ success: false, error: 'missing_file_path' });
    const abs = path.isAbsolute(p) ? p : path.resolve(p);
    if (!fs.existsSync(abs)) return res.status(404).json({ success: false, error: 'file_missing' });

    const mime = r.format === 'html' ? 'text/html; charset=utf-8' : 'application/octet-stream';
    res.setHeader('Content-Type', mime);
    res.setHeader('Content-Disposition', `attachment; filename="${path.basename(abs)}"`);
    fs.createReadStream(abs).pipe(res);
  });

  // Placeholder: PDF export requires an additional renderer (kept optional).
  router.get('/api/reports/shift.pdf', requireAuth, async (_req, res) => {
    res.status(501).json({
      success: false,
      error: 'pdf_not_enabled',
      note: 'Enable a PDF renderer (e.g., headless Chromium) to support server-side PDF generation.'
    });
  });

  return router;
}

module.exports = { createReportsRoutes };

