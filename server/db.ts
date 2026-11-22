import { Pool } from 'pg';
import { DATABASE_URL, NODE_ENV, PGSSLMODE } from './config';

let pool: Pool | null = null;

const connStr = DATABASE_URL;
if (connStr && NODE_ENV !== 'test') {
  const useSSL = (() => {
    try {
      const u = new URL(connStr);
      return PGSSLMODE === 'require' || NODE_ENV === 'production' || /amazonaws\.com$/.test(u.hostname);
    } catch {
      return true;
    }
  })();
  pool = new Pool({ connectionString: connStr, ssl: useSSL ? { rejectUnauthorized: false } : undefined });
}

export async function dbQuery<T = any>(text: string, params?: any[]): Promise<{ rows: T[] } | null> {
  if (!pool) return null;
  const res = await pool.query(text, params);
  return { rows: res.rows as T[] };
}

export function hasDb() {
  return !!pool;
}

// All seed statements and transaction controls must run on the same session.
export async function runSeedTransaction(statements: readonly string[]): Promise<void> {
  if (!pool) throw new Error('database not configured');
  const client = await pool.connect();
  let discardClient = false;
  try {
    await client.query('BEGIN');
    for (const statement of statements) await client.query(statement);
    await client.query('COMMIT');
  } catch (primaryError) {
    try {
      await client.query('ROLLBACK');
    } catch {
      // A failed rollback leaves the session state uncertain; do not reuse it.
      discardClient = true;
    }
    throw primaryError;
  } finally {
    try {
      if (discardClient) client.release(true);
      else client.release();
    } catch {
      // Cleanup failure must not rewrite the observed transaction outcome.
    }
  }
}
