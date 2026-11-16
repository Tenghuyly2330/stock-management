const { pool, query } = require('../config/db');
const { successResponse, errorResponse, paginatedResponse } = require('../utils/response');

/**
 * @desc    Get current inventory levels with product & warehouse breakdown
 * @route   GET /api/inventory
 * @access  Private (All authenticated roles)
 */
const getInventory = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 15;
    const offset = (page - 1) * limit;
    const search = req.query.search ? req.query.search.trim().toLowerCase() : '';
    const warehouseId = req.query.warehouse_id ? parseInt(req.query.warehouse_id, 10) : null;
    const categoryId = req.query.category_id ? parseInt(req.query.category_id, 10) : null;
    const stockStatus = req.query.stock_status; // 'in_stock', 'low_stock', 'out_of_stock'

    const conditions = [];
    const params = [];

    if (search) {
      params.push(`%${search}%`);
      conditions.push(
        `(LOWER(p.name) LIKE $${params.length} OR LOWER(p.sku) LIKE $${params.length} OR LOWER(COALESCE(p.barcode, '')) LIKE $${params.length} OR LOWER(w.name) LIKE $${params.length})`
      );
    }

    if (warehouseId) {
      params.push(warehouseId);
      conditions.push(`i.warehouse_id = $${params.length}`);
    }

    if (categoryId) {
      params.push(categoryId);
      conditions.push(`p.category_id = $${params.length}`);
    }

    if (stockStatus === 'in_stock') {
      conditions.push(`i.quantity > p.min_stock_level`);
    } else if (stockStatus === 'low_stock') {
      conditions.push(`i.quantity > 0 AND i.quantity <= p.min_stock_level`);
    } else if (stockStatus === 'out_of_stock') {
      conditions.push(`i.quantity = 0`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Overall inventory statistics summary
    const statsSql = `
      SELECT 
        COUNT(DISTINCT i.id)::INT AS total_items,
        COALESCE(SUM(i.quantity), 0)::INT AS total_quantity,
        COALESCE(SUM(i.quantity * p.purchase_price), 0.00)::NUMERIC(14, 2) AS total_valuation,
        COUNT(CASE WHEN i.quantity > 0 AND i.quantity <= p.min_stock_level THEN 1 END)::INT AS low_stock_count,
        COUNT(CASE WHEN i.quantity = 0 THEN 1 END)::INT AS out_of_stock_count
      FROM inventory i
      JOIN products p ON i.product_id = p.id
      JOIN warehouses w ON i.warehouse_id = w.id
    `;
    const statsResult = await query(statsSql);
    const summaryStats = statsResult.rows[0];

    // Filtered total count
    const countSql = `
      SELECT COUNT(*) 
      FROM inventory i
      JOIN products p ON i.product_id = p.id
      JOIN warehouses w ON i.warehouse_id = w.id
      LEFT JOIN categories c ON p.category_id = c.id
      ${whereClause}
    `;
    const countResult = await query(countSql, params);
    const totalRecords = parseInt(countResult.rows[0].count, 10);

    // Filtered paginated inventory rows
    const listSql = `
      SELECT 
        i.id,
        i.product_id,
        p.name AS product_name,
        p.sku,
        p.barcode,
        p.image_url,
        c.id AS category_id,
        c.name AS category_name,
        p.purchase_price,
        p.selling_price,
        p.min_stock_level,
        i.warehouse_id,
        w.name AS warehouse_name,
        w.code AS warehouse_code,
        i.quantity,
        (i.quantity * p.purchase_price)::NUMERIC(14, 2) AS valuation,
        CASE
          WHEN i.quantity = 0 THEN 'OUT_OF_STOCK'
          WHEN i.quantity <= p.min_stock_level THEN 'LOW_STOCK'
          ELSE 'IN_STOCK'
        END AS stock_status,
        i.updated_at
      FROM inventory i
      JOIN products p ON i.product_id = p.id
      JOIN warehouses w ON i.warehouse_id = w.id
      LEFT JOIN categories c ON p.category_id = c.id
      ${whereClause}
      ORDER BY 
        CASE 
          WHEN i.quantity = 0 THEN 1
          WHEN i.quantity <= p.min_stock_level THEN 2
          ELSE 3
        END ASC,
        p.name ASC, 
        w.name ASC
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}
    `;

    const listParams = [...params, limit, offset];
    const listResult = await query(listSql, listParams);

    return res.status(200).json({
      success: true,
      message: 'Inventory records retrieved successfully',
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
 * @desc    Get low stock and out of stock alerts
 * @route   GET /api/inventory/low-stock
 * @access  Private (All authenticated roles)
 */
const getLowStockAlerts = async (req, res, next) => {
  try {
    const sql = `
      SELECT 
        p.id AS product_id,
        p.name AS product_name,
        p.sku,
        p.barcode,
        p.image_url,
        c.name AS category_name,
        p.purchase_price,
        p.selling_price,
        p.min_stock_level,
        COALESCE(SUM(i.quantity), 0)::INT AS total_available_stock,
        CASE 
          WHEN COALESCE(SUM(i.quantity), 0) = 0 THEN 'OUT_OF_STOCK'
          ELSE 'LOW_STOCK'
        END AS status,
        json_agg(
          json_build_object(
            'warehouse_id', w.id,
            'warehouse_name', w.name,
            'warehouse_code', w.code,
            'quantity', COALESCE(i.quantity, 0)
          ) ORDER BY w.name
        ) AS warehouse_breakdown
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN inventory i ON p.id = i.product_id
      LEFT JOIN warehouses w ON i.warehouse_id = w.id
      WHERE p.is_active = TRUE
      GROUP BY p.id, c.name
      HAVING COALESCE(SUM(i.quantity), 0) <= p.min_stock_level
      ORDER BY total_available_stock ASC, p.name ASC
    `;

    const result = await query(sql);
    return successResponse(res, {
      statusCode: 200,
      data: result.rows,
      message: 'Low stock alerts retrieved successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Stock In (Increase inventory balance & log movement)
 * @route   POST /api/inventory/stock-in
 * @access  Private (Admin, Manager, Staff)
 */
const stockIn = async (req, res, next) => {
  const client = await pool.connect();
  try {
    const { productId, warehouseId, quantity, referenceType, referenceId, notes } = req.body;

    // Validate inputs
    const parsedQty = parseInt(quantity, 10);
    const parsedProdId = parseInt(productId, 10);
    const parsedWhId = parseInt(warehouseId, 10);

    if (!parsedProdId || isNaN(parsedProdId)) {
      return errorResponse(res, { statusCode: 400, message: 'Valid product ID is required' });
    }
    if (!parsedWhId || isNaN(parsedWhId)) {
      return errorResponse(res, { statusCode: 400, message: 'Valid warehouse ID is required' });
    }
    if (!parsedQty || isNaN(parsedQty) || parsedQty <= 0) {
      return errorResponse(res, { statusCode: 400, message: 'Quantity must be a positive integer greater than zero' });
    }

    // Begin database transaction
    await client.query('BEGIN');

    // Verify product exists and is active
    const prodCheck = await client.query('SELECT id, name, sku FROM products WHERE id = $1', [parsedProdId]);
    if (prodCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      return errorResponse(res, { statusCode: 404, message: 'Product not found' });
    }

    // Verify warehouse exists and is active
    const whCheck = await client.query('SELECT id, name, code, is_active FROM warehouses WHERE id = $1', [parsedWhId]);
    if (whCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      return errorResponse(res, { statusCode: 404, message: 'Warehouse not found' });
    }
    if (!whCheck.rows[0].is_active) {
      await client.query('ROLLBACK');
      return errorResponse(res, { statusCode: 400, message: `Cannot stock in to inactive warehouse '${whCheck.rows[0].name}'` });
    }

    // Upsert inventory record atomically
    const upsertSql = `
      INSERT INTO inventory (product_id, warehouse_id, quantity)
      VALUES ($1, $2, $3)
      ON CONFLICT (product_id, warehouse_id)
      DO UPDATE SET quantity = inventory.quantity + EXCLUDED.quantity
      RETURNING id, product_id, warehouse_id, quantity, updated_at
    `;
    const invResult = await client.query(upsertSql, [parsedProdId, parsedWhId, parsedQty]);
    const updatedInventory = invResult.rows[0];

    const validRefType = ['PURCHASE_ORDER', 'MANUAL_ADJUSTMENT', 'INITIAL_STOCK'].includes(referenceType)
      ? referenceType
      : 'MANUAL_ADJUSTMENT';

    const movementRefId = referenceId ? referenceId.trim() : `IN-${Date.now().toString().slice(-6)}`;

    // Insert audit record into stock_movements
    const movementSql = `
      INSERT INTO stock_movements (
        product_id,
        destination_warehouse_id,
        movement_type,
        quantity,
        reference_type,
        reference_id,
        notes,
        created_by
      ) VALUES ($1, $2, 'IN', $3, $4, $5, $6, $7)
      RETURNING *
    `;
    const moveResult = await client.query(movementSql, [
      parsedProdId,
      parsedWhId,
      parsedQty,
      validRefType,
      movementRefId,
      notes ? notes.trim() : 'Stock In manual receipt',
      req.user.id,
    ]);

    // Commit transaction
    await client.query('COMMIT');

    return successResponse(res, {
      statusCode: 201,
      data: {
        inventory: updatedInventory,
        movement: moveResult.rows[0],
        product: prodCheck.rows[0],
        warehouse: whCheck.rows[0],
      },
      message: `Successfully stocked in ${parsedQty} units of ${prodCheck.rows[0].name} into ${whCheck.rows[0].name}`,
    });
  } catch (error) {
    await client.query('ROLLBACK');
    next(error);
  } finally {
    client.release();
  }
};

/**
 * @desc    Stock Out (Decrease inventory balance & log movement with negative prevention)
 * @route   POST /api/inventory/stock-out
 * @access  Private (Admin, Manager, Staff)
 */
const stockOut = async (req, res, next) => {
  const client = await pool.connect();
  try {
    const { productId, warehouseId, quantity, referenceType, referenceId, notes } = req.body;

    const parsedQty = parseInt(quantity, 10);
    const parsedProdId = parseInt(productId, 10);
    const parsedWhId = parseInt(warehouseId, 10);

    if (!parsedProdId || isNaN(parsedProdId)) {
      return errorResponse(res, { statusCode: 400, message: 'Valid product ID is required' });
    }
    if (!parsedWhId || isNaN(parsedWhId)) {
      return errorResponse(res, { statusCode: 400, message: 'Valid warehouse ID is required' });
    }
    if (!parsedQty || isNaN(parsedQty) || parsedQty <= 0) {
      return errorResponse(res, { statusCode: 400, message: 'Quantity must be a positive integer greater than zero' });
    }

    // Begin database transaction
    await client.query('BEGIN');

    // Lock and fetch current inventory level with FOR UPDATE to prevent concurrency race conditions
    const lockSql = `
      SELECT i.id, i.quantity, p.name AS product_name, w.name AS warehouse_name
      FROM inventory i
      JOIN products p ON i.product_id = p.id
      JOIN warehouses w ON i.warehouse_id = w.id
      WHERE i.product_id = $1 AND i.warehouse_id = $2
      FOR UPDATE
    `;
    const lockResult = await client.query(lockSql, [parsedProdId, parsedWhId]);

    if (lockResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return errorResponse(res, {
        statusCode: 400,
        message: 'No inventory record exists for this product in the selected warehouse (Available: 0 units)',
      });
    }

    const currentInventory = lockResult.rows[0];
    const availableStock = currentInventory.quantity;

    // Critical business rule: Stock must NEVER become negative
    if (availableStock < parsedQty) {
      await client.query('ROLLBACK');
      return errorResponse(res, {
        statusCode: 400,
        message: `Insufficient stock for '${currentInventory.product_name}' in '${currentInventory.warehouse_name}'. Available: ${availableStock} units, Requested deduction: ${parsedQty} units.`,
      });
    }

    // Deduct stock
    const updateSql = `
      UPDATE inventory
      SET quantity = quantity - $1
      WHERE product_id = $2 AND warehouse_id = $3
      RETURNING id, product_id, warehouse_id, quantity, updated_at
    `;
    const updateResult = await client.query(updateSql, [parsedQty, parsedProdId, parsedWhId]);
    const updatedInventory = updateResult.rows[0];

    const validRefType = ['SALES_ORDER', 'MANUAL_ADJUSTMENT'].includes(referenceType)
      ? referenceType
      : 'MANUAL_ADJUSTMENT';

    const movementRefId = referenceId ? referenceId.trim() : `OUT-${Date.now().toString().slice(-6)}`;

    // Insert audit record into stock_movements
    const movementSql = `
      INSERT INTO stock_movements (
        product_id,
        source_warehouse_id,
        movement_type,
        quantity,
        reference_type,
        reference_id,
        notes,
        created_by
      ) VALUES ($1, $2, 'OUT', $3, $4, $5, $6, $7)
      RETURNING *
    `;
    const moveResult = await client.query(movementSql, [
      parsedProdId,
      parsedWhId,
      parsedQty,
      validRefType,
      movementRefId,
      notes ? notes.trim() : 'Stock Out dispatch/write-off',
      req.user.id,
    ]);

    await client.query('COMMIT');

    return successResponse(res, {
      statusCode: 200,
      data: {
        inventory: updatedInventory,
        movement: moveResult.rows[0],
        remainingStock: updatedInventory.quantity,
      },
      message: `Successfully deducted ${parsedQty} units of ${currentInventory.product_name} from ${currentInventory.warehouse_name}. Remaining: ${updatedInventory.quantity} units.`,
    });
  } catch (error) {
    await client.query('ROLLBACK');
    next(error);
  } finally {
    client.release();
  }
};

/**
 * @desc    Stock Adjustment (Physical audit count reconciliation)
 * @route   POST /api/inventory/adjust
 * @access  Private (Admin, Manager)
 */
const adjustStock = async (req, res, next) => {
  const client = await pool.connect();
  try {
    const { productId, warehouseId, newQuantity, reason, notes } = req.body;

    const parsedNewQty = parseInt(newQuantity, 10);
    const parsedProdId = parseInt(productId, 10);
    const parsedWhId = parseInt(warehouseId, 10);

    if (!parsedProdId || isNaN(parsedProdId)) {
      return errorResponse(res, { statusCode: 400, message: 'Valid product ID is required' });
    }
    if (!parsedWhId || isNaN(parsedWhId)) {
      return errorResponse(res, { statusCode: 400, message: 'Valid warehouse ID is required' });
    }
    if (isNaN(parsedNewQty) || parsedNewQty < 0) {
      return errorResponse(res, { statusCode: 400, message: 'New count quantity must be a non-negative integer (0 or greater)' });
    }

    await client.query('BEGIN');

    // Lock and get current inventory or upsert row if absent
    const fetchSql = `
      SELECT i.id, i.quantity, p.name AS product_name, w.name AS warehouse_name
      FROM inventory i
      JOIN products p ON i.product_id = p.id
      JOIN warehouses w ON i.warehouse_id = w.id
      WHERE i.product_id = $1 AND i.warehouse_id = $2
      FOR UPDATE
    `;
    let currentResult = await client.query(fetchSql, [parsedProdId, parsedWhId]);

    let currentQty = 0;
    let prodName = '';
    let whName = '';

    if (currentResult.rows.length === 0) {
      // Fetch names to create starting row
      const pCheck = await client.query('SELECT name FROM products WHERE id = $1', [parsedProdId]);
      const wCheck = await client.query('SELECT name FROM warehouses WHERE id = $1', [parsedWhId]);
      if (pCheck.rows.length === 0 || wCheck.rows.length === 0) {
        await client.query('ROLLBACK');
        return errorResponse(res, { statusCode: 404, message: 'Product or warehouse not found' });
      }
      prodName = pCheck.rows[0].name;
      whName = wCheck.rows[0].name;

      await client.query(
        `INSERT INTO inventory (product_id, warehouse_id, quantity) VALUES ($1, $2, 0)`,
        [parsedProdId, parsedWhId]
      );
      currentQty = 0;
    } else {
      currentQty = currentResult.rows[0].quantity;
      prodName = currentResult.rows[0].product_name;
      whName = currentResult.rows[0].warehouse_name;
    }

    const delta = parsedNewQty - currentQty;

    if (delta === 0) {
      await client.query('ROLLBACK');
      return successResponse(res, {
        statusCode: 200,
        data: { currentQuantity: currentQty, newQuantity: parsedNewQty },
        message: 'Recorded stock matches new physical count; no adjustment required.',
      });
    }

    // Update inventory to the new verified physical count
    const updateSql = `
      UPDATE inventory
      SET quantity = $1
      WHERE product_id = $2 AND warehouse_id = $3
      RETURNING id, product_id, warehouse_id, quantity, updated_at
    `;
    const updateResult = await client.query(updateSql, [parsedNewQty, parsedProdId, parsedWhId]);
    const updatedInventory = updateResult.rows[0];

    const absDelta = Math.abs(delta);
    const movementRefId = `ADJ-${Date.now().toString().slice(-6)}`;
    const reasonText = reason ? reason.trim() : 'Physical cycle count audit';
    const notesText = `${reasonText}. Changed from ${currentQty} to ${parsedNewQty} (${delta > 0 ? '+' : ''}${delta} units). ${notes ? notes.trim() : ''}`;

    // Insert stock movement record
    const movementSql = `
      INSERT INTO stock_movements (
        product_id,
        ${delta > 0 ? 'destination_warehouse_id' : 'source_warehouse_id'},
        movement_type,
        quantity,
        reference_type,
        reference_id,
        notes,
        created_by
      ) VALUES ($1, $2, 'ADJUSTMENT', $3, 'MANUAL_ADJUSTMENT', $4, $5, $6)
      RETURNING *
    `;

    const moveResult = await client.query(movementSql, [
      parsedProdId,
      parsedWhId,
      absDelta,
      movementRefId,
      notesText,
      req.user.id,
    ]);

    await client.query('COMMIT');

    return successResponse(res, {
      statusCode: 200,
      data: {
        inventory: updatedInventory,
        movement: moveResult.rows[0],
        previousQuantity: currentQty,
        newQuantity: parsedNewQty,
        delta,
      },
      message: `Adjusted stock for ${prodName} in ${whName} from ${currentQty} to ${parsedNewQty} units (${delta > 0 ? '+' : ''}${delta})`,
    });
  } catch (error) {
    await client.query('ROLLBACK');
    next(error);
  } finally {
    client.release();
  }
};

/**
 * @desc    Transfer stock between warehouses atomically
 * @route   POST /api/inventory/transfer
 * @access  Private (Admin, Manager, Staff)
 */
const transferStock = async (req, res, next) => {
  const client = await pool.connect();
  try {
    const { productId, sourceWarehouseId, destinationWarehouseId, quantity, notes } = req.body;

    const parsedQty = parseInt(quantity, 10);
    const parsedProdId = parseInt(productId, 10);
    const parsedSrcWhId = parseInt(sourceWarehouseId, 10);
    const parsedDstWhId = parseInt(destinationWarehouseId, 10);

    if (!parsedProdId || isNaN(parsedProdId)) {
      return errorResponse(res, { statusCode: 400, message: 'Valid product ID is required' });
    }
    if (!parsedSrcWhId || isNaN(parsedSrcWhId)) {
      return errorResponse(res, { statusCode: 400, message: 'Valid source warehouse ID is required' });
    }
    if (!parsedDstWhId || isNaN(parsedDstWhId)) {
      return errorResponse(res, { statusCode: 400, message: 'Valid destination warehouse ID is required' });
    }
    if (parsedSrcWhId === parsedDstWhId) {
      return errorResponse(res, { statusCode: 400, message: 'Source and destination warehouses cannot be the same' });
    }
    if (!parsedQty || isNaN(parsedQty) || parsedQty <= 0) {
      return errorResponse(res, { statusCode: 400, message: 'Transfer quantity must be a positive integer greater than zero' });
    }

    await client.query('BEGIN');

    // 1. Verify destination warehouse is active
    const dstWhCheck = await client.query('SELECT id, name, code, is_active FROM warehouses WHERE id = $1', [parsedDstWhId]);
    if (dstWhCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      return errorResponse(res, { statusCode: 404, message: 'Destination warehouse not found' });
    }
    if (!dstWhCheck.rows[0].is_active) {
      await client.query('ROLLBACK');
      return errorResponse(res, { statusCode: 400, message: `Cannot transfer to inactive warehouse '${dstWhCheck.rows[0].name}'` });
    }

    // 2. Lock and check source inventory
    const srcLockSql = `
      SELECT i.id, i.quantity, p.name AS product_name, w.name AS warehouse_name
      FROM inventory i
      JOIN products p ON i.product_id = p.id
      JOIN warehouses w ON i.warehouse_id = w.id
      WHERE i.product_id = $1 AND i.warehouse_id = $2
      FOR UPDATE
    `;
    const srcResult = await client.query(srcLockSql, [parsedProdId, parsedSrcWhId]);

    if (srcResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return errorResponse(res, { statusCode: 400, message: 'No inventory record exists at the source warehouse for this product' });
    }

    const srcInv = srcResult.rows[0];
    if (srcInv.quantity < parsedQty) {
      await client.query('ROLLBACK');
      return errorResponse(res, {
        statusCode: 400,
        message: `Insufficient stock at ${srcInv.warehouse_name}. Available: ${srcInv.quantity} units, Requested transfer: ${parsedQty} units.`,
      });
    }

    // 3. Deduct from source warehouse
    const deductSql = `
      UPDATE inventory 
      SET quantity = quantity - $1
      WHERE product_id = $2 AND warehouse_id = $3
      RETURNING quantity
    `;
    const deductResult = await client.query(deductSql, [parsedQty, parsedProdId, parsedSrcWhId]);
    const srcRemaining = deductResult.rows[0].quantity;

    // 4. Add to destination warehouse (upsert)
    const addSql = `
      INSERT INTO inventory (product_id, warehouse_id, quantity)
      VALUES ($1, $2, $3)
      ON CONFLICT (product_id, warehouse_id)
      DO UPDATE SET quantity = inventory.quantity + EXCLUDED.quantity
      RETURNING quantity
    `;
    const addResult = await client.query(addSql, [parsedProdId, parsedDstWhId, parsedQty]);
    const dstTotal = addResult.rows[0].quantity;

    // 5. Create transfer audit record in stock_movements
    const transferRefId = `TRF-${Date.now().toString().slice(-6)}`;
    const moveSql = `
      INSERT INTO stock_movements (
        product_id,
        source_warehouse_id,
        destination_warehouse_id,
        movement_type,
        quantity,
        reference_type,
        reference_id,
        notes,
        created_by
      ) VALUES ($1, $2, $3, 'TRANSFER', $4, 'STOCK_TRANSFER', $5, $6, $7)
      RETURNING *
    `;

    const moveResult = await client.query(moveSql, [
      parsedProdId,
      parsedSrcWhId,
      parsedDstWhId,
      parsedQty,
      transferRefId,
      notes ? notes.trim() : `Transfer from ${srcInv.warehouse_name} to ${dstWhCheck.rows[0].name}`,
      req.user.id,
    ]);

    await client.query('COMMIT');

    return successResponse(res, {
      statusCode: 200,
      data: {
        movement: moveResult.rows[0],
        sourceWarehouse: {
          id: parsedSrcWhId,
          name: srcInv.warehouse_name,
          remainingStock: srcRemaining,
        },
        destinationWarehouse: {
          id: parsedDstWhId,
          name: dstWhCheck.rows[0].name,
          newTotalStock: dstTotal,
        },
      },
      message: `Successfully transferred ${parsedQty} units of ${srcInv.product_name} from ${srcInv.warehouse_name} to ${dstWhCheck.rows[0].name}`,
    });
  } catch (error) {
    await client.query('ROLLBACK');
    next(error);
  } finally {
    client.release();
  }
};

/**
 * @desc    Get paginated stock movement audit ledger
 * @route   GET /api/inventory/movements
 * @access  Private (All authenticated roles)
 */
const getStockMovements = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;
    const offset = (page - 1) * limit;
    const productId = req.query.product_id ? parseInt(req.query.product_id, 10) : null;
    const warehouseId = req.query.warehouse_id ? parseInt(req.query.warehouse_id, 10) : null;
    const movementType = req.query.movement_type; // 'IN', 'OUT', 'ADJUSTMENT', 'TRANSFER'
    const referenceType = req.query.reference_type;
    const search = req.query.search ? req.query.search.trim().toLowerCase() : '';

    const conditions = [];
    const params = [];

    if (productId) {
      params.push(productId);
      conditions.push(`sm.product_id = $${params.length}`);
    }

    if (warehouseId) {
      params.push(warehouseId);
      conditions.push(`(sm.source_warehouse_id = $${params.length} OR sm.destination_warehouse_id = $${params.length})`);
    }

    if (movementType) {
      params.push(movementType.toUpperCase());
      conditions.push(`sm.movement_type = $${params.length}`);
    }

    if (referenceType) {
      params.push(referenceType.toUpperCase());
      conditions.push(`sm.reference_type = $${params.length}`);
    }

    if (search) {
      params.push(`%${search}%`);
      conditions.push(
        `(LOWER(p.name) LIKE $${params.length} OR LOWER(p.sku) LIKE $${params.length} OR LOWER(COALESCE(sm.reference_id, '')) LIKE $${params.length} OR LOWER(COALESCE(sm.notes, '')) LIKE $${params.length})`
      );
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const countSql = `
      SELECT COUNT(*)
      FROM stock_movements sm
      JOIN products p ON sm.product_id = p.id
      ${whereClause}
    `;
    const countResult = await query(countSql, params);
    const totalRecords = parseInt(countResult.rows[0].count, 10);

    const listSql = `
      SELECT 
        sm.id,
        sm.movement_type,
        sm.quantity,
        sm.reference_type,
        sm.reference_id,
        sm.notes,
        sm.created_at,
        p.id AS product_id,
        p.name AS product_name,
        p.sku AS product_sku,
        p.image_url AS product_image,
        sw.id AS source_warehouse_id,
        sw.name AS source_warehouse_name,
        sw.code AS source_warehouse_code,
        dw.id AS destination_warehouse_id,
        dw.name AS destination_warehouse_name,
        dw.code AS destination_warehouse_code,
        u.id AS user_id,
        CONCAT(u.first_name, ' ', u.last_name) AS created_by_name,
        u.email AS created_by_email
      FROM stock_movements sm
      JOIN products p ON sm.product_id = p.id
      LEFT JOIN warehouses sw ON sm.source_warehouse_id = sw.id
      LEFT JOIN warehouses dw ON sm.destination_warehouse_id = dw.id
      LEFT JOIN users u ON sm.created_by = u.id
      ${whereClause}
      ORDER BY sm.created_at DESC
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}
    `;

    const listParams = [...params, limit, offset];
    const result = await query(listSql, listParams);

    return paginatedResponse(res, {
      data: result.rows,
      total: totalRecords,
      page,
      limit,
      message: 'Stock movement ledger retrieved successfully',
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getInventory,
  getLowStockAlerts,
  stockIn,
  stockOut,
  adjustStock,
  transferStock,
  getStockMovements,
};
