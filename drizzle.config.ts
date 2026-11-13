/**
 * Drizzle Kit configuration.
 *
 * - Generate migrations: npm run db:generate
 * - Apply migrations:    npm run db:migrate
 * Credentials come from src/server/db/config.ts (env vars).
 */
import { defineConfig } from 'drizzle-kit';
import { getDatabaseCredentials } from './src/server/db/config';

// `drizzle-kit generate` needs no database; only migrate/push do (and they use
// scripts/migrate.ts). Fall back to a placeholder so generate works offline.
let credentials;
try {
  credentials = getDatabaseCredentials();
} catch {
  credentials = { host: 'localhost', port: 3306, user: 'unused', password: '', database: 'unused', ssl: false as const };
}

export default defineConfig({
  schema: './src/server/db/schema.ts',
  out: './drizzle',
  dialect: 'mysql',
  dbCredentials: {
    host: credentials.host,
    port: credentials.port,
    user: credentials.user,
    password: credentials.password,
    database: credentials.database,
    ...(credentials.ssl ? { ssl: credentials.ssl } : {}),
  },
  verbose: true,
  strict: false,
});
