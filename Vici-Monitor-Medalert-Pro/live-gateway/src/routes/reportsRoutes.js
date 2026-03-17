const express = require("express");
const fs = require("fs");
const path = require("path");
const { generateShiftReportHtml } = require("../lib/shiftReport");

function escAttr(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function withPrintHelperHtml(html, { shiftDate, mode = "pdf" } = {}) {
  const title = `Shift Report ${shiftDate || ""}`.trim();

  const helper = `
<style>
  @media print {
    .vm-print-toolbar { display:none !important; }
    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  }
  .vm-print-toolbar {
    position: sticky;
    top: 0;
    z-index: 9999;
    display: flex;
    gap: 10px;
    align-items: center;
    justify-content: space-between;
    padding: 12px 16px;
    border-bottom: 1px solid rgba(255,255,255,.10);
    background: rgba(10,14,24,.96);
    backdrop-filter: blur(8px);
    color: #e9f0ff;
    font: 13px/1.4 system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;
  }
  .vm-print-toolbar__title { font-weight: 800; }
  .vm-print-toolbar__note { color: #a9b7d4; font-size: 12px; }
  .vm-print-toolbar__actions { display:flex; gap:8px; flex-wrap:wrap; }
  .vm-print-btn {
    appearance: none;
    border: 1px solid rgba(255,255,255,.14);
    background: rgba(255,255,255,.06);
    color: #fff;
    border-radius: 10px;
    padding: 8px 12px;
    cursor: pointer;
    font: inherit;
  }
  .vm-print-btn--primary {
    background: rgba(76,141,255,.18);
    border-color: rgba(76,141,255,.35);
  }
</style>
<div class="vm-print-toolbar">
  <div>
    <div class="vm-print-toolbar__title">${escAttr(title)}</div>
    <div class="vm-print-toolbar__note">
      ${
        mode === "pdf"
          ? "Use Print / Save as PDF in your browser to export a PDF with the report styling preserved."
          : "Printable report view."
      }
    </div>
  </div>
  <div class="vm-print-toolbar__actions">
    <button class="vm-print-btn vm-print-btn--primary" onclick="window.print()">Print / Save as PDF</button>
    <button class="vm-print-btn" onclick="window.close()">Close</button>
  </div>
</div>
<script>
  window.__REPORT_EXPORT_MODE__ = ${JSON.stringify(mode)};
  window.__REPORT_SHIFT_DATE__ = ${JSON.stringify(shiftDate || "")};
</script>`;

  if (/<body[^>]*>/i.test(html)) {
    return html.replace(/<body([^>]*)>/i, `<body$1>${helper}`);
  }

  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${escAttr(title)}</title>
</head>
<body>
${helper}
${html}
</body>
</html>`;
}

function fileFormatMime(format) {
  if (format === "html") return "text/html; charset=utf-8";
  if (format === "pdf") return "application/pdf";
  return "application/octet-stream";
}

function normalizedDownloadName({ shiftDate, format }) {
  const safeDate = String(shiftDate || "report").replace(
    /[^a-zA-Z0-9_-]/g,
    "_",
  );
  const ext = format === "pdf" ? "html" : format || "dat";
  return `shift_report_${safeDate}.${ext}`;
}

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
  getReportById,
}) {
  const router = express.Router();

  router.get("/api/reports", requireAuth, async (req, res) => {
    const { kind, limit, shiftDate } = req.query || {};
    const rows = await listReports({
      kind: kind ? String(kind) : null,
      limit: limit ? Number(limit) : 50,
      shiftDate: shiftDate ? String(shiftDate) : null,
    });
    res.json({ success: true, reports: rows });
  });

  router.get("/api/reports/shift", requireAuth, async (req, res) => {
    const shiftDate =
      req.query.date || (await computeShiftDate(new Date().toISOString()));
    const { html } = await generateShiftReportHtml({
      shiftDate,
      getSettings,
      getShiftSummary,
      getPeakHour,
      getCallflowHourly,
      getCallflowPeakHour,
    });

    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.setHeader(
      "Content-Disposition",
      `inline; filename="shift_report_${shiftDate}.html"`,
    );
    res.send(html);
  });

  router.post("/api/reports/shift/generate", requireAuth, async (req, res) => {
    const shiftDate =
      req.body?.date || (await computeShiftDate(new Date().toISOString()));
    const createdAt = new Date().toISOString();
    const requestedFormat = String(req.body?.format || "html").toLowerCase();
    const outputFormat = requestedFormat === "pdf" ? "pdf" : "html";

    const { html } = await generateShiftReportHtml({
      shiftDate,
      getSettings,
      getShiftSummary,
      getPeakHour,
      getCallflowHourly,
      getCallflowPeakHour,
    });

    const content =
      outputFormat === "pdf"
        ? withPrintHelperHtml(html, { shiftDate, mode: "pdf" })
        : html;

    const filePath = await saveReportFile({
      kind: "shift",
      format: outputFormat,
      shiftDate,
      createdAtIso: createdAt.replaceAll(":", "-"),
      content,
    });

    const meta = await addGeneratedReport({
      shiftDate,
      kind: "shift",
      format: outputFormat,
      filePath,
      createdAtIso: createdAt,
    });

    res.json({
      success: true,
      report: meta,
      exportMode: outputFormat === "pdf" ? "browser_print_pdf" : "html",
    });
  });

  router.get("/api/reports/:id/download", requireAuth, async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isFinite(id))
      return res.status(400).json({ success: false, error: "invalid_id" });

    const r = await getReportById(id);
    if (!r) return res.status(404).json({ success: false, error: "not_found" });

    const p = String(r.file_path || "");
    if (!p)
      return res
        .status(404)
        .json({ success: false, error: "missing_file_path" });

    const abs = path.isAbsolute(p) ? p : path.resolve(p);
    if (!fs.existsSync(abs))
      return res.status(404).json({ success: false, error: "file_missing" });

    const format = String(r.format || "html").toLowerCase();
    const mime = fileFormatMime(format);
    const filename = normalizedDownloadName({
      shiftDate: r.shift_date,
      format,
    });

    res.setHeader("Content-Type", mime);
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    fs.createReadStream(abs).pipe(res);
  });

  router.get("/api/reports/shift.pdf", requireAuth, async (req, res) => {
    const shiftDate =
      req.query.date || (await computeShiftDate(new Date().toISOString()));
    const { html } = await generateShiftReportHtml({
      shiftDate,
      getSettings,
      getShiftSummary,
      getPeakHour,
      getCallflowHourly,
      getCallflowPeakHour,
    });

    const printableHtml = withPrintHelperHtml(html, { shiftDate, mode: "pdf" });

    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.setHeader(
      "Content-Disposition",
      `inline; filename="shift_report_${shiftDate}.pdf.html"`,
    );
    res.setHeader("X-Report-Export-Mode", "browser_print_pdf");
    res.send(printableHtml);
  });

  return router;
}

module.exports = { createReportsRoutes };
