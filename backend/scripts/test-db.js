const { testConnection, pool } = require('../src/config/db');
const env = require('../src/config/env');

async function main() {
  console.log('====================================================');
  console.log('Testing PostgreSQL Connection...');
  console.log(`Environment: ${env.NODE_ENV}`);
  console.log(`Target Host: ${env.DB_URL ? env.DB_URL.split('@')[1]?.split('/')[0] : 'Not specified'}`);
  console.log('====================================================');

  try {
    const result = await testConnection();
    console.log(' Connection Successful!');
    console.log(` Latency: ${result.latencyMs}ms`);
    console.log(` Server Time: ${result.timestamp}`);
    console.log(` Engine Version: ${result.version}`);
    console.log('====================================================');
    process.exit(0);
  } catch (err) {
    console.error(' Database Connection Failed!');
    console.error(`Error: ${err.message}`);
    console.error('====================================================');
    console.error('Troubleshooting Tips:');
    console.error('1. Check if DB_URL in backend/.env is correct.');
    console.error('2. Ensure your internet connection is active if using Neon cloud DB.');
    console.error('3. If using local PostgreSQL, check if the service is running (Port 5432).');
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
