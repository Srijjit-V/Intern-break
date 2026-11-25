import mysql from 'mysql2/promise';

/** Direct DB access for tests that must move the clock (rows are made "older"). Needs the same DB env as the server. */
function connectionConfig() {
  if (process.env.DATABASE_URL) {
    const u = new URL(process.env.DATABASE_URL);
    return { host: u.hostname, port: Number(u.port || 3306), user: decodeURIComponent(u.username), password: decodeURIComponent(u.password), database: u.pathname.slice(1) };
  }
  const { DB_HOST, DB_PORT, DB_USER, DB_PASS, DB_NAME } = process.env;
  if (!DB_HOST || !DB_USER || !DB_NAME) throw new Error('Set DATABASE_URL or DB_HOST, DB_USER, DB_PASS, DB_NAME for the e2e DB helper');
  return { host: DB_HOST, port: Number(DB_PORT || 3306), user: DB_USER, password: DB_PASS ?? '', database: DB_NAME };
}

/** Make a race and its participants look `seconds` older. */
export async function ageRace(raceId: string, seconds: number): Promise<void> {
  const conn = await mysql.createConnection({ ...connectionConfig(), timezone: 'Z' });
  try {
    await conn.query("SET time_zone = '+00:00'");
    await conn.query('UPDATE typing_races SET created_at = created_at - INTERVAL ? SECOND, updated_at = updated_at - INTERVAL ? SECOND, starts_at = starts_at - INTERVAL ? SECOND WHERE id = ?', [seconds, seconds, seconds, raceId]);
    await conn.query('UPDATE typing_race_participants SET updated_at = updated_at - INTERVAL ? SECOND, finished_at = finished_at - INTERVAL ? SECOND WHERE race_id = ?', [seconds, seconds, raceId]);
  } finally {
    await conn.end();
  }
}
