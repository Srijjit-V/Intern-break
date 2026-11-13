/**
 * Database configuration loader.
 *
 * Resolution order:
 *   1. DATABASE_URL (mysql://user:pass@host:port/name)
 *   2. DB_HOST, DB_PORT, DB_USER, DB_PASS, DB_NAME
 *   3. Legacy Airo/Nomad $NOMAD_TASK_DIR/config.json, only if the file exists
 *
 * DB_SSL=true enables TLS. DB_SSL_REJECT_UNAUTHORIZED=false disables certificate checks.
 */
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { env } from 'node:process';

export interface DatabaseCredentials {
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
  ssl: false | { rejectUnauthorized: boolean };
}

function sslFromEnv(): DatabaseCredentials['ssl'] {
  if (!/^(1|true|yes)$/i.test(env.DB_SSL ?? '')) return false;
  return { rejectUnauthorized: !/^(0|false|no)$/i.test(env.DB_SSL_REJECT_UNAUTHORIZED ?? '') };
}

function fromUrl(raw: string): DatabaseCredentials {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new Error('DATABASE_URL is not a valid URL (expected mysql://user:pass@host:3306/name)');
  }
  const database = url.pathname.replace(/^\//, '');
  if (!url.hostname || !url.username || !database) {
    throw new Error('DATABASE_URL must include user, host and database name');
  }
  return {
    host: url.hostname,
    port: url.port ? parseInt(url.port, 10) : 3306,
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    database,
    ssl: sslFromEnv(),
  };
}

function fromNomadFile(configPath: string): DatabaseCredentials {
  try {
    const db = JSON.parse(readFileSync(configPath, 'utf-8'))?.DATABASE?.VALUE;
    if (!db?.HOST || !db.PORT || !db.USERNAME || !db.PASSWORD || !db.NAME) {
      throw new Error(`Invalid ${configPath}: missing database credentials`);
    }
    return {
      host: db.HOST,
      port: parseInt(String(db.PORT), 10),
      user: db.USERNAME,
      password: db.PASSWORD,
      database: db.NAME,
      // The Airo-managed database always required TLS.
      ssl: env.DB_SSL ? sslFromEnv() : { rejectUnauthorized: false },
    };
  } catch (error) {
    if (error instanceof SyntaxError) throw new Error(`Failed to parse ${configPath}: invalid JSON`);
    throw error;
  }
}

export function getDatabaseCredentials(): DatabaseCredentials {
  if (env.DATABASE_URL) return fromUrl(env.DATABASE_URL);

  const named = ['DB_HOST', 'DB_USER', 'DB_PASS', 'DB_NAME'] as const;
  const present = named.filter((k) => env[k] !== undefined && env[k] !== '');
  if (present.length > 0) {
    const missing = named.filter((k) => !present.includes(k));
    if (missing.length) throw new Error(`Database config incomplete: set ${missing.join(', ')} (or DATABASE_URL)`);
    const port = parseInt(env.DB_PORT || '3306', 10);
    if (!Number.isInteger(port) || port <= 0) throw new Error('DB_PORT must be a positive integer');
    return {
      host: env.DB_HOST!,
      port,
      user: env.DB_USER!,
      password: env.DB_PASS!,
      database: env.DB_NAME!,
      ssl: sslFromEnv(),
    };
  }

  const configPath = join(env.NOMAD_TASK_DIR || '/local', 'config.json');
  if (existsSync(configPath)) return fromNomadFile(configPath);

  throw new Error(
    'Database not configured: set DATABASE_URL or DB_HOST, DB_USER, DB_PASS, DB_NAME (see .env.example)',
  );
}
