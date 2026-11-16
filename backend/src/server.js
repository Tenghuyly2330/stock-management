const app = require('./app');
const env = require('./config/env');
const { testConnection, pool } = require('./config/db');

const PORT = env.PORT;

const server = app.listen(PORT, async () => {
  console.log('====================================================');
  console.log(` Stock Management API Server Started!`);
  console.log(` Port:        http://localhost:${PORT}`);
  console.log(` Health:      http://localhost:${PORT}/api/health`);
  console.log(` DB Health:   http://localhost:${PORT}/api/health/db`);
  console.log(` Environment: ${env.NODE_ENV}`);
  console.log('====================================================');

  // Verify database connectivity on boot
  try {
    const dbStatus = await testConnection();
    console.log(` [DATABASE] Connected to PostgreSQL successfully! (${dbStatus.latencyMs}ms)`);
  } catch (err) {
    console.error(` [DATABASE] Warning: Failed to connect to database on startup:`, err.message);
    console.error(' [DATABASE] The server will still run, but DB-dependent routes will fail until connection is resolved.');
  }
});

// Graceful shutdown handling
const handleGracefulShutdown = (signal) => {
  console.log(`\nReceived ${signal}. Gracefully shutting down...`);
  server.close(async () => {
    console.log('HTTP server closed.');
    try {
      await pool.end();
      console.log('PostgreSQL connection pool closed.');
      process.exit(0);
    } catch (err) {
      console.error('Error closing PostgreSQL pool:', err.message);
      process.exit(1);
    }
  });

  // Force close after 10s if graceful shutdown hangs
  setTimeout(() => {
    console.error('Could not close connections in time, forcefully shutting down');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => handleGracefulShutdown('SIGTERM'));
process.on('SIGINT', () => handleGracefulShutdown('SIGINT'));

