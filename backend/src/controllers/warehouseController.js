const { query } = require('../config/db');
const { successResponse, errorResponse, paginatedResponse } = require('../utils/response');

/**
 * @desc    Get all warehouses with stock metrics
 * @route   GET /api/warehouses
 * @access  Private (All authenticated roles)
 */
const getWarehouses = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;
    const offset = (page - 1) * limit;
    const search = req.query.search ? req.query.search.trim().toLowerCase() : '';
    const status = req.query.status;

    const conditions = [];
    const params = [];

    if (search) {
      params.push(`%${search}%`);
      conditions.push(`(LOWER(w.name) LIKE $${params.length} OR LOWER(w.code) LIKE $${params.length} OR LOWER(COALESCE(w.address, '')) LIKE $${params.length})`);
    }

    if (status === 'active') {
      conditions.push('w.is_active = TRUE');
    } else if (status === 'inactive') {
      conditions.push('w.is_active = FALSE');
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Total count query
    const countSql = `SELECT COUNT(*) FROM warehouses w ${whereClause}`;
    const countResult = await query(countSql, params);
    const totalRecords = parseInt(countResult.rows[0].count, 10);

    // Warehouses with aggregated stock metrics
    const listSql = `
      SELECT 
        w.id,
        w.name,
        w.code,
        w.address,
        w.contact_phone,
        w.is_active,
        w.created_at,
        w.updated_at,
        COALESCE(COUNT(DISTINCT i.product_id), 0)::INT AS total_unique_products,
        COALESCE(SUM(i.quantity), 0)::INT AS total_stock_units,
        COALESCE(SUM(i.quantity * p.purchase_price), 0.00)::NUMERIC(14, 2) AS total_inventory_valuation
      FROM warehouses w
      LEFT JOIN inventory i ON w.id = i.warehouse_id
      LEFT JOIN products p ON i.product_id = p.id
      ${whereClause}
      GROUP BY w.id
      ORDER BY w.name ASC
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}
    `;

    const listParams = [...params, limit, offset];
    const result = await query(listSql, listParams);

    return paginatedResponse(res, {
      data: result.rows,
      total: totalRecords,
      page,
      limit,
      message: 'Warehouses retrieved successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get warehouse by ID with breakdown of stored inventory
 * @route   GET /api/warehouses/:id
 * @access  Private (All authenticated roles)
 */
const getWarehouseById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const warehouseSql = `
      SELECT 
        w.id,
        w.name,
        w.code,
        w.address,
        w.contact_phone,
        w.is_active,
        w.created_at,
        w.updated_at,
        COALESCE(COUNT(DISTINCT i.product_id), 0)::INT AS total_unique_products,
        COALESCE(SUM(i.quantity), 0)::INT AS total_stock_units,
        COALESCE(SUM(i.quantity * p.purchase_price), 0.00)::NUMERIC(14, 2) AS total_inventory_valuation
      FROM warehouses w
      LEFT JOIN inventory i ON w.id = i.warehouse_id
      LEFT JOIN products p ON i.product_id = p.id
      WHERE w.id = $1
      GROUP BY w.id
    `;

    const whResult = await query(warehouseSql, [id]);

    if (whResult.rows.length === 0) {
      return errorResponse(res, { statusCode: 404, message: 'Warehouse not found' });
    }

    // Retrieve inventory breakdown for this warehouse
    const inventorySql = `
      SELECT 
        i.id AS inventory_id,
        i.product_id,
        p.name AS product_name,
        p.sku,
        p.barcode,
        p.image_url,
        c.name AS category_name,
        p.purchase_price,
        p.selling_price,
        p.min_stock_level,
        i.quantity,
        (i.quantity * p.purchase_price)::NUMERIC(14, 2) AS valuation,
        i.updated_at
      FROM inventory i
      JOIN products p ON i.product_id = p.id
      JOIN categories c ON p.category_id = c.id
      WHERE i.warehouse_id = $1
      ORDER BY i.quantity DESC, p.name ASC
    `;

    const invResult = await query(inventorySql, [id]);

    const data = {
      ...whResult.rows[0],
      inventory: invResult.rows,
    };

    return successResponse(res, {
      statusCode: 200,
      data,
      message: 'Warehouse details retrieved successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Create a new warehouse
 * @route   POST /api/warehouses
 * @access  Private (Admin, Manager)
 */
const createWarehouse = async (req, res, next) => {
  try {
    const { name, code, address, contact_phone } = req.body;

    if (!name || !name.trim()) {
      return errorResponse(res, { statusCode: 400, message: 'Warehouse name is required' });
    }
    if (!code || !code.trim()) {
      return errorResponse(res, { statusCode: 400, message: 'Warehouse code is required' });
    }

    const cleanName = name.trim();
    const cleanCode = code.trim().toUpperCase();

    // Check code or name uniqueness
    const checkSql = `SELECT id, name, code FROM warehouses WHERE LOWER(name) = LOWER($1) OR UPPER(code) = $2`;
    const checkResult = await query(checkSql, [cleanName, cleanCode]);

    if (checkResult.rows.length > 0) {
      const match = checkResult.rows[0];
      if (match.code.toUpperCase() === cleanCode) {
        return errorResponse(res, { statusCode: 409, message: `Warehouse code '${cleanCode}' is already registered` });
      }
      return errorResponse(res, { statusCode: 409, message: `Warehouse name '${cleanName}' is already registered` });
    }

    const insertSql = `
      INSERT INTO warehouses (name, code, address, contact_phone, is_active)
      VALUES ($1, $2, $3, $4, TRUE)
      RETURNING *
    `;

    const result = await query(insertSql, [
      cleanName,
      cleanCode,
      address ? address.trim() : null,
      contact_phone ? contact_phone.trim() : null,
    ]);

    return successResponse(res, {
      statusCode: 201,
      data: result.rows[0],
      message: 'Warehouse created successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update a warehouse
 * @route   PUT /api/warehouses/:id
 * @access  Private (Admin, Manager)
 */
const updateWarehouse = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, code, address, contact_phone, is_active } = req.body;

    const findSql = `SELECT * FROM warehouses WHERE id = $1`;
    const findResult = await query(findSql, [id]);

    if (findResult.rows.length === 0) {
      return errorResponse(res, { statusCode: 404, message: 'Warehouse not found' });
    }

    const current = findResult.rows[0];
    const cleanName = name !== undefined ? name.trim() : current.name;
    const cleanCode = code !== undefined ? code.trim().toUpperCase() : current.code;

    // Check code/name conflict
    if (cleanName !== current.name || cleanCode !== current.code) {
      const conflictSql = `
        SELECT id, name, code FROM warehouses 
        WHERE (LOWER(name) = LOWER($1) OR UPPER(code) = $2) AND id != $3
      `;
      const conflictResult = await query(conflictSql, [cleanName, cleanCode, id]);
      if (conflictResult.rows.length > 0) {
        const match = conflictResult.rows[0];
        if (match.code.toUpperCase() === cleanCode) {
          return errorResponse(res, { statusCode: 409, message: `Warehouse code '${cleanCode}' is already in use by another warehouse` });
        }
        return errorResponse(res, { statusCode: 409, message: `Warehouse name '${cleanName}' is already in use by another warehouse` });
      }
    }

    const updateSql = `
      UPDATE warehouses
      SET 
        name = $1,
        code = $2,
        address = $3,
        contact_phone = $4,
        is_active = $5
      WHERE id = $6
      RETURNING *
    `;

    const result = await query(updateSql, [
      cleanName,
      cleanCode,
      address !== undefined ? (address ? address.trim() : null) : current.address,
      contact_phone !== undefined ? (contact_phone ? contact_phone.trim() : null) : current.contact_phone,
      is_active !== undefined ? Boolean(is_active) : current.is_active,
      id,
    ]);

    return successResponse(res, {
      statusCode: 200,
      data: result.rows[0],
      message: 'Warehouse updated successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete or deactivate a warehouse
 * @route   DELETE /api/warehouses/:id
 * @access  Private (Admin only)
 */
const deleteWarehouse = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Check if warehouse exists
    const findSql = `SELECT * FROM warehouses WHERE id = $1`;
    const findResult = await query(findSql, [id]);

    if (findResult.rows.length === 0) {
      return errorResponse(res, { statusCode: 404, message: 'Warehouse not found' });
    }

    // Check if warehouse has any non-zero stock
    const stockSql = `SELECT COALESCE(SUM(quantity), 0)::INT AS total_stock FROM inventory WHERE warehouse_id = $1`;
    const stockResult = await query(stockSql, [id]);
    const totalStock = stockResult.rows[0].total_stock;

    if (totalStock > 0) {
      return errorResponse(res, {
        statusCode: 400,
        message: `Cannot delete warehouse '${findResult.rows[0].name}'. It currently holds ${totalStock} units of inventory. Transfer or adjust stock to 0 first.`,
      });
    }

    // Soft-deactivate if historical transactions exist, or delete if clean
    const historyCheckSql = `
      SELECT 
        (SELECT COUNT(*) FROM stock_movements WHERE source_warehouse_id = $1 OR destination_warehouse_id = $1) AS movement_count,
        (SELECT COUNT(*) FROM purchase_orders WHERE warehouse_id = $1) AS po_count,
        (SELECT COUNT(*) FROM sales_orders WHERE warehouse_id = $1) AS so_count
    `;
    const histResult = await query(historyCheckSql, [id]);
    const { movement_count, po_count, so_count } = histResult.rows[0];
    const totalRefs = parseInt(movement_count, 10) + parseInt(po_count, 10) + parseInt(so_count, 10);

    if (totalRefs > 0) {
      // Historical references exist - soft delete
      await query(`UPDATE warehouses SET is_active = FALSE WHERE id = $1`, [id]);
      return successResponse(res, {
        statusCode: 200,
        data: { id: parseInt(id, 10), is_active: false, soft_deleted: true },
        message: 'Warehouse has historical records and was deactivated instead of deleted',
      });
    }

    // Clean delete
    await query(`DELETE FROM inventory WHERE warehouse_id = $1`, [id]);
    await query(`DELETE FROM warehouses WHERE id = $1`, [id]);

    return successResponse(res, {
      statusCode: 200,
      data: { id: parseInt(id, 10) },
      message: 'Warehouse deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getWarehouses,
  getWarehouseById,
  createWarehouse,
  updateWarehouse,
  deleteWarehouse,
};
