const { errorResponse } = require('../utils/response');

const notFoundHandler = (req, res, next) => {
  return errorResponse(res, {
    statusCode: 404,
    message: `Resource not found: [${req.method}] ${req.originalUrl}`,
    code: 'ROUTE_NOT_FOUND',
  });
};

module.exports = notFoundHandler;
