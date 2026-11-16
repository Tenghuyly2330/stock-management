const morgan = require('morgan');
const env = require('../config/env');

// Use short/dev format in development, combined in production
const format = env.isProduction ? 'combined' : 'dev';

const requestLogger = morgan(format);

module.exports = requestLogger;

