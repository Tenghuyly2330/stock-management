const env = require('../config/env');
const { errorResponse } = require('../utils/response');

/**
 * Centralized Express Error Handling Middleware.
 * Catches all thrown synchronous and asynchronous errors.
 */
// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, next) => {
  console.error('[UNHANDLED ERROR]', {
    method: req.method,
    url: req.originalUrl,
    message: err.message,
    stack: env.isDevelopment ? err.stack : undefined,
  });

  const statusCode = err.statusCode || (res.statusCode !== 200 ? res.statusCode : 500);
  const message = err.isOperational || env.isDevelopment ? err.message : 'Internal Server Error';

  return errorResponse(res, {
    statusCode,
    message,
    errors: err.errors || null,
    code: err.code || 'INTERNAL_ERROR',
  });
};

module.exports = errorHandler;
