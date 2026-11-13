/** Apply drizzle/ migrations to the configured database. Usage: npm run db:migrate */
import { migrate } from 'drizzle-orm/mysql2/migrator';
import { closeConnection, db } from '../src/server/db/client';

// Database may still be starting (docker compose); retry for ~60s.
for (let attempt = 1; ; attempt++) {
  try {
    await migrate(db, { migrationsFolder: './drizzle' });
    console.log('migrations applied');
    break;
  } catch (error) {
    const code = (error as { code?: string }).code;
    if (attempt >= 30 || !['ECONNREFUSED', 'ETIMEDOUT', 'PROTOCOL_CONNECTION_LOST', 'ENOTFOUND'].includes(code ?? '')) {
      console.error('migration failed:', error instanceof Error ? error.message : error);
      process.exitCode = 1;
      break;
    }
    await new Promise((r) => setTimeout(r, 2000));
  }
}
await closeConnection();
