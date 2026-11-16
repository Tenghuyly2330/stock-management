const { query } = require('../config/db');
const { successResponse, errorResponse, paginatedResponse } = require('../utils/response');
const { uploadImageBuffer, deleteImage, extractPublicIdFromUrl } = require('../config/cloudinary');

/**
 * Generate unique enterprise SKU if not provided
 */
const generateSKU = (categoryName = 'PRD') => {
  const prefix = (categoryName.replace(/[^A-Za-z]/g, '').substring(0, 3) || 'PRD').toUpperCase();
  const timestamp = Date.now().toString().slice(-5);
  const random = Math.floor(Math.random() * 900 + 100);
  return `${prefix}-${timestamp}-${random}`;
};

/**
 * Generate 13-digit EAN-style barcode if not provided
 */
const generateBarcode = () => {
  const prefix = '890';
  const randomDigits = Math.floor(Math.random() * 9000000000 + 1000000000).toString();
  return `${prefix}${randomDigits.substring(0, 10)}`;
};

/**
 * @desc    Get all products with category, total stock, and margin calculation
 * @route   GET /api/products
 * @access  Private (All authenticated roles)
 */
const getProducts = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const offset = (page - 1) * limit;
    const search = req.query.search ? req.query.search.trim().toLowerCase() : '';
    const categoryId = req.query.category_id ? parseInt(req.query.category_id, 10) : null;
    const stockStatus = req.query.stock_status;
    const status = req.query.status;
    const sortBy = req.query.sort_by || 'created_at';
    const sortDir = req.query.sort_dir?.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    const conditions = [];
    const params = [];

    if (search) {
      params.push(`%${search}%`);
      conditions.push(
        `(LOWER(p.name) LIKE $${params.length} OR LOWER(p.sku) LIKE $${params.length} OR LOWER(p.barcode) LIKE $${params.length})`
      );
    }

    if (categoryId) {
      params.push(categoryId);
      conditions.push(`p.category_id = $${params.length}`);
    }

    if (status === 'active') {
      conditions.push('p.is_active = TRUE');
    } else if (status === 'inactive') {
      conditions.push('p.is_active = FALSE');
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    let havingClause = '';
    if (stockStatus === 'out_of_stock') {
      havingClause = 'HAVING COALESCE(SUM(inv.quantity), 0) = 0';
    } else if (stockStatus === 'low_stock') {
      havingClause = 'HAVING COALESCE(SUM(inv.quantity), 0) > 0 AND COALESCE(SUM(inv.quantity), 0) <= p.min_stock_level';
    } else if (stockStatus === 'in_stock') {
      havingClause = 'HAVING COALESCE(SUM(inv.quantity), 0) > p.min_stock_level';
    }

    const sortColumnMap = {
      name: 'p.name',
      price: 'p.selling_price',
      stock: 'current_stock',
      created_at: 'p.created_at',
    };
    const orderColumn = sortColumnMap[sortBy] || 'p.created_at';

    const countSql = `
      SELECT COUNT(*)::int as total FROM (
        SELECT p.id
        FROM products p
        LEFT JOIN inventory inv ON p.id = inv.product_id
        ${whereClause}
        GROUP BY p.id
        ${havingClause}
      ) as subquery
    `;
    const countRes = await query(countSql, params);
    const total = countRes.rows[0].total;

    const dataParams = [...params, limit, offset];
    const dataSql = `
      SELECT 
        p.id, p.name, p.sku, p.barcode, p.description, p.image_url, p.image_public_id,
        p.purchase_price, p.selling_price, p.min_stock_level, p.is_active,
        p.created_at, p.updated_at, p.category_id,
        c.name as category_name,
        COALESCE(SUM(inv.quantity), 0)::int as current_stock,
        CASE 
          WHEN p.selling_price > 0 
          THEN ROUND(((p.selling_price - p.purchase_price) / p.selling_price) * 100, 2)
          ELSE 0.00 
        END as margin_pct,
        CASE
          WHEN COALESCE(SUM(inv.quantity), 0) = 0 THEN 'OUT_OF_STOCK'
          WHEN COALESCE(SUM(inv.quantity), 0) <= p.min_stock_level THEN 'LOW_STOCK'
          ELSE 'OPTIMAL'
        END as stock_badge
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN inventory inv ON p.id = inv.product_id
      ${whereClause}
      GROUP BY p.id, c.name
      ${havingClause}
      ORDER BY ${orderColumn} ${sortDir}
      LIMIT $${dataParams.length - 1} OFFSET $${dataParams.length}
    `;

    const dataRes = await query(dataSql, dataParams);

    return paginatedResponse(res, {
      data: dataRes.rows,
      total,
      page,
      limit,
      message: 'Products retrieved successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get single product details with warehouse inventory breakdown
 * @route   GET /api/products/:id
 * @access  Private
 */
const getProductById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const prodSql = `
      SELECT 
        p.*, c.name as category_name,
        COALESCE(SUM(inv.quantity), 0)::int as total_stock,
        CASE 
          WHEN p.selling_price > 0 
          THEN ROUND(((p.selling_price - p.purchase_price) / p.selling_price) * 100, 2)
          ELSE 0.00 
        END as margin_pct
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN inventory inv ON p.id = inv.product_id
      WHERE p.id = $1
      GROUP BY p.id, c.name
    `;

    const prodRes = await query(prodSql, [id]);
    if (prodRes.rowCount === 0) {
      return errorResponse(res, { statusCode: 404, message: 'Product not found.' });
    }

    const whSql = `
      SELECT 
        w.id as warehouse_id, w.name as warehouse_name, w.code as warehouse_code,
        COALESCE(inv.quantity, 0)::int as quantity,
        inv.updated_at
      FROM warehouses w
      LEFT JOIN inventory inv ON w.id = inv.warehouse_id AND inv.product_id = $1
      WHERE w.is_active = TRUE
      ORDER BY w.name ASC
    `;
    const whRes = await query(whSql, [id]);

    return successResponse(res, {
      statusCode: 200,
      data: {
        ...prodRes.rows[0],
        warehouses: whRes.rows,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Upload an image file directly to Cloudinary
 * @route   POST /api/products/upload-image
 * @access  Private (Admin, Manager)
 */
const uploadProductImage = async (req, res, next) => {
  try {
    if (!req.file) {
      return errorResponse(res, { statusCode: 400, message: 'Please select an image file to upload.' });
    }

    const result = await uploadImageBuffer(req.file.buffer);

    return successResponse(res, {
      statusCode: 200,
      message: 'Image uploaded to Cloudinary successfully',
      data: {
        imageUrl: result.url,
        imagePublicId: result.publicId,
        bytes: result.bytes,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Create a new product (supports image file upload or external link)
 * @route   POST /api/products
 * @access  Private (Admin, Manager)
 */
const createProduct = async (req, res, next) => {
  try {
    let {
      name,
      categoryId,
      sku,
      barcode,
      description,
      imageUrl,
      imagePublicId,
      purchasePrice,
      sellingPrice,
      minStockLevel,
    } = req.body;

    if (!name || !name.trim()) {
      return errorResponse(res, { statusCode: 400, message: 'Product name is required.' });
    }

    if (!categoryId) {
      return errorResponse(res, { statusCode: 400, message: 'Category selection is required.' });
    }

    // If an image file was attached in multipart/form-data
    if (req.file) {
      const uploadResult = await uploadImageBuffer(req.file.buffer);
      imageUrl = uploadResult.url;
      imagePublicId = uploadResult.publicId;
    }

    // Verify category exists
    const catRes = await query('SELECT name FROM categories WHERE id = $1', [categoryId]);
    if (catRes.rowCount === 0) {
      return errorResponse(res, { statusCode: 400, message: 'Selected category does not exist.' });
    }

    // Auto-generate SKU / Barcode if omitted
    if (!sku || !sku.trim()) {
      sku = generateSKU(catRes.rows[0].name);
    } else {
      sku = sku.trim().toUpperCase();
    }

    if (!barcode || !barcode.trim()) {
      barcode = generateBarcode();
    } else {
      barcode = barcode.trim();
    }

    // Check SKU collision
    const skuConflict = await query('SELECT id FROM products WHERE UPPER(sku) = $1', [sku]);
    if (skuConflict.rowCount > 0) {
      return errorResponse(res, {
        statusCode: 409,
        message: `Product with SKU '${sku}' already exists. Please provide a unique SKU.`,
      });
    }

    const pPrice = parseFloat(purchasePrice) || 0.0;
    const sPrice = parseFloat(sellingPrice) || 0.0;
    const minStock = parseInt(minStockLevel, 10) >= 0 ? parseInt(minStockLevel, 10) : 10;

    const insertSql = `
      INSERT INTO products (
        name, category_id, sku, barcode, description, image_url, image_public_id,
        purchase_price, selling_price, min_stock_level, is_active
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, TRUE)
      RETURNING *
    `;

    const insertRes = await query(insertSql, [
      name.trim(),
      categoryId,
      sku,
      barcode,
      description ? description.trim() : null,
      imageUrl ? imageUrl.trim() : null,
      imagePublicId ? imagePublicId.trim() : null,
      pPrice,
      sPrice,
      minStock,
    ]);

    return successResponse(res, {
      statusCode: 201,
      message: 'Product created successfully',
      data: insertRes.rows[0],
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update existing product & delete old Cloudinary image if replaced
 * @route   PUT /api/products/:id
 * @access  Private (Admin, Manager)
 */
const updateProduct = async (req, res, next) => {
  try {
    const { id } = req.params;
    let {
      name,
      categoryId,
      sku,
      barcode,
      description,
      imageUrl,
      imagePublicId,
      purchasePrice,
      sellingPrice,
      minStockLevel,
      isActive,
    } = req.body;

    const existingRes = await query('SELECT * FROM products WHERE id = $1', [id]);
    if (existingRes.rowCount === 0) {
      return errorResponse(res, { statusCode: 404, message: 'Product not found.' });
    }

    const currentProduct = existingRes.rows[0];

    // Handle new file upload from multipart
    if (req.file) {
      const uploadResult = await uploadImageBuffer(req.file.buffer);
      imageUrl = uploadResult.url;
      imagePublicId = uploadResult.publicId;

      // Delete previous Cloudinary image if present
      const oldPublicId = currentProduct.image_public_id || extractPublicIdFromUrl(currentProduct.image_url);
      if (oldPublicId) {
        await deleteImage(oldPublicId);
      }
    } else if (imageUrl !== undefined && imageUrl !== currentProduct.image_url) {
      // User changed to a new URL or cleared image URL
      const oldPublicId = currentProduct.image_public_id || extractPublicIdFromUrl(currentProduct.image_url);
      if (oldPublicId && oldPublicId !== imagePublicId) {
        await deleteImage(oldPublicId);
      }
      if (!imageUrl) {
        imagePublicId = null;
      }
    }

    if (sku) {
      const trimmedSku = sku.trim().toUpperCase();
      const conflict = await query('SELECT id FROM products WHERE UPPER(sku) = $1 AND id != $2', [
        trimmedSku,
        id,
      ]);
      if (conflict.rowCount > 0) {
        return errorResponse(res, {
          statusCode: 409,
          message: `Product SKU '${trimmedSku}' is already registered to another item.`,
        });
      }
    }

    if (categoryId) {
      const catCheck = await query('SELECT id FROM categories WHERE id = $1', [categoryId]);
      if (catCheck.rowCount === 0) {
        return errorResponse(res, { statusCode: 400, message: 'Invalid category specified.' });
      }
    }

    const params = [
      name ? name.trim() : null,
      categoryId || null,
      sku ? sku.trim().toUpperCase() : null,
      barcode !== undefined ? barcode : null,
      description !== undefined ? description : null,
      imageUrl !== undefined ? imageUrl : null,
      imagePublicId !== undefined ? imagePublicId : null,
      purchasePrice !== undefined ? parseFloat(purchasePrice) : null,
      sellingPrice !== undefined ? parseFloat(sellingPrice) : null,
      minStockLevel !== undefined ? parseInt(minStockLevel, 10) : null,
      isActive !== undefined ? isActive : null,
      id,
    ];

    const updateSql = `
      UPDATE products
      SET
        name = COALESCE($1, name),
        category_id = COALESCE($2, category_id),
        sku = COALESCE($3, sku),
        barcode = COALESCE($4, barcode),
        description = COALESCE($5, description),
        image_url = COALESCE($6, image_url),
        image_public_id = COALESCE($7, image_public_id),
        purchase_price = COALESCE($8, purchase_price),
        selling_price = COALESCE($9, selling_price),
        min_stock_level = COALESCE($10, min_stock_level),
        is_active = COALESCE($11, is_active)
      WHERE id = $12
      RETURNING *
    `;

    const updateRes = await query(updateSql, params);

    return successResponse(res, {
      statusCode: 200,
      message: 'Product updated successfully',
      data: updateRes.rows[0],
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete or soft-deactivate product & delete Cloudinary image
 * @route   DELETE /api/products/:id
 * @access  Private (Admin only)
 */
const deleteProduct = async (req, res, next) => {
  try {
    const { id } = req.params;

    const prodRes = await query('SELECT id, name, image_url, image_public_id FROM products WHERE id = $1', [id]);
    if (prodRes.rowCount === 0) {
      return errorResponse(res, { statusCode: 404, message: 'Product not found.' });
    }

    const product = prodRes.rows[0];

    // Delete image asset from Cloudinary
    const cloudPublicId = product.image_public_id || extractPublicIdFromUrl(product.image_url);
    if (cloudPublicId) {
      await deleteImage(cloudPublicId);
    }

    // Check if referenced in stock movements or orders
    const movementsCheck = await query('SELECT COUNT(*)::int as count FROM stock_movements WHERE product_id = $1', [id]);
    const ordersCheck = await query(
      `SELECT 
        (SELECT COUNT(*)::int FROM purchase_order_items WHERE product_id = $1) +
        (SELECT COUNT(*)::int FROM sales_order_items WHERE product_id = $1) as count`,
      [id]
    );

    const hasHistory = movementsCheck.rows[0].count > 0 || ordersCheck.rows[0].count > 0;

    if (hasHistory) {
      await query('UPDATE products SET is_active = FALSE, image_url = NULL, image_public_id = NULL WHERE id = $1', [id]);
      return successResponse(res, {
        statusCode: 200,
        message: `Product '${product.name}' has historical inventory records. It has been deactivated and its image removed from Cloudinary.`,
      });
    }

    await query('DELETE FROM inventory WHERE product_id = $1', [id]);
    await query('DELETE FROM products WHERE id = $1', [id]);

    return successResponse(res, {
      statusCode: 200,
      message: `Product '${product.name}' and its Cloudinary media permanently deleted.`,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getProducts,
  getProductById,
  uploadProductImage,
  createProduct,
  updateProduct,
  deleteProduct,
  generateSKU,
  generateBarcode,
};
