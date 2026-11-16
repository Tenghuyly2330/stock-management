/**
 * Standard API response helper for unified client responses.
 */

const successResponse = (res, { statusCode = 200, message = 'Success', data = null, meta = null } = {}) => {
  const payload = {
    success: true,
    message,
    data,
  };
  if (meta) {
    payload.meta = meta;
  }
  return res.status(statusCode).json(payload);
};

const errorResponse = (res, { statusCode = 500, message = 'Internal Server Error', errors = null, code = null } = {}) => {
  const payload = {
    success: false,
    message,
  };
  if (errors) {
    payload.errors = errors;
  }
  if (code) {
    payload.code = code;
  }
  return res.status(statusCode).json(payload);
};

const paginatedResponse = (res, { data, total, page = 1, limit = 10, message = 'Data fetched successfully' }) => {
  const totalPages = Math.ceil(total / limit);
  return successResponse(res, {
    statusCode: 200,
    message,
    data,
    meta: {
      total,
      page: Number(page),
      limit: Number(limit),
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    },
  });
};

module.exports = {
  successResponse,
  errorResponse,
  paginatedResponse,
};
