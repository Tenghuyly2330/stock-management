const { query } = require('../config/db');
const { successResponse, errorResponse } = require('../utils/response');

/**
 * @desc    Get all categories with product counts and search
 * @route   GET /api/categories
 * @access  Private (All authenticated roles)
 */
const getCategories = async (req, res, next) => {
  try {
    const search = req.query.search ? req.query.search.trim().toLowerCase() : '';
    const status = req.query.status; // 'active' | 'inactive'

    const conditions = [];
    const params = [];

    if (search) {
      params.push(`%${search}%`);
      conditions.push(`(LOWER(c.name) LIKE $${params.length} OR LOWER(c.description) LIKE $${params.length})`);
    }

    if (status === 'active') {
      conditions.push('c.is_active = TRUE');
    } else if (status === 'inactive') {
      conditions.push('c.is_active = FALSE');
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const sql = `
      SELECT 
        c.id, c.name, c.description, c.is_active, c.created_at, c.updated_at,
        COUNT(p.id)::int as product_count,
        COALESCE(SUM(inv.quantity), 0)::int as total_stock_units
      FROM categories c
      LEFT JOIN products p ON c.id = p.category_id AND p.is_active = TRUE
      LEFT JOIN inventory inv ON p.id = inv.product_id
      ${whereClause}
      GROUP BY c.id
      ORDER BY c.name ASC
    `;

    const result = await query(sql, params);

    return successResponse(res, {
      statusCode: 200,
      data: result.rows,
      message: 'Categories retrieved successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get single category with linked active products
 * @route   GET /api/categories/:id
 * @access  Private
 */
const getCategoryById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const catRes = await query('SELECT * FROM categories WHERE id = $1', [id]);
    if (catRes.rowCount === 0) {
      return errorResponse(res, { statusCode: 404, message: 'Category not found.' });
    }

    const prodsRes = await query(
      `SELECT id, name, sku, purchase_price, selling_price, min_stock_level, is_active
       FROM products
       WHERE category_id = $1
       ORDER BY name ASC`,
      [id]
    );

    return successResponse(res, {
      statusCode: 200,
      data: {
        ...catRes.rows[0],
        products: prodsRes.rows,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Create a new category
 * @route   POST /api/categories
 * @access  Private (Admin, Manager)
 */
const createCategory = async (req, res, next) => {
  try {
    const { name, description } = req.body;

    if (!name || !name.trim()) {
      return errorResponse(res, {
        statusCode: 400,
        message: 'Category name is required.',
      });
    }

    const trimmedName = name.trim();

    // Check duplicate name
    const existing = await query('SELECT id FROM categories WHERE LOWER(name) = $1', [trimmedName.toLowerCase()]);
    if (existing.rowCount > 0) {
      return errorResponse(res, {
        statusCode: 409,
        message: `Category with name '${trimmedName}' already exists.`,
      });
    }

    const result = await query(
      `INSERT INTO categories (name, description, is_active)
       VALUES ($1, $2, TRUE)
       RETURNING id, name, description, is_active, created_at`,
      [trimmedName, description ? description.trim() : null]
    );

    return successResponse(res, {
      statusCode: 201,
      message: 'Category created successfully',
      data: result.rows[0],
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update category
 * @route   PUT /api/categories/:id
 * @access  Private (Admin, Manager)
 */
const updateCategory = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, description, isActive } = req.body;

    const existingRes = await query('SELECT id FROM categories WHERE id = $1', [id]);
    if (existingRes.rowCount === 0) {
      return errorResponse(res, { statusCode: 404, message: 'Category not found.' });
    }

    if (name) {
      const trimmedName = name.trim();
      const conflict = await query('SELECT id FROM categories WHERE LOWER(name) = $1 AND id != $2', [
        trimmedName.toLowerCase(),
        id,
      ]);
      if (conflict.rowCount > 0) {
        return errorResponse(res, {
          statusCode: 409,
          message: `Category name '${trimmedName}' is already taken.`,
        });
      }
    }

    const params = [
      name ? name.trim() : null,
      description !== undefined ? description : null,
      isActive !== undefined ? isActive : null,
      id,
    ];

    const result = await query(
      `UPDATE categories
       SET
         name = COALESCE($1, name),
         description = COALESCE($2, description),
         is_active = COALESCE($3, is_active)
       WHERE id = $4
       RETURNING id, name, description, is_active, updated_at`,
      params
    );

    return successResponse(res, {
      statusCode: 200,
      message: 'Category updated successfully',
      data: result.rows[0],
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete or deactivate category
 * @route   DELETE /api/categories/:id
 * @access  Private (Admin only)
 */
const deleteCategory = async (req, res, next) => {
  try {
    const { id } = req.params;

    const existingRes = await query('SELECT id, name FROM categories WHERE id = $1', [id]);
    if (existingRes.rowCount === 0) {
      return errorResponse(res, { statusCode: 404, message: 'Category not found.' });
    }

    // Check if products are assigned to this category
    const prodsCount = await query('SELECT COUNT(*)::int as count FROM products WHERE category_id = $1', [id]);
    if (prodsCount.rows[0].count > 0) {
      return errorResponse(res, {
        statusCode: 400,
        message: `Cannot delete category '${existingRes.rows[0].name}' because it contains ${prodsCount.rows[0].count} product(s). Please reassign or delete the products first.`,
      });
    }

    await query('DELETE FROM categories WHERE id = $1', [id]);

    return successResponse(res, {
      statusCode: 200,
      message: 'Category deleted successfully.',
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory,
};

