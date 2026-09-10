import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function run() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is not set. Create backend/.env from .env.example before running migrations.');
  }

  const migrationsPath = path.join(__dirname, '..', 'migrations');
  const migrationFiles = fs.readdirSync(migrationsPath)
    .filter((file) => file.endsWith('.sql'))
    .sort();

  const client = new pg.Client({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL.includes('localhost')
      ? false
      : { rejectUnauthorized: false },
  });
  await client.connect();

  for (const migrationFile of migrationFiles) {
    const sql = fs.readFileSync(path.join(migrationsPath, migrationFile), 'utf8');
    console.log(`Running migration: ${migrationFile}`);
    await client.query(sql);
  }
  console.log('Done.');

  await client.end();
}

run().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
