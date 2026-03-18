import { normalizeBaseUrl } from "../apiClient.js";
import { el } from "../ui/dom.js";

async function fetchAlerts(
  baseUrl,
  token,
  { shiftDate, status, severity, limit } = {},
) {
  const qs = new URLSearchParams();
  if (shiftDate) qs.set("shiftDate", shiftDate);
  if (status) qs.set("status", status);
  if (severity) qs.set("severity", severity);
  if (limit) qs.set("limit", String(limit));
  const res = await fetch(
    `${normalizeBaseUrl(baseUrl)}/api/alerts?${qs.toString()}`,
    {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    },
  );
  const json = await res.json().catch(() => null);
  if (!res.ok || !json?.success)
    return { success: false, error: json?.error || `HTTP ${res.status}` };
  return { success: true, alerts: json.alerts || [] };
}

async function alertAction(baseUrl, token, id, action) {
  const res = await fetch(
    `${normalizeBaseUrl(baseUrl)}/api/alerts/${encodeURIComponent(String(id))}/action`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ action }),
    },
  );
  const json = await res.json().catch(() => null);
  if (!res.ok || !json?.success)
    return { success: false, error: json?.error || `HTTP ${res.status}` };
  return { success: true };
}

function sevClass(sev) {
  return sev === "bad" ? "bad" : sev === "warn" ? "warn" : "good";
}

export function renderAlerts(state) {
  const today = new Date().toISOString().slice(0, 10);
  const section = el("section", { class: "card wide" }, [
    el("div", { class: "cardTitle" }, ["Alerts"]),
    el("div", { class: "note" }, [
      "Anomalies detected from live snapshots (waiting spikes, purple overload, drop% jumps).",
    ]),
    el("div", { class: "formCols" }, [
      el("div", { class: "formBlock" }, [
        el("div", { class: "formBlockTitle" }, ["Filters"]),
        el("div", { class: "formRow" }, [
          el("label", {}, ["Shift date"]),
          el("input", { id: "al_date", type: "date", value: today }),
        ]),
        el("div", { class: "formRow" }, [
          el("label", {}, ["Status"]),
          select(
            "al_status",
            [
              ["open", "Open"],
              ["acked", "Acked"],
              ["resolved", "Resolved"],
              ["all", "All"],
            ],
            "open",
          ),
        ]),
        el("div", { class: "formRow" }, [
          el("label", {}, ["Severity"]),
          select(
            "al_sev",
            [
              ["all", "All"],
              ["bad", "Bad"],
              ["warn", "Warn"],
              ["info", "Info"],
            ],
            "all",
          ),
        ]),
        el("div", { class: "actions" }, [
          el(
            "button",
            { class: "btn primary", onclick: async () => refresh(state) },
            ["Refresh"],
          ),
        ]),
        el("div", { id: "al_msg", class: "msg" }, [""]),
      ]),
      el("div", { class: "formBlock" }, [
        el("div", { class: "formBlockTitle" }, ["Results"]),
        el("div", { id: "al_list", class: "tableWrap" }, ["Loading…"]),
      ]),
    ]),
  ]);

  setTimeout(() => refresh(state), 0);
  return section;
}

function select(id, options, value) {
  const s = el("select", { id, class: "inputLike" }, []);
  for (const [v, label] of options) {
    const o = el("option", { value: v }, [label]);
    if (v === value) o.selected = true;
    s.appendChild(o);
  }
  return s;
}

async function refresh(state) {
  const msg = document.getElementById("al_msg");
  const host = document.getElementById("al_list");
  if (!msg || !host) return;
  msg.textContent = "Loading…";

  const shiftDate = document.getElementById("al_date")?.value;
  const statusRaw = document.getElementById("al_status")?.value;
  const severityRaw = document.getElementById("al_sev")?.value;

  const r = await fetchAlerts(state.baseUrl, state.token, {
    shiftDate,
    status: statusRaw === "all" ? null : statusRaw,
    severity: severityRaw === "all" ? null : severityRaw,
    limit: 200,
  });
  if (!r.success) {
    msg.textContent = `Failed: ${r.error}`;
    host.textContent = "";
    return;
  }
  msg.textContent = `Loaded ${r.alerts.length} alerts.`;

  const table = el("table", {}, [
    el("thead", {}, [
      el("tr", {}, [
        el("th", {}, ["TS"]),
        el("th", {}, ["Severity"]),
        el("th", {}, ["Type"]),
        el("th", {}, ["Title"]),
        el("th", {}, ["ETA"]),
        el("th", {}, ["Status"]),
        el("th", {}, ["Actions"]),
      ]),
    ]),
    el(
      "tbody",
      {},
      r.alerts.map((a) => row(state, a)),
    ),
  ]);
  host.replaceChildren(table);
}

function row(state, a) {
  const actions = [];
  if (a.status === "open") {
    actions.push(actionBtn(state, a.id, "ack", "Ack"));
    actions.push(actionBtn(state, a.id, "resolve", "Resolve"));
  } else if (a.status === "acked") {
    actions.push(actionBtn(state, a.id, "resolve", "Resolve"));
    actions.push(actionBtn(state, a.id, "reopen", "Reopen"));
  } else {
    actions.push(actionBtn(state, a.id, "reopen", "Reopen"));
  }

  const eta = a?.details?.etaLocalTime || "";
  return el("tr", {}, [
    el("td", {}, [String(a.ts || "—")]),
    el("td", {}, [
      el("span", { class: `badge ${sevClass(a.severity)}` }, [
        String(a.severity),
      ]),
    ]),
    el("td", {}, [String(a.type || "—")]),
    el("td", {}, [String(a.title || "—")]),
    el("td", {}, [String(eta)]),
    el("td", {}, [String(a.status || "—")]),
    el("td", {}, actions),
  ]);
}

function actionBtn(state, id, action, label) {
  return el(
    "button",
    {
      class: "btn",
      onclick: async () => {
        const msg = document.getElementById("al_msg");
        msg.textContent = `${label} #${id}…`;
        const r = await alertAction(state.baseUrl, state.token, id, action);
        msg.textContent = r.success ? "Updated." : `Failed: ${r.error}`;
        await refresh(state);
      },
    },
    [label],
  );
}
