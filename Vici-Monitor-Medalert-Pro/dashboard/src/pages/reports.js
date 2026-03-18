import { normalizeBaseUrl } from "../apiClient.js";
import { el } from "../ui/dom.js";

async function fetchShiftReportHtml(baseUrl, token, date) {
  const res = await fetch(
    `${normalizeBaseUrl(baseUrl)}/api/reports/shift?date=${encodeURIComponent(date)}`,
    {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    },
  );
  if (!res.ok) return { success: false, error: `HTTP ${res.status}` };
  const html = await res.text();
  return { success: true, html };
}

async function fetchShiftReportPdfView(baseUrl, token, date) {
  const res = await fetch(
    `${normalizeBaseUrl(baseUrl)}/api/reports/shift.pdf?date=${encodeURIComponent(date)}`,
    {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    },
  );
  if (!res.ok) return { success: false, error: `HTTP ${res.status}` };
  const html = await res.text();
  const exportMode =
    res.headers.get("x-report-export-mode") || "browser_print_pdf";
  return { success: true, html, exportMode };
}

function openHtmlInNewTab(html) {
  const w = window.open("", "_blank", "noopener,noreferrer");
  if (!w) return false;
  w.document.open();
  w.document.write(html);
  w.document.close();
  return true;
}

function downloadHtml(filename, html) {
  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

async function fetchReportList(baseUrl, token, limit = 50) {
  const res = await fetch(
    `${normalizeBaseUrl(baseUrl)}/api/reports?kind=shift&limit=${encodeURIComponent(String(limit))}`,
    {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    },
  );
  const json = await res.json().catch(() => null);
  if (!res.ok || !json?.success)
    return { success: false, error: json?.error || `HTTP ${res.status}` };
  return { success: true, reports: json.reports || [] };
}

async function generateAndStore(baseUrl, token, date, format = "html") {
  const res = await fetch(
    `${normalizeBaseUrl(baseUrl)}/api/reports/shift/generate`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ date, format }),
    },
  );
  const json = await res.json().catch(() => null);
  if (!res.ok || !json?.success)
    return { success: false, error: json?.error || `HTTP ${res.status}` };
  return {
    success: true,
    report: json.report,
    exportMode:
      json.exportMode || (format === "pdf" ? "browser_print_pdf" : "html"),
  };
}

