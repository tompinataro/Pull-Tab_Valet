const path = require('path');
const os = require('os');

const Database = require('better-sqlite3');

const DB_FILENAME = 'pull_tab_valet.desktop.sqlite';

let db;

function getDbPath() {
  // Store per-user app data (safe for offline-first).
  // Using ~/Library/Application Support/<ProductName>/
  const base = path.join(os.homedir(), 'Library', 'Application Support', 'Pull Tab Valet');
  return path.join(base, DB_FILENAME);
}

function ensureDir(fs, dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function openDb(fs) {
  if (db) return db;
  const dbPath = getDbPath();
  ensureDir(fs, path.dirname(dbPath));
  db = new Database(dbPath);
  return db;
}

function ensureSchema(fs) {
  const d = openDb(fs);
  d.exec(`
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS scan_queue (
      venue_id TEXT NOT NULL,
      upc TEXT NOT NULL,
      first_scanned_at TEXT NOT NULL,
      last_scanned_at TEXT NOT NULL,
      PRIMARY KEY (venue_id, upc)
    );
  `);
  return { ok: true };
}

function upsertScan(fs, venueId, upcRaw) {
  const upc = String(upcRaw || '').trim();
  if (!venueId || !upc) return { ok: true, skipped: true };
  const d = openDb(fs);
  const now = new Date().toISOString();
  const stmt = d.prepare(
    `INSERT INTO scan_queue (venue_id, upc, first_scanned_at, last_scanned_at)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(venue_id, upc) DO UPDATE SET last_scanned_at = excluded.last_scanned_at;`
  );
  stmt.run(String(venueId), upc, now, now);
  return { ok: true };
}

function countQueuedForVenue(fs, venueId) {
  const d = openDb(fs);
  const row = d
    .prepare('SELECT COUNT(*) as count FROM scan_queue WHERE venue_id = ?')
    .get(String(venueId));
  return { ok: true, count: Number(row?.count || 0) };
}

module.exports = {
  ensureSchema,
  upsertScan,
  countQueuedForVenue,
  getDbPath,
};
