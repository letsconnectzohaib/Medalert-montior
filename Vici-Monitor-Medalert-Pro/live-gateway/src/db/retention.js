const { initDb, getDb, persist } = require('./core');

async function cleanupRetention(settings) {
  await initDb();
  const db = getDb();
  const retention = settings?.retention || {};
  const rawDays = Math.max(1, Number(retention.rawSnapshotsDays ?? 14));
  const bucketDays = Math.max(1, Number(retention.bucketsDays ?? 60));
  const alertsDays = Math.max(1, Number(retention.alertsDays ?? 30));

  const rawCutoff = new Date(Date.now() - rawDays * 24 * 60 * 60 * 1000).toISOString();
  db.run(`DELETE FROM raw_snapshots WHERE ts < ?`, [rawCutoff]);
  db.run(`DELETE FROM callflow_snapshots WHERE ts < ?`, [rawCutoff]);

  const bdt = new Date(Date.now() - bucketDays * 24 * 60 * 60 * 1000);
  const bucketCutoff = bdt.toISOString().slice(0, 10);
  db.run(`DELETE FROM shift_buckets WHERE shift_date < ?`, [bucketCutoff]);
  db.run(`DELETE FROM callflow_hourly WHERE shift_date < ?`, [bucketCutoff]);

  const adt = new Date(Date.now() - alertsDays * 24 * 60 * 60 * 1000).toISOString();
  db.run(`DELETE FROM alerts WHERE ts < ?`, [adt]);

  persist();
}

module.exports = {
  cleanupRetention
};

