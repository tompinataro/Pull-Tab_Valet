import * as SQLite from 'expo-sqlite';

// Native (iOS/Android) local storage for offline-first scanning.

const DB_NAME = 'pull_tab_valet.db';
let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

export function getDb() {
  if (!dbPromise) dbPromise = SQLite.openDatabaseAsync(DB_NAME);
  return dbPromise;
}

export async function ensureSchema() {
  const db = await getDb();
  await db.execAsync(`
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS scan_queue (
      venue_id TEXT NOT NULL,
      upc TEXT NOT NULL,
      first_scanned_at TEXT NOT NULL,
      last_scanned_at TEXT NOT NULL,
      PRIMARY KEY (venue_id, upc)
    );
  `);
}

export async function upsertScan(venueId: string, upcRaw: string) {
  const upc = upcRaw.trim();
  if (!venueId || !upc) return;
  const db = await getDb();
  const now = new Date().toISOString();
  await db.runAsync(
    `INSERT INTO scan_queue (venue_id, upc, first_scanned_at, last_scanned_at)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(venue_id, upc) DO UPDATE SET last_scanned_at = excluded.last_scanned_at;`,
    [venueId, upc, now, now]
  );
}

export async function countQueuedForVenue(venueId: string): Promise<number> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ count: number }>(
    `SELECT COUNT(*) as count FROM scan_queue WHERE venue_id = ?;`,
    [venueId]
  );
  return row?.count ?? 0;
}
