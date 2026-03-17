const { storeSnapshot, computeShiftDate } = require("./snapshots");
const { getShiftSummary, getPeakHour } = require("./buckets");
const { getCallflowHourly, getCallflowPeakHour } = require("./callflow");
const {
  listTables,
  getTableInfo,
  queryTable,
  prepareClear,
  confirmClear,
} = require("./adminExplorer");
const { getSettings, upsertSetting } = require("./settings");
const {
  saveReportFile,
  addGeneratedReport,
  listReports,
  getReportById,
} = require("./reports");
const { createAlert, listAlerts, updateAlertStatus } = require("./alerts");
const {
  getLatestRawSnapshotForShift,
  getRawSnapshotsForShift,
  getCallflowHourlyRange,
  getCallflowHourlyForDates,
  getRecentCallflowSnapshots,
  listShiftDates,
  getShiftDatesInRange,
  getCampaignSnapshotStats,
  getAgentSnapshotStats,
  getAgentStateTransitions,
  getShiftComparisons,
} = require("./intelligence");

module.exports = {
  // ingest
  storeSnapshot,

  // shift analytics
  getShiftSummary,
  getPeakHour,
  getCallflowHourly,
  getCallflowPeakHour,
  computeShiftDate,

  // admin explorer
  listTables,
  getTableInfo,
  queryTable,
  prepareClear,
  confirmClear,

  // settings
  getSettings,
  upsertSetting,

  // reports
  saveReportFile,
  addGeneratedReport,
  listReports,
  getReportById,

  // alerts
  createAlert,
  listAlerts,
  updateAlertStatus,

  // intelligence helpers
  getLatestRawSnapshotForShift,
  getRawSnapshotsForShift,
  getCallflowHourlyRange,
  getCallflowHourlyForDates,
  getRecentCallflowSnapshots,
  listShiftDates,
  getShiftDatesInRange,
  getCampaignSnapshotStats,
  getAgentSnapshotStats,
  getAgentStateTransitions,
  getShiftComparisons,
};
