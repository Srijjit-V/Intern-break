/** Database connection setup using Drizzle ORM with MySQL2. */

import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import { getDatabaseCredentials } from './config';
import * as schema from './schema';

// Get database configuration
const dbConfig = getDatabaseCredentials();

// Create MySQL connection pool (TLS only when DB_SSL is set)
const poolConnection = mysql.createPool({
  host: dbConfig.host,
  port: dbConfig.port,
  user: dbConfig.user,
  password: dbConfig.password,
  database: dbConfig.database,
  ...(dbConfig.ssl ? { ssl: dbConfig.ssl } : {}),
  // Read and write all timestamps as UTC so age checks (race expiry) do not depend on the Node host's timezone.
  timezone: 'Z',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

// Make the MySQL session agree with `timezone: 'Z'`, whatever the server's own zone is.
poolConnection.pool.on('connection', (connection) => {
  connection.query("SET time_zone = '+00:00'");
});

// Create Drizzle instance
export const db = drizzle(poolConnection, { schema, mode: 'default' });

/**
 * Test database connection
 */
export async function testConnection(): Promise<boolean> {
  try {
    const connection = await poolConnection.getConnection();
    await connection.ping();
    connection.release();
    return true;
  } catch {
    return false;
  }
}

/**
 * Close database connection pool
 */
export async function closeConnection(): Promise<void> {
  await poolConnection.end();
}
