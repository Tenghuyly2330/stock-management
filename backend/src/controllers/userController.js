const bcrypt = require('bcryptjs');
const { query } = require('../config/db');
const { successResponse, errorResponse, paginatedResponse } = require('../utils/response');

/**
 * @desc    Get all users with search, role filter, and pagination
 * @route   GET /api/users
 * @access  Private (Admin, Manager)
 */
const getUsers = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const offset = (page - 1) * limit;
    const search = req.query.search ? req.query.search.trim() : '';
    const roleId = req.query.role_id ? parseInt(req.query.role_id, 10) : null;
    const status = req.query.status; // 'active' | 'inactive'

    const conditions = [];
    const params = [];

    if (search) {
      params.push(`%${search.toLowerCase()}%`);
      conditions.push(
        `(LOWER(u.first_name) LIKE $${params.length} OR LOWER(u.last_name) LIKE $${params.length} OR LOWER(u.email) LIKE $${params.length})`
      );
    }

    if (roleId) {
      params.push(roleId);
      conditions.push(`u.role_id = $${params.length}`);
    }

    if (status === 'active') {
      conditions.push('u.is_active = TRUE');
    } else if (status === 'inactive') {
      conditions.push('u.is_active = FALSE');
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Total count query
    const countRes = await query(
      `SELECT COUNT(*)::int as total FROM users u ${whereClause}`,
      params
    );
    const total = countRes.rows[0].total;

    // Data query
    const dataParams = [...params, limit, offset];
    const dataRes = await query(
      `SELECT u.id, u.first_name, u.last_name, u.email, u.phone,
              u.is_active, u.last_login_at, u.created_at, u.role_id,
              r.name as role_name, r.description as role_description
       FROM users u
       JOIN roles r ON u.role_id = r.id
       ${whereClause}
       ORDER BY u.id ASC
       LIMIT $${dataParams.length - 1} OFFSET $${dataParams.length}`,
      dataParams
    );

    return paginatedResponse(res, {
      data: dataRes.rows,
      total,
      page,
      limit,
      message: 'Users retrieved successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get user by ID
 * @route   GET /api/users/:id
 * @access  Private (Admin, Manager)
 */
const getUserById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userRes = await query(
      `SELECT u.id, u.first_name, u.last_name, u.email, u.phone,
              u.is_active, u.last_login_at, u.created_at, u.role_id,
              r.name as role_name
       FROM users u
       JOIN roles r ON u.role_id = r.id
       WHERE u.id = $1`,
      [id]
    );

    if (userRes.rowCount === 0) {
      return errorResponse(res, { statusCode: 404, message: 'User not found.' });
    }

    return successResponse(res, {
      statusCode: 200,
      data: userRes.rows[0],
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Create a new user with role assignment
 * @route   POST /api/users
 * @access  Private (Admin Only)
 */
const createUser = async (req, res, next) => {
  try {
    const { firstName, lastName, email, password, roleId, phone } = req.body;

    if (!firstName || !lastName || !email || !password || !roleId) {
      return errorResponse(res, {
        statusCode: 400,
        message: 'First name, last name, email, password, and roleId are required.',
      });
    }

    if (password.length < 6) {
      return errorResponse(res, {
        statusCode: 400,
        message: 'Password must be at least 6 characters long.',
      });
    }

    const trimmedEmail = email.trim().toLowerCase();

    // Check if email already exists
    const existing = await query('SELECT id FROM users WHERE LOWER(email) = $1', [trimmedEmail]);
    if (existing.rowCount > 0) {
      return errorResponse(res, {
        statusCode: 409,
        message: 'A user with this email address already exists.',
      });
    }

    // Verify role exists
    const roleCheck = await query('SELECT id FROM roles WHERE id = $1', [roleId]);
    if (roleCheck.rowCount === 0) {
      return errorResponse(res, { statusCode: 400, message: 'Specified role ID is invalid.' });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const insertRes = await query(
      `INSERT INTO users (first_name, last_name, email, password_hash, role_id, phone, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, TRUE)
       RETURNING id, first_name, last_name, email, phone, role_id, is_active, created_at`,
      [firstName.trim(), lastName.trim(), trimmedEmail, passwordHash, roleId, phone || null]
    );

    return successResponse(res, {
      statusCode: 201,
      message: 'User created successfully',
      data: insertRes.rows[0],
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update existing user details or role
 * @route   PUT /api/users/:id
 * @access  Private (Admin Only)
 */
const updateUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { firstName, lastName, email, roleId, phone, isActive, password } = req.body;

    const existingRes = await query('SELECT id, email, role_id FROM users WHERE id = $1', [id]);
    if (existingRes.rowCount === 0) {
      return errorResponse(res, { statusCode: 404, message: 'User not found.' });
    }

    // Guard: Prevent deactivating the caller's own admin account
    if (parseInt(id, 10) === req.user.id && isActive === false) {
      return errorResponse(res, {
        statusCode: 400,
        message: 'You cannot deactivate your own active administrator account.',
      });
    }

    // Check email uniqueness if email changed
    if (email) {
      const trimmedEmail = email.trim().toLowerCase();
      const conflict = await query('SELECT id FROM users WHERE LOWER(email) = $1 AND id != $2', [
        trimmedEmail,
        id,
      ]);
      if (conflict.rowCount > 0) {
        return errorResponse(res, {
          statusCode: 409,
          message: 'Another user already exists with this email address.',
        });
      }
    }

    // If new password is provided, hash it
    let passwordClause = '';
    const params = [
      firstName ? firstName.trim() : null,
      lastName ? lastName.trim() : null,
      email ? email.trim().toLowerCase() : null,
      roleId || null,
      phone !== undefined ? phone : null,
      isActive !== undefined ? isActive : null,
      id,
    ];

    if (password && password.length >= 6) {
      const newHash = await bcrypt.hash(password, 10);
      params.push(newHash);
      passwordClause = `, password_hash = $${params.length}`;
    }

    const updateRes = await query(
      `UPDATE users
       SET
         first_name = COALESCE($1, first_name),
         last_name = COALESCE($2, last_name),
         email = COALESCE($3, email),
         role_id = COALESCE($4, role_id),
         phone = COALESCE($5, phone),
         is_active = COALESCE($6, is_active)
         ${passwordClause}
       WHERE id = $7
       RETURNING id, first_name, last_name, email, phone, role_id, is_active, updated_at`,
      params
    );

    return successResponse(res, {
      statusCode: 200,
      message: 'User updated successfully',
      data: updateRes.rows[0],
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete or deactivate user
 * @route   DELETE /api/users/:id
 * @access  Private (Admin Only)
 */
const deleteUser = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (parseInt(id, 10) === req.user.id) {
      return errorResponse(res, {
        statusCode: 400,
        message: 'You cannot delete your own logged-in user account.',
      });
    }

    const userRes = await query('SELECT id FROM users WHERE id = $1', [id]);
    if (userRes.rowCount === 0) {
      return errorResponse(res, { statusCode: 404, message: 'User not found.' });
    }

    // Soft delete / deactivation preserves foreign key history across stock_movements & orders
    await query('UPDATE users SET is_active = FALSE WHERE id = $1', [id]);

    return successResponse(res, {
      statusCode: 200,
      message: 'User account deactivated successfully.',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    List all system roles for dropdowns
 * @route   GET /api/roles
 * @access  Private (Admin, Manager)
 */
const getRoles = async (req, res, next) => {
  try {
    const rolesRes = await query('SELECT id, name, description FROM roles ORDER BY id ASC');
    return successResponse(res, {
      statusCode: 200,
      data: rolesRes.rows,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  getRoles,
};
