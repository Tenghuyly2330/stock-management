const { Pool } = require('pg');
const env = require('./env');

if (!env.DB_URL) {
  console.error('[CRITICAL] DB_URL is not set in environment variables.');
}

// Determine if SSL should be enabled based on connection string or environment
const needsSSL = Boolean(
  env.DB_URL && (
    env.DB_URL.includes('sslmode=require') ||
    env.DB_URL.includes('neon.tech') ||
    env.DB_URL.includes('amazonaws.com') ||
    env.DB_URL.includes('supabase.co') ||
    env.isProduction
  )
);

const pool = new Pool({
  connectionString: env.DB_URL,
  ssl: needsSSL ? { rejectUnauthorized: false } : false,
  max: 20, // Maximum number of clients in the pool
  idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
  connectionTimeoutMillis: 10000, // Return an error after 10 seconds if connection could not be established
});

// Event listeners for connection monitoring
pool.on('connect', () => {
  // Client connected to PostgreSQL pool
});

pool.on('error', (err) => {
  console.error('[DATABASE ERROR] Unexpected error on idle client:', err.message);
});

/**
 * Execute a SQL query using the connection pool.
 * @param {string} text - SQL query text
 * @param {Array} params - Query parameters
 * @returns {Promise<import('pg').QueryResult>}
 */
const query = async (text, params) => {
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    if (env.isDevelopment && duration > 500) {
      console.warn(`[SLOW QUERY] ${text} (${duration}ms)`);
    }
    return res;
  } catch (error) {
    console.error(`[QUERY ERROR] Query failed: ${text}`);
    throw error;
  }
};

/**
 * Test connectivity to the database.
 * @returns {Promise<{ ok: boolean, version: string, timestamp: string, latencyMs: number }>}
 */
const testConnection = async () => {
  const start = Date.now();
  const res = await query('SELECT NOW() as current_time, version() as pg_version');
  const latencyMs = Date.now() - start;
  return {
    ok: true,
    version: res.rows[0].pg_version,
    timestamp: res.rows[0].current_time,
    latencyMs,
  };
};

module.exports = {
  pool,
  query,
  testConnection,
};