async function downloadStoredReport(baseUrl, token, id) {
  const res = await fetch(
    `${normalizeBaseUrl(baseUrl)}/api/reports/${encodeURIComponent(String(id))}/download`,
    {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    },
  );
  if (!res.ok) return { success: false, error: `HTTP ${res.status}` };
  const blob = await res.blob();
  const cd = res.headers.get("content-disposition") || "";
  const m = cd.match(/filename=\"([^\"]+)\"/);
  const filename = m ? m[1] : `report_${id}.html`;
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
  return { success: true };
}

function getSelectedDate() {
  return (
    document.getElementById("rp_date")?.value ||
    new Date().toISOString().slice(0, 10)
  );
}

function setMsg(id, text) {
  const node = document.getElementById(id);
  if (node) node.textContent = text;
}

function openPrintPdfView(html) {
  const ok = openHtmlInNewTab(html);
  return ok
    ? {
        success: true,
        message:
          "Opened print-ready PDF view in a new tab. Use Print / Save as PDF.",
      }
    : {
        success: false,
        message: "Popup blocked. Use Download PDF view instead.",
      };
}

function reportFormatBadge(format) {
  const kind = String(format || "").toLowerCase() === "pdf" ? "warn" : "good";
  return el("span", { class: `badge ${kind}` }, [String(format || "—")]);
}

export function renderReports(state) {
  const today = new Date().toISOString().slice(0, 10);

  const section = el("section", { class: "card wide" }, [
    el("div", { class: "cardTitle" }, ["Reports"]),
    el("div", { class: "note" }, [
      "Generate shift reports as HTML, or open a browser-print PDF view that preserves styling and lets you save as PDF from the browser.",
    ]),
    el("div", { class: "formCols" }, [
      el("div", { class: "formBlock" }, [
        el("div", { class: "formBlockTitle" }, ["Generate"]),
        el("div", { class: "formRow" }, [
          el("label", {}, ["Shift date"]),
          el("input", { id: "rp_date", type: "date", value: today }),
        ]),
        el("div", { class: "actions" }, [
          el(
            "button",
            {
              class: "btn primary",
              onclick: async () => {
                const date = getSelectedDate();
                setMsg("rp_msg", "Generating HTML report…");
                const r = await fetchShiftReportHtml(
                  state.baseUrl,
                  state.token,
                  date,
                );
                if (!r.success) {
                  setMsg("rp_msg", `Failed: ${r.error}`);
                  return;
                }
                const ok = openHtmlInNewTab(r.html);
                setMsg(
                  "rp_msg",
                  ok
                    ? "Opened HTML report in new tab."
                    : "Popup blocked. Use Download HTML instead.",
                );
              },
            },
            ["Open HTML"],
          ),
          el(
            "button",
            {
              class: "btn",
              onclick: async () => {
                const date = getSelectedDate();
                setMsg("rp_msg", "Generating HTML…");
                const r = await fetchShiftReportHtml(
                  state.baseUrl,
                  state.token,
                  date,
                );
                if (!r.success) {
                  setMsg("rp_msg", `Failed: ${r.error}`);
                  return;
                }
                downloadHtml(`shift_report_${date}.html`, r.html);
                setMsg("rp_msg", "Downloaded HTML report.");
              },
            },
            ["Download HTML"],
          ),
        ]),
        el("div", { class: "divider" }, []),
        el("div", { class: "formBlockTitle" }, ["Browser-print PDF"]),
        el("div", { class: "note" }, [
          "This opens a print-ready report view. From there, use your browser’s Print dialog and choose “Save as PDF”.",
        ]),
        el("div", { class: "actions" }, [
          el(
            "button",
            {
              class: "btn primary",
              onclick: async () => {
                const date = getSelectedDate();
                setMsg("rp_msg", "Preparing print-ready PDF view…");
                const r = await fetchShiftReportPdfView(
                  state.baseUrl,
                  state.token,
                  date,
                );
                if (!r.success) {
                  setMsg("rp_msg", `Failed: ${r.error}`);
                  return;
                }
                const out = openPrintPdfView(r.html);
                setMsg("rp_msg", out.message);
              },
            },
            ["Open PDF view"],
          ),
          el(
            "button",
            {
              class: "btn",
              onclick: async () => {
                const date = getSelectedDate();
                setMsg("rp_msg", "Preparing downloadable PDF view…");
                const r = await fetchShiftReportPdfView(
                  state.baseUrl,
                  state.token,
                  date,
                );
                if (!r.success) {
                  setMsg("rp_msg", `Failed: ${r.error}`);
                  return;
                }
                downloadHtml(`shift_report_${date}.pdf.html`, r.html);
                setMsg(
                  "rp_msg",
                  "Downloaded print-ready PDF view (.html). Open it and use Print / Save as PDF.",
                );
              },
            },
            ["Download PDF view"],
          ),
        ]),
        el("div", { class: "divider" }, []),
        el("div", { class: "formBlockTitle" }, ["Store report"]),
        el("div", { class: "actions" }, [
          el(
            "button",
            {
              class: "btn",
              onclick: async () => {
                const date = getSelectedDate();
                setMsg("rp_msg", "Generating & storing HTML…");
                const r = await generateAndStore(
                  state.baseUrl,
                  state.token,
                  date,
                  "html",
                );
                if (!r.success) {
                  setMsg("rp_msg", `Failed: ${r.error}`);
                  return;
                }
                setMsg(
                  "rp_msg",
                  `Stored HTML report #${r.report?.id || "—"}. Refreshing list…`,
                );
                await refreshList(state);
                setMsg("rp_msg", "Stored HTML report and refreshed history.");
              },
            },
            ["Generate & store HTML"],
          ),
          el(
            "button",
            {
              class: "btn",
              onclick: async () => {
                const date = getSelectedDate();
                setMsg(
                  "rp_msg",
                  "Generating & storing browser-print PDF view…",
                );
                const r = await generateAndStore(
                  state.baseUrl,
                  state.token,
                  date,
                  "pdf",
                );
                if (!r.success) {
                  setMsg("rp_msg", `Failed: ${r.error}`);
                  return;
                }
                setMsg(
                  "rp_msg",
                  `Stored PDF-view report #${r.report?.id || "—"} (${r.exportMode || "browser_print_pdf"}). Refreshing list…`,
                );
                await refreshList(state);
                setMsg(
                  "rp_msg",
                  "Stored PDF-view report and refreshed history.",
                );
              },
            },
            ["Generate & store PDF view"],
          ),
        ]),
      ]),
      el("div", { class: "formBlock" }, [
        el("div", { class: "formBlockTitle" }, ["History"]),
        el("div", { class: "note" }, [
          "Stored reports can be downloaded later. PDF entries are browser-print views saved as HTML for reliable cross-platform export.",
        ]),
        el("div", { class: "actions" }, [
          el(
            "button",
            { class: "btn", onclick: async () => refreshList(state) },
            ["Refresh list"],
          ),
        ]),
        el("div", { id: "rp_hist_msg", class: "msg" }, [""]),
        el("div", { id: "rp_hist", class: "tableWrap" }, ["Loading…"]),
      ]),
    ]),
    el("div", { id: "rp_msg", class: "msg" }, [""]),
    el("div", { class: "divider" }, []),
  ]);

  setTimeout(() => refreshList(state), 0);
  return section;
}

async function refreshList(state) {
  const host = document.getElementById("rp_hist");
  const msg = document.getElementById("rp_hist_msg");
  if (!host || !msg) return;
  msg.textContent = "Loading…";

  const r = await fetchReportList(state.baseUrl, state.token, 50);
  if (!r.success) {
    msg.textContent = `Failed: ${r.error}`;
    host.textContent = "";
    return;
  }
  msg.textContent = `Loaded ${r.reports.length} reports.`;

  const table = el("table", {}, [
    el("thead", {}, [
      el("tr", {}, [
        el("th", {}, ["ID"]),
        el("th", {}, ["Shift date"]),
        el("th", {}, ["Created"]),
        el("th", {}, ["Format"]),
        el("th", {}, ["Actions"]),
      ]),
    ]),
    el(
      "tbody",
      {},
      r.reports.map((rep) => {
        const id = rep.id;
        const format = String(rep.format || "").toLowerCase();

        return el("tr", {}, [
          el("td", {}, [String(id)]),
          el("td", {}, [String(rep.shift_date || "—")]),
          el("td", {}, [String(rep.created_at || "—")]),
          el("td", {}, [reportFormatBadge(format || "—")]),
          el("td", {}, [
            el(
              "button",
              {
                class: "btn",
                onclick: async () => {
                  const m = document.getElementById("rp_hist_msg");
                  m.textContent = `Downloading #${id}…`;
                  const d = await downloadStoredReport(
                    state.baseUrl,
                    state.token,
                    id,
                  );
                  m.textContent = d.success
                    ? format === "pdf"
                      ? "Downloaded browser-print PDF view (.html). Open it and use Print / Save as PDF."
                      : "Downloaded."
                    : `Failed: ${d.error}`;
                },
              },
              ["Download"],
            ),
          ]),
        ]);
      }),
    ),
  ]);

  host.replaceChildren(table);
}
