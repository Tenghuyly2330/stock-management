const fs = require('fs');
const path = require('path');
const { pool } = require('../config/db');
const env = require('../config/env');

async function runMigrations() {
  console.log('====================================================');
  console.log(' Running Database Migrations');
  console.log(` Target DB:    ${env.DB_URL ? env.DB_URL.split('@')[1]?.split('/')[0] : 'Unknown'}`);
  console.log(` Environment:  ${env.NODE_ENV}`);
  console.log('====================================================');

  const client = await pool.connect();

  try {
    // 1. Create migration tracking table if not exists
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        id SERIAL PRIMARY KEY,
        filename VARCHAR(255) UNIQUE NOT NULL,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    // 2. Fetch already applied migrations
    const { rows: appliedMigrations } = await client.query(
      'SELECT filename FROM schema_migrations ORDER BY id ASC'
    );
    const appliedSet = new Set(appliedMigrations.map((m) => m.filename));

    // 3. Read migration directory
    const migrationsDir = path.join(__dirname, 'migrations');
    if (!fs.existsSync(migrationsDir)) {
      throw new Error(`Migrations directory not found at: ${migrationsDir}`);
    }

    const migrationFiles = fs
      .readdirSync(migrationsDir)
      .filter((file) => file.endsWith('.sql'))
      .sort();

    if (migrationFiles.length === 0) {
      console.log('No SQL migration files found.');
      return;
    }

    let appliedCount = 0;

    for (const file of migrationFiles) {
      if (appliedSet.has(file)) {
        console.log(` [SKIP] ${file} (already applied)`);
        continue;
      }

      console.log(` [APPLYING] ${file}...`);
      const filePath = path.join(migrationsDir, file);
      const sql = fs.readFileSync(filePath, 'utf8');

      // Execute within transaction
      await client.query('BEGIN');
      try {
        await client.query(sql);
        await client.query(
          'INSERT INTO schema_migrations (filename) VALUES ($1)',
          [file]
        );
        await client.query('COMMIT');
        console.log(` [SUCCESS]  ${file} applied successfully.`);
        appliedCount++;
      } catch (migrationError) {
        await client.query('ROLLBACK');
        console.error(` [FAILED]   ${file} failed:`, migrationError.message);
        throw migrationError;
      }
    }

    console.log('====================================================');
    console.log(` Migration complete. ${appliedCount} new migration(s) applied.`);
    console.log('====================================================');
  } catch (err) {
    console.error('[MIGRATION ERROR] Migration process aborted:', err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

if (require.main === module) {
  runMigrations();
}

module.exports = runMigrations;

