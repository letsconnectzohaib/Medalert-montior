const fs = require('fs');
const path = require('path');
const { initDb, getDb, persist } = require('./core');

const REPORTS_DIR =
  process.env.REPORTS_DIR || path.join(__dirname, '..', 'data', 'reports');

function ensureDir() {
  if (!fs.existsSync(REPORTS_DIR)) fs.mkdirSync(REPORTS_DIR, { recursive: true });
}

function safeFilename(name) {
  return String(name || '')
    .replaceAll(':', '-')
    .replaceAll('/', '-')
    .replaceAll('\\', '-')
    .replaceAll('..', '.')
    .replaceAll(' ', '_');
}

async function saveReportFile({ kind, format, shiftDate, createdAtIso, content }) {
  ensureDir();
  const fname = safeFilename(`${kind}_${shiftDate}_${createdAtIso}.${format}`);
  const filePath = path.join(REPORTS_DIR, fname);
  fs.writeFileSync(filePath, content, 'utf8');
  return filePath;
}

async function addGeneratedReport({ shiftDate, kind = 'shift', format = 'html', filePath, createdAtIso }) {
  await initDb();
  const db = getDb();
  const createdAt = createdAtIso || new Date().toISOString();
  db.run(
    `INSERT INTO generated_reports (created_at, shift_date, kind, format, file_path)
     VALUES (?, ?, ?, ?, ?)`,
    [createdAt, shiftDate, kind, format, filePath]
  );
  persist();

  const idStmt = db.prepare('SELECT last_insert_rowid() AS id;');
  let id = null;
  if (idStmt.step()) id = Number(idStmt.getAsObject().id);
  idStmt.free();
  return { id, created_at: createdAt, shift_date: shiftDate, kind, format, file_path: filePath };
}

async function listReports({ kind = null, limit = 50, shiftDate = null } = {}) {
  await initDb();
  const db = getDb();
  const lim = Math.min(200, Math.max(1, Number(limit) || 50));
  const bind = [];
  let where = 'WHERE 1=1';
  if (kind) {
    where += ' AND kind = ?';
    bind.push(String(kind));
  }
  if (shiftDate) {
    where += ' AND shift_date = ?';
    bind.push(String(shiftDate));
  }
  bind.push(lim);

  const stmt = db.prepare(
    `SELECT id, created_at, shift_date, kind, format, file_path
     FROM generated_reports
     ${where}
     ORDER BY created_at DESC
     LIMIT ?`
  );
  stmt.bind(bind);
  const rows = [];
  while (stmt.step()) rows.push(stmt.getAsObject());
  stmt.free();
  return rows;
}

async function getReportById(id) {
  await initDb();
  const db = getDb();
  const stmt = db.prepare(
    `SELECT id, created_at, shift_date, kind, format, file_path
     FROM generated_reports
     WHERE id = ?
     LIMIT 1`
  );
  stmt.bind([Number(id)]);
  let row = null;
  if (stmt.step()) row = stmt.getAsObject();
  stmt.free();
  return row;
}

module.exports = {
  saveReportFile,
  addGeneratedReport,
  listReports,
  getReportById
};

