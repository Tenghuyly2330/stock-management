const { pool } = require('../config/db');
const runMigrations = require('./migrate');
const runSeed = require('./seed');
const env = require('../config/env');

async function resetDatabase() {
  if (env.isProduction) {
    console.error('[CRITICAL] Resetting database is prohibited in production environment!');
    process.exit(1);
  }

  console.log('====================================================');
  console.log(' Resetting Database (DROP ALL TABLES -> MIGRATE -> SEED)');
  console.log('====================================================');

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Drop all custom tables in reverse dependency order
    const dropQuery = `
      DROP TABLE IF EXISTS sales_order_items CASCADE;
      DROP TABLE IF EXISTS sales_orders CASCADE;
      DROP TABLE IF EXISTS purchase_order_items CASCADE;
      DROP TABLE IF EXISTS purchase_orders CASCADE;
      DROP TABLE IF EXISTS stock_movements CASCADE;
      DROP TABLE IF EXISTS inventory CASCADE;
      DROP TABLE IF EXISTS warehouses CASCADE;
      DROP TABLE IF EXISTS suppliers CASCADE;
      DROP TABLE IF EXISTS products CASCADE;
      DROP TABLE IF EXISTS categories CASCADE;
      DROP TABLE IF EXISTS users CASCADE;
      DROP TABLE IF EXISTS roles CASCADE;
      DROP TABLE IF EXISTS schema_migrations CASCADE;
    `;
    await client.query(dropQuery);
    await client.query('COMMIT');
    console.log(' All tables dropped cleanly.');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Failed to drop tables:', err.message);
    process.exit(1);
  } finally {
    client.release();
  }

  // Now run migrations and seeding
  await runMigrations();
  await runSeed();
}

if (require.main === module) {
  resetDatabase();
}

module.exports = resetDatabase;
