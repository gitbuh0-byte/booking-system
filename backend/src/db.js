import pg from 'pg';

export const databaseConfigured = Boolean(process.env.DATABASE_URL);

export const pool = databaseConfigured
  ? new pg.Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.DATABASE_URL.includes('localhost')
        ? false
        : { rejectUnauthorized: false },
    })
  : null;
