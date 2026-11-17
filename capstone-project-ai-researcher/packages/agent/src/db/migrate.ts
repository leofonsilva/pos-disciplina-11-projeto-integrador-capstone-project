import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { Pool } from 'pg';

const migrationsFolder = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../migrations',
);

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

try {
  await migrate(drizzle(pool), { migrationsFolder });
  console.log('Migrations aplicadas.');
} finally {
  await pool.end();
}
