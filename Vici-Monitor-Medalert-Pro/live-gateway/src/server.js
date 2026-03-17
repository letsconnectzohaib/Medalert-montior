const http = require("http");
const express = require("express");
const cors = require("cors");
require("dotenv").config();

const db = require("./db");
const { requireAuth } = require("./middleware/auth");
const { attachLiveWs } = require("./ws/liveWs");
const { createHealthRoutes } = require("./routes/healthRoutes");
const { createAuthRoutes } = require("./routes/authRoutes");
const { createLiveRoutes } = require("./routes/liveRoutes");
const { createShiftRoutes } = require("./routes/shiftRoutes");
const { createAdminRoutes } = require("./routes/adminRoutes");
const { createReportsRoutes } = require("./routes/reportsRoutes");
const { createAlertsRoutes } = require("./routes/alertsRoutes");
const { createNotificationsRoutes } = require("./routes/notificationsRoutes");
const { createIntelligenceRoutes } = require("./routes/intelligenceRoutes");
const { notifySlackForAlert } = require("./notify/slack");
const { computeInsights } = require("./intelligence/insights");

const PORT = Number(process.env.PORT || 3100);
const JWT_SECRET = process.env.JWT_SECRET || "";
if (!JWT_SECRET)
  throw new Error("JWT_SECRET is required. Set it in live-gateway/.env");

const ADMIN_USERNAME = process.env.ADMIN_USERNAME || "admin";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "admin123";

const app = express();
app.use(cors());
app.use(express.json({ limit: "2mb" }));

let latestSnapshot = null;
const server = http.createServer(app);

const ws = attachLiveWs({
  server,
  path: "/ws",
  jwtSecret: JWT_SECRET,
  getLatest: () => latestSnapshot,
  setLatest: (s) => {
    latestSnapshot = s;
  },
});

// --- Lightweight scheduled report generation (HTML) ---
// Controlled via env:
//   REPORTS_AUTO=1
//   REPORTS_DAILY_AT_HHMM=05:05   (in shift timezone)
const { toLocalParts, computeShiftDateWithSettings } = require("./db/time");
const { generateShiftReportHtml } = require("./lib/shiftReport");
let lastAutoShiftDate = null;

async function autoGenerateShiftReportIfDue() {
  if (process.env.REPORTS_AUTO !== "1") return;
  try {
    const settings = await db.getSettings();
    const shift = settings.shift || {};
    const tzOffsetMinutes = shift.tzOffsetMinutes ?? 0;
    const local = toLocalParts(new Date().toISOString(), tzOffsetMinutes);

    const at = String(process.env.REPORTS_DAILY_AT_HHMM || "05:05");
    const m = at.match(/^(\d{1,2}):(\d{2})$/);
    const targetH = m ? Number(m[1]) : 5;
    const targetM = m ? Number(m[2]) : 5;

    if (local.hour !== targetH || local.minute !== targetM) return;

    const shiftDate = computeShiftDateWithSettings(
      new Date().toISOString(),
      shift,
    );
    if (lastAutoShiftDate === shiftDate) return;

    const existing = await db.listReports({
      kind: "shift",
      limit: 1,
      shiftDate,
    });
    if (existing?.length) {
      lastAutoShiftDate = shiftDate;
      return;
    }

    const { html } = await generateShiftReportHtml({
      shiftDate,
      getSettings: db.getSettings,
      getShiftSummary: db.getShiftSummary,
      getPeakHour: db.getPeakHour,
      getCallflowHourly: db.getCallflowHourly,
      getCallflowPeakHour: db.getCallflowPeakHour,
    });

    const createdAt = new Date().toISOString();
    const filePath = await db.saveReportFile({
      kind: "shift",
      format: "html",
      shiftDate,
      createdAtIso: createdAt.replaceAll(":", "-"),
      content: html,
    });
    await db.addGeneratedReport({
      shiftDate,
      kind: "shift",
      format: "html",
      filePath,
      createdAtIso: createdAt,
    });
    lastAutoShiftDate = shiftDate;
  } catch {
    // ignore scheduler errors
  }
}

