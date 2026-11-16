const jwt = require('jsonwebtoken');
const env = require('../config/env');
const { errorResponse } = require('../utils/response');
const { query } = require('../config/db');

/**
 * Authentication Middleware:
 * Verifies JWT token from Authorization header and loads user session.
 */
const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return errorResponse(res, {
        statusCode: 401,
        message: 'Authentication token missing or invalid format. Please log in.',
        code: 'UNAUTHORIZED',
      });
    }

    const token = authHeader.split(' ')[1];
    let decoded;
    try {
      decoded = jwt.verify(token, env.JWT_SECRET);
    } catch (jwtErr) {
      if (jwtErr.name === 'TokenExpiredError') {
        return errorResponse(res, {
          statusCode: 401,
          message: 'Authentication session expired. Please log in again.',
          code: 'TOKEN_EXPIRED',
        });
      }
      return errorResponse(res, {
        statusCode: 401,
        message: 'Invalid authentication token.',
        code: 'INVALID_TOKEN',
      });
    }

    // Verify user is still active in database
    const userRes = await query(
      `SELECT u.id, u.email, u.first_name, u.last_name, u.is_active, r.name as role
       FROM users u
       JOIN roles r ON u.role_id = r.id
       WHERE u.id = $1`,
      [decoded.id]
    );

    if (userRes.rowCount === 0 || !userRes.rows[0].is_active) {
      return errorResponse(res, {
        statusCode: 401,
        message: 'User account not found or has been deactivated.',
        code: 'ACCOUNT_DEACTIVATED',
      });
    }

    const user = userRes.rows[0];
    req.user = {
      id: user.id,
      email: user.email,
      firstName: user.first_name,
      lastName: user.last_name,
      role: user.role,
    };

    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Authorization Middleware (RBAC):
 * Validates that authenticated user has one of the allowed roles.
 * @param  {...string} allowedRoles - E.g. 'admin', 'manager'
 */
const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return errorResponse(res, {
        statusCode: 401,
        message: 'Authentication required.',
        code: 'UNAUTHORIZED',
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return errorResponse(res, {
        statusCode: 403,
        message: `Forbidden: Access requires one of [${allowedRoles.join(', ')}] roles. Your role is '${req.user.role}'.`,
        code: 'FORBIDDEN',
      });
    }

    next();
  };
};

module.exports = {
  authenticate,
  authorize,
};

