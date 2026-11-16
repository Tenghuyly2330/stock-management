const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { query } = require('../config/db');
const env = require('../config/env');
const { successResponse, errorResponse } = require('../utils/response');

/**
 * Generate signed JWT for authenticated user
 */
const generateToken = (user) => {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role,
      firstName: user.first_name,
      lastName: user.last_name,
    },
    env.JWT_SECRET,
    { expiresIn: env.JWT_EXPIRES_IN }
  );
};

/**
 * @desc    Authenticate user & get JWT token
 * @route   POST /api/auth/login
 * @access  Public
 */
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return errorResponse(res, {
        statusCode: 400,
        message: 'Email and password are required.',
        code: 'VALIDATION_ERROR',
      });
    }

    const trimmedEmail = email.trim().toLowerCase();

    // Query user with joined role
    const userRes = await query(
      `SELECT u.id, u.email, u.password_hash, u.first_name, u.last_name, u.phone,
              u.is_active, u.last_login_at, r.name as role
       FROM users u
       JOIN roles r ON u.role_id = r.id
       WHERE LOWER(u.email) = $1`,
      [trimmedEmail]
    );

    if (userRes.rowCount === 0) {
      return errorResponse(res, {
        statusCode: 401,
        message: 'Invalid email or password credentials.',
        code: 'INVALID_CREDENTIALS',
      });
    }

    const user = userRes.rows[0];

    if (!user.is_active) {
      return errorResponse(res, {
        statusCode: 403,
        message: 'Your account is deactivated. Please contact your system administrator.',
        code: 'ACCOUNT_INACTIVE',
      });
    }

    // Compare passwords
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return errorResponse(res, {
        statusCode: 401,
        message: 'Invalid email or password credentials.',
        code: 'INVALID_CREDENTIALS',
      });
    }

    // Update last_login_at timestamp
    await query('UPDATE users SET last_login_at = NOW() WHERE id = $1', [user.id]);

    const token = generateToken(user);

    return successResponse(res, {
      statusCode: 200,
      message: 'Login successful',
      data: {
        token,
        user: {
          id: user.id,
          email: user.email,
          firstName: user.first_name,
          lastName: user.last_name,
          phone: user.phone,
          role: user.role,
          lastLoginAt: user.last_login_at,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get currently authenticated user's profile
 * @route   GET /api/auth/me
 * @access  Private (All authenticated roles)
 */
const getMe = async (req, res, next) => {
  try {
    const userRes = await query(
      `SELECT u.id, u.email, u.first_name, u.last_name, u.phone,
              u.is_active, u.last_login_at, u.created_at, r.name as role
       FROM users u
       JOIN roles r ON u.role_id = r.id
       WHERE u.id = $1`,
      [req.user.id]
    );

    if (userRes.rowCount === 0) {
      return errorResponse(res, {
        statusCode: 404,
        message: 'User not found.',
        code: 'USER_NOT_FOUND',
      });
    }

    const user = userRes.rows[0];
    return successResponse(res, {
      statusCode: 200,
      message: 'User profile retrieved successfully',
      data: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        phone: user.phone,
        role: user.role,
        lastLoginAt: user.last_login_at,
        createdAt: user.created_at,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Change password for authenticated user
 * @route   PUT /api/auth/change-password
 * @access  Private
 */
const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return errorResponse(res, {
        statusCode: 400,
        message: 'Current password and new password are required.',
      });
    }

    if (newPassword.length < 6) {
      return errorResponse(res, {
        statusCode: 400,
        message: 'New password must be at least 6 characters long.',
      });
    }

    const userRes = await query('SELECT password_hash FROM users WHERE id = $1', [req.user.id]);
    if (userRes.rowCount === 0) {
      return errorResponse(res, { statusCode: 404, message: 'User not found.' });
    }

    const isMatch = await bcrypt.compare(currentPassword, userRes.rows[0].password_hash);
    if (!isMatch) {
      return errorResponse(res, {
        statusCode: 400,
        message: 'Current password provided is incorrect.',
      });
    }

    const newHash = await bcrypt.hash(newPassword, 10);
    await query('UPDATE users SET password_hash = $1 WHERE id = $2', [newHash, req.user.id]);

    return successResponse(res, {
      statusCode: 200,
      message: 'Password changed successfully. Please use your new password next time you log in.',
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  login,
  getMe,
  changePassword,
};