app.use(createHealthRoutes());
app.use(
  createAuthRoutes({
    adminUsername: ADMIN_USERNAME,
    adminPassword: ADMIN_PASSWORD,
    jwtSecret: JWT_SECRET,
  }),
);
app.use(
  createLiveRoutes({
    requireAuth: requireAuth(JWT_SECRET),
    storeSnapshot: db.storeSnapshot,
    onSnapshot: (snap) => ws.broadcastSnapshot(snap),
    onAlerts: (alerts) => {
      (async () => {
        let settings = null;
        try {
          settings = await db.getSettings();
        } catch {
          settings = null;
        }
        for (const a of alerts || []) {
          ws.broadcastAlert(a);
          if (settings) {
            // fire-and-forget
            notifySlackForAlert({ settings, alert: a }).catch(() => {});
          }
        }
      })();
    },
  }),
);
app.use(
  createShiftRoutes({
    requireAuth: requireAuth(JWT_SECRET),
    computeShiftDate: db.computeShiftDate,
    getShiftSummary: db.getShiftSummary,
    getPeakHour: db.getPeakHour,
    getSettings: db.getSettings,
    getCallflowHourly: db.getCallflowHourly,
    getCallflowPeakHour: db.getCallflowPeakHour,
  }),
);
app.use(
  createAdminRoutes({
    requireAuth: requireAuth(JWT_SECRET),
    getSettings: db.getSettings,
    upsertSetting: db.upsertSetting,
    listTables: db.listTables,
    getTableInfo: db.getTableInfo,
    queryTable: db.queryTable,
    prepareClear: db.prepareClear,
    confirmClear: db.confirmClear,
  }),
);
app.use(
  createReportsRoutes({
    requireAuth: requireAuth(JWT_SECRET),
    computeShiftDate: db.computeShiftDate,
    getShiftSummary: db.getShiftSummary,
    getPeakHour: db.getPeakHour,
    getSettings: db.getSettings,
    getCallflowHourly: db.getCallflowHourly,
    getCallflowPeakHour: db.getCallflowPeakHour,
    saveReportFile: db.saveReportFile,
    addGeneratedReport: db.addGeneratedReport,
    listReports: db.listReports,
    getReportById: db.getReportById,
  }),
);
app.use(
  createAlertsRoutes({
    requireAuth: requireAuth(JWT_SECRET),
    listAlerts: db.listAlerts,
    updateAlertStatus: db.updateAlertStatus,
  }),
);
app.use(
  createNotificationsRoutes({
    requireAuth: requireAuth(JWT_SECRET),
    getSettings: db.getSettings,
  }),
);

app.use(
  createIntelligenceRoutes({
    requireAuth: requireAuth(JWT_SECRET),
    computeShiftDate: db.computeShiftDate,
    computeInsights: ({ shiftDate }) =>
      computeInsights({
        shiftDate,
        getSettings: db.getSettings,
        getCallflowHourly: db.getCallflowHourly,
        getShiftSummary: db.getShiftSummary,
        getLatestRawSnapshotForShift: db.getLatestRawSnapshotForShift,
        getCallflowHourlyRange: db.getCallflowHourlyRange,
        getRecentCallflowSnapshots: db.getRecentCallflowSnapshots,
        getCampaignSnapshotStats: db.getCampaignSnapshotStats,
        getAgentSnapshotStats: db.getAgentSnapshotStats,
        getAgentStateTransitions: db.getAgentStateTransitions,
        getShiftComparisons: db.getShiftComparisons,
      }),
    listShiftDates: db.listShiftDates,
    getCampaignSnapshotStats: db.getCampaignSnapshotStats,
    getAgentSnapshotStats: db.getAgentSnapshotStats,
    getAgentStateTransitions: db.getAgentStateTransitions,
  }),
);

server.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(
    `Live Gateway listening on http://localhost:${PORT} (ws path: /ws)`,
  );
});

setInterval(autoGenerateShiftReportIfDue, 30 * 1000);
