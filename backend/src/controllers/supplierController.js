const { query } = require('../config/db');
const { successResponse, errorResponse, paginatedResponse } = require('../utils/response');

/**
 * @desc    Get all suppliers with search, pagination, and purchase order count
 * @route   GET /api/suppliers
 * @access  Private (All authenticated roles)
 */
const getSuppliers = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const offset = (page - 1) * limit;
    const search = req.query.search ? req.query.search.trim().toLowerCase() : '';
    const status = req.query.status;

    const conditions = [];
    const params = [];

    if (search) {
      params.push(`%${search}%`);
      conditions.push(
        `(LOWER(s.company_name) LIKE $${params.length} OR ` +
        `LOWER(COALESCE(s.contact_person, '')) LIKE $${params.length} OR ` +
        `LOWER(COALESCE(s.email, '')) LIKE $${params.length} OR ` +
        `LOWER(COALESCE(s.city, '')) LIKE $${params.length} OR ` +
        `LOWER(COALESCE(s.phone, '')) LIKE $${params.length})`
      );
    }

    if (status === 'active') {
      conditions.push('s.is_active = TRUE');
    } else if (status === 'inactive') {
      conditions.push('s.is_active = FALSE');
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const countSql = `SELECT COUNT(*) FROM suppliers s ${whereClause}`;
    const countResult = await query(countSql, params);
    const totalRecords = parseInt(countResult.rows[0].count, 10);

    const listSql = `
      SELECT 
        s.id,
        s.company_name,
        s.contact_person,
        s.email,
        s.phone,
        s.address,
        s.city,
        s.country,
        s.is_active,
        s.created_at,
        s.updated_at,
        COUNT(po.id)::INT AS total_purchase_orders,
        COALESCE(SUM(po.total_amount), 0.00)::NUMERIC(14, 2) AS total_purchased_value
      FROM suppliers s
      LEFT JOIN purchase_orders po ON s.id = po.supplier_id
      ${whereClause}
      GROUP BY s.id
      ORDER BY s.company_name ASC
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}
    `;

    const listParams = [...params, limit, offset];
    const result = await query(listSql, listParams);

    return paginatedResponse(res, {
      data: result.rows,
      total: totalRecords,
      page,
      limit,
      message: 'Suppliers retrieved successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get supplier by ID with purchase history
 * @route   GET /api/suppliers/:id
 * @access  Private (All authenticated roles)
 */
const getSupplierById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const supplierSql = `
      SELECT 
        s.id,
        s.company_name,
        s.contact_person,
        s.email,
        s.phone,
        s.address,
        s.city,
        s.country,
        s.is_active,
        s.created_at,
        s.updated_at,
        COUNT(po.id)::INT AS total_purchase_orders,
        COALESCE(SUM(po.total_amount), 0.00)::NUMERIC(14, 2) AS total_purchased_value
      FROM suppliers s
      LEFT JOIN purchase_orders po ON s.id = po.supplier_id
      WHERE s.id = $1
      GROUP BY s.id
    `;

    const supResult = await query(supplierSql, [id]);

    if (supResult.rows.length === 0) {
      return errorResponse(res, { statusCode: 404, message: 'Supplier not found' });
    }

    // Recent purchase orders for this supplier
    const poSql = `
      SELECT 
        po.id,
        po.po_number,
        po.order_date,
        po.expected_delivery_date,
        po.status,
        po.total_amount,
        w.name AS warehouse_name,
        po.created_at
      FROM purchase_orders po
      LEFT JOIN warehouses w ON po.warehouse_id = w.id
      WHERE po.supplier_id = $1
      ORDER BY po.order_date DESC
      LIMIT 10
    `;

    const poResult = await query(poSql, [id]);

    const data = {
      ...supResult.rows[0],
      purchase_orders: poResult.rows,
    };

    return successResponse(res, {
      statusCode: 200,
      data,
      message: 'Supplier details retrieved successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Create a new supplier
 * @route   POST /api/suppliers
 * @access  Private (Admin, Manager)
 */
const createSupplier = async (req, res, next) => {
  try {
    const { company_name, contact_person, email, phone, address, city, country } = req.body;

    if (!company_name || !company_name.trim()) {
      return errorResponse(res, { statusCode: 400, message: 'Company name is required' });
    }

    const cleanName = company_name.trim();

    // Check if supplier name already exists
    const checkSql = `SELECT id FROM suppliers WHERE LOWER(company_name) = LOWER($1)`;
    const checkResult = await query(checkSql, [cleanName]);

    if (checkResult.rows.length > 0) {
      return errorResponse(res, { statusCode: 409, message: `Supplier '${cleanName}' already exists` });
    }

    const insertSql = `
      INSERT INTO suppliers (company_name, contact_person, email, phone, address, city, country, is_active)
      VALUES ($1, $2, $3, $4, $5, $6, $7, TRUE)
      RETURNING *
    `;

    const result = await query(insertSql, [
      cleanName,
      contact_person ? contact_person.trim() : null,
      email ? email.trim().toLowerCase() : null,
      phone ? phone.trim() : null,
      address ? address.trim() : null,
      city ? city.trim() : null,
      country ? country.trim() : null,
    ]);

    return successResponse(res, {
      statusCode: 201,
      data: result.rows[0],
      message: 'Supplier registered successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update supplier details
 * @route   PUT /api/suppliers/:id
 * @access  Private (Admin, Manager)
 */
const updateSupplier = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { company_name, contact_person, email, phone, address, city, country, is_active } = req.body;

    const findSql = `SELECT * FROM suppliers WHERE id = $1`;
    const findResult = await query(findSql, [id]);

    if (findResult.rows.length === 0) {
      return errorResponse(res, { statusCode: 404, message: 'Supplier not found' });
    }

    const current = findResult.rows[0];
    const cleanName = company_name !== undefined ? company_name.trim() : current.company_name;

    if (cleanName.toLowerCase() !== current.company_name.toLowerCase()) {
      const checkSql = `SELECT id FROM suppliers WHERE LOWER(company_name) = LOWER($1) AND id != $2`;
      const checkResult = await query(checkSql, [cleanName, id]);
      if (checkResult.rows.length > 0) {
        return errorResponse(res, { statusCode: 409, message: `Supplier name '${cleanName}' is already taken` });
      }
    }

    const updateSql = `
      UPDATE suppliers
      SET 
        company_name = $1,
        contact_person = $2,
        email = $3,
        phone = $4,
        address = $5,
        city = $6,
        country = $7,
        is_active = $8
      WHERE id = $9
      RETURNING *
    `;

    const result = await query(updateSql, [
      cleanName,
      contact_person !== undefined ? (contact_person ? contact_person.trim() : null) : current.contact_person,
      email !== undefined ? (email ? email.trim().toLowerCase() : null) : current.email,
      phone !== undefined ? (phone ? phone.trim() : null) : current.phone,
      address !== undefined ? (address ? address.trim() : null) : current.address,
      city !== undefined ? (city ? city.trim() : null) : current.city,
      country !== undefined ? (country ? country.trim() : null) : current.country,
      is_active !== undefined ? Boolean(is_active) : current.is_active,
      id,
    ]);

    return successResponse(res, {
      statusCode: 200,
      data: result.rows[0],
      message: 'Supplier updated successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete or deactivate supplier
 * @route   DELETE /api/suppliers/:id
 * @access  Private (Admin only)
 */
const deleteSupplier = async (req, res, next) => {
  try {
    const { id } = req.params;

    const findSql = `SELECT * FROM suppliers WHERE id = $1`;
    const findResult = await query(findSql, [id]);

    if (findResult.rows.length === 0) {
      return errorResponse(res, { statusCode: 404, message: 'Supplier not found' });
    }

    // Check if supplier has purchase orders
    const poSql = `SELECT COUNT(*) FROM purchase_orders WHERE supplier_id = $1`;
    const poResult = await query(poSql, [id]);
    const poCount = parseInt(poResult.rows[0].count, 10);

    if (poCount > 0) {
      // Soft-deactivate to preserve purchase ledger integrity
      await query(`UPDATE suppliers SET is_active = FALSE WHERE id = $1`, [id]);
      return successResponse(res, {
        statusCode: 200,
        data: { id: parseInt(id, 10), is_active: false, soft_deleted: true },
        message: `Supplier has ${poCount} linked purchase orders and was deactivated to preserve audit history`,
      });
    }

    await query(`DELETE FROM suppliers WHERE id = $1`, [id]);
    return successResponse(res, {
      statusCode: 200,
      data: { id: parseInt(id, 10) },
      message: 'Supplier deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getSuppliers,
  getSupplierById,
  createSupplier,
  updateSupplier,
  deleteSupplier,
};
