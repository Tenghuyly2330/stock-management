const dotenv = require('dotenv');
const path = require('path');

// Load environment variables from backend/.env
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const requiredVars = ['DB_URL'];

// Validate critical variables in production/development
for (const varName of requiredVars) {
  if (!process.env[varName]) {
    console.warn(`[WARNING] Environment variable ${varName} is missing in .env!`);
  }
}

const env = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT, 10) || 5000,
  DB_URL: process.env.DB_URL,
  CLIENT_URL: process.env.CLIENT_URL || 'http://localhost:3000',
  JWT_SECRET: process.env.JWT_SECRET || 'dev_secret_stock_inventory_system',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '24h',
  isProduction: process.env.NODE_ENV === 'production',
  isDevelopment: process.env.NODE_ENV !== 'production',
};

module.exports = env;

