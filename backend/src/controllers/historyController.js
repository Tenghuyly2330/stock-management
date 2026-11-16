const { pool, query } = require('../config/db');
const { successResponse, errorResponse, paginatedResponse } = require('../utils/response');

// Base Warehouse ID is 1
const BASE_WAREHOUSE_ID = 1;

/**
 * @desc    Get unified history log of who bought and who added products
 * @route   GET /api/history
 * @access  Private (All authenticated roles)
 */
const getHistory = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;
    const offset = (page - 1) * limit;
    const type = req.query.type; // 'ADD' | 'BUY' | 'ALL'
    const search = req.query.search ? req.query.search.trim().toLowerCase() : '';

    const conditions = [];
    const params = [];

    // Filter by Action Type:
    // ADD -> movement_type = 'IN'
    // BUY -> movement_type = 'OUT'
    if (type === 'ADD') {
      conditions.push(`sm.movement_type = 'IN'`);
    } else if (type === 'BUY') {
      conditions.push(`sm.movement_type = 'OUT'`);
    } else {
      // By default show IN and OUT (Added and Bought)
      conditions.push(`sm.movement_type IN ('IN', 'OUT')`);
    }

    if (search) {
      params.push(`%${search}%`);
      conditions.push(
        `(LOWER(p.name) LIKE $${params.length} OR ` +
        `LOWER(p.sku) LIKE $${params.length} OR ` +
        `LOWER(COALESCE(sm.reference_id, '')) LIKE $${params.length} OR ` +
        `LOWER(COALESCE(sm.notes, '')) LIKE $${params.length} OR ` +
        `LOWER(CONCAT(u.first_name, ' ', u.last_name)) LIKE $${params.length})`
      );
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Summary statistics for History
    const statsSql = `
      SELECT 
        COALESCE(SUM(CASE WHEN sm.movement_type = 'IN' THEN sm.quantity ELSE 0 END), 0)::INT AS total_added_units,
        COALESCE(SUM(CASE WHEN sm.movement_type = 'OUT' THEN sm.quantity ELSE 0 END), 0)::INT AS total_bought_units,
        COALESCE(SUM(CASE WHEN sm.movement_type = 'OUT' THEN sm.quantity * p.selling_price ELSE 0 END), 0.00)::NUMERIC(14, 2) AS total_bought_value,
        COALESCE(SUM(CASE WHEN sm.movement_type = 'IN' THEN sm.quantity * p.purchase_price ELSE 0 END), 0.00)::NUMERIC(14, 2) AS total_added_value
      FROM stock_movements sm
      JOIN products p ON sm.product_id = p.id
      WHERE sm.movement_type IN ('IN', 'OUT')
    `;
    const statsResult = await query(statsSql);
    const summaryStats = statsResult.rows[0];

    // Filtered count
    const countSql = `
      SELECT COUNT(*)
      FROM stock_movements sm
      JOIN products p ON sm.product_id = p.id
      LEFT JOIN users u ON sm.created_by = u.id
      ${whereClause}
    `;
    const countResult = await query(countSql, params);
    const totalRecords = parseInt(countResult.rows[0].count, 10);

    // List query
    const listSql = `
      SELECT 
        sm.id,
        sm.created_at,
        CASE 
          WHEN sm.movement_type = 'IN' THEN 'ADD'
          WHEN sm.movement_type = 'OUT' THEN 'BUY'
          ELSE sm.movement_type
        END AS action,
        sm.movement_type,
        sm.quantity,
        sm.reference_type,
        sm.reference_id AS party_name,
        sm.notes,
        p.id AS product_id,
        p.name AS product_name,
        p.sku AS product_sku,
        p.image_url AS product_image,
        c.name AS category_name,
        CASE 
          WHEN sm.movement_type = 'IN' THEN p.purchase_price
          ELSE p.selling_price
        END AS unit_price,
        CASE 
          WHEN sm.movement_type = 'IN' THEN (sm.quantity * p.purchase_price)::NUMERIC(14, 2)
          ELSE (sm.quantity * p.selling_price)::NUMERIC(14, 2)
        END AS total_amount,
        u.id AS user_id,
        CONCAT(u.first_name, ' ', u.last_name) AS user_name,
        u.email AS user_email
      FROM stock_movements sm
      JOIN products p ON sm.product_id = p.id
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN users u ON sm.created_by = u.id
      ${whereClause}
      ORDER BY sm.created_at DESC
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}
    `;

    const listParams = [...params, limit, offset];
    const listResult = await query(listSql, listParams);

    return res.status(200).json({
      success: true,
      message: 'History records retrieved successfully',
      data: listResult.rows,
      meta: {
        page,
        limit,
        total: totalRecords,
        totalPages: Math.ceil(totalRecords / limit),
      },
      stats: summaryStats,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Record adding stock into Base Warehouse (who added & supplier)
 * @route   POST /api/history/add
 * @access  Private (Admin, Manager, Staff)
 */
const recordAddProduct = async (req, res, next) => {
  const client = await pool.connect();
  try {
    const { productId, quantity, supplierName, unitCost, notes } = req.body;

    const parsedQty = parseInt(quantity, 10);
    const parsedProdId = parseInt(productId, 10);

    if (!parsedProdId || isNaN(parsedProdId)) {
      return errorResponse(res, { statusCode: 400, message: 'Valid product is required' });
    }
    if (!parsedQty || isNaN(parsedQty) || parsedQty <= 0) {
      return errorResponse(res, { statusCode: 400, message: 'Quantity must be a positive integer greater than zero' });
    }

    const cleanSupplier = supplierName ? supplierName.trim() : 'Approved Supplier';

    await client.query('BEGIN');

    // 1. Check product
    const prodCheck = await client.query('SELECT id, name, sku, purchase_price, selling_price FROM products WHERE id = $1', [parsedProdId]);
    if (prodCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      return errorResponse(res, { statusCode: 404, message: 'Product not found' });
    }
    const product = prodCheck.rows[0];

    // Optional: update unit cost if provided
    if (unitCost && parseFloat(unitCost) > 0) {
      await client.query('UPDATE products SET purchase_price = $1 WHERE id = $2', [parseFloat(unitCost), parsedProdId]);
    }

    // 2. Add / Upsert stock into Base Warehouse
    const upsertSql = `
      INSERT INTO inventory (product_id, warehouse_id, quantity)
      VALUES ($1, $2, $3)
      ON CONFLICT (product_id, warehouse_id)
      DO UPDATE SET quantity = inventory.quantity + EXCLUDED.quantity
      RETURNING quantity
    `;
    const invRes = await client.query(upsertSql, [parsedProdId, BASE_WAREHOUSE_ID, parsedQty]);
    const newStock = invRes.rows[0].quantity;

    // 3. Log into stock_movements
    const moveSql = `
      INSERT INTO stock_movements (
        product_id,
        destination_warehouse_id,
        movement_type,
        quantity,
        reference_type,
        reference_id,
        notes,
        created_by
      ) VALUES ($1, $2, 'IN', $3, 'PURCHASE_ORDER', $4, $5, $6)
      RETURNING *
    `;

    const notesText = notes ? notes.trim() : `Received ${parsedQty} units from ${cleanSupplier}`;
    const moveRes = await client.query(moveSql, [
      parsedProdId,
      BASE_WAREHOUSE_ID,
      parsedQty,
      cleanSupplier,
      notesText,
      req.user.id,
    ]);

    await client.query('COMMIT');

    return successResponse(res, {
      statusCode: 201,
      data: {
        movement: moveRes.rows[0],
        newStock,
        productName: product.name,
        quantity: parsedQty,
        supplierName: cleanSupplier,
      },
      message: `Successfully added ${parsedQty} units of ${product.name} to Base Warehouse from ${cleanSupplier}`,
    });
  } catch (error) {
    await client.query('ROLLBACK');
    next(error);
  } finally {
    client.release();
  }
};

/**
 * @desc    Record customer buying products (who bought & sold by user)
 * @route   POST /api/history/buy
 * @access  Private (Admin, Manager, Staff)
 */
const recordBuyProduct = async (req, res, next) => {
  const client = await pool.connect();
  try {
    const { productId, quantity, customerName, unitPrice, notes } = req.body;

    const parsedQty = parseInt(quantity, 10);
    const parsedProdId = parseInt(productId, 10);

    if (!parsedProdId || isNaN(parsedProdId)) {
      return errorResponse(res, { statusCode: 400, message: 'Valid product is required' });
    }
    if (!parsedQty || isNaN(parsedQty) || parsedQty <= 0) {
      return errorResponse(res, { statusCode: 400, message: 'Quantity must be a positive integer greater than zero' });
    }

    const cleanCustomer = customerName ? customerName.trim() : 'Walk-in Customer';

    await client.query('BEGIN');

    // 1. Lock stock row in Base Warehouse
    const lockSql = `
      SELECT i.quantity, p.name AS product_name, p.selling_price
      FROM inventory i
      JOIN products p ON i.product_id = p.id
      WHERE i.product_id = $1 AND i.warehouse_id = $2
      FOR UPDATE
    `;
    const lockResult = await client.query(lockSql, [parsedProdId, BASE_WAREHOUSE_ID]);

    if (lockResult.rows.length === 0 || lockResult.rows[0].quantity < parsedQty) {
      const available = lockResult.rows.length > 0 ? lockResult.rows[0].quantity : 0;
      await client.query('ROLLBACK');
      return errorResponse(res, {
        statusCode: 400,
        message: `Insufficient stock in Base Warehouse. Available: ${available} units, Requested: ${parsedQty} units.`,
      });
    }

    const currentItem = lockResult.rows[0];

    // 2. Deduct stock from Base Warehouse
    const updateSql = `
      UPDATE inventory
      SET quantity = quantity - $1
      WHERE product_id = $2 AND warehouse_id = $3
      RETURNING quantity
    `;
    const updateResult = await client.query(updateSql, [parsedQty, parsedProdId, BASE_WAREHOUSE_ID]);
    const remainingStock = updateResult.rows[0].quantity;

    // 3. Log movement
    const finalPrice = unitPrice && parseFloat(unitPrice) > 0 ? parseFloat(unitPrice) : currentItem.selling_price;
    const totalSale = (finalPrice * parsedQty).toFixed(2);
    const notesText = notes ? notes.trim() : `Sold to ${cleanCustomer} at $${finalPrice}/unit (Total: $${totalSale})`;

    const moveSql = `
      INSERT INTO stock_movements (
        product_id,
        source_warehouse_id,
        movement_type,
        quantity,
        reference_type,
        reference_id,
        notes,
        created_by
      ) VALUES ($1, $2, 'OUT', $3, 'SALES_ORDER', $4, $5, $6)
      RETURNING *
    `;

    const moveResult = await client.query(moveSql, [
      parsedProdId,
      BASE_WAREHOUSE_ID,
      parsedQty,
      cleanCustomer,
      notesText,
      req.user.id,
    ]);

    await client.query('COMMIT');

    return successResponse(res, {
      statusCode: 200,
      data: {
        movement: moveResult.rows[0],
        remainingStock,
        productName: currentItem.product_name,
        quantity: parsedQty,
        customerName: cleanCustomer,
        totalSale,
      },
      message: `Sale recorded: ${cleanCustomer} bought ${parsedQty} units of ${currentItem.product_name} (Total: $${totalSale})`,
    });
  } catch (error) {
    await client.query('ROLLBACK');
    next(error);
  } finally {
    client.release();
  }
};

module.exports = {
  getHistory,
  recordAddProduct,
  recordBuyProduct,
};
