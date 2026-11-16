const { query, pool } = require('../config/db');
const { successResponse, errorResponse } = require('../utils/response');

/**
 * @desc    Get business and base warehouse settings
 * @route   GET /api/settings
 * @access  Private (All authenticated users)
 */
const getSettings = async (req, res, next) => {
  try {
    // 1. Fetch system_settings
    let settingsResult = await query('SELECT * FROM system_settings WHERE id = 1');
    if (settingsResult.rows.length === 0) {
      await query(`
        INSERT INTO system_settings (id, company_name, currency_symbol, support_email, support_phone, reorder_alert_threshold)
        VALUES (1, 'StockSync Farm Machinery & Industrial Metals', '$', 'support@stocksync.com', '+1-800-555-BASE', 5)
        ON CONFLICT (id) DO NOTHING
      `);
      settingsResult = await query('SELECT * FROM system_settings WHERE id = 1');
    }
    const s = settingsResult.rows[0] || {};

    // 2. Fetch Base Warehouse 1
    const whResult = await query('SELECT id, name, code, address, contact_phone FROM warehouses WHERE id = 1');
    const wh = whResult.rows[0] || {
      id: 1,
      name: 'Main Base Warehouse',
      code: 'BASE-01',
      address: '',
      contact_phone: '+1-800-555-BASE',
    };

    return successResponse(res, {
      statusCode: 200,
      data: {
        companyName: s.company_name || 'StockSync Farm Machinery & Industrial Metals',
        currencySymbol: s.currency_symbol || '$',
        supportEmail: s.support_email || 'support@stocksync.com',
        supportPhone: s.support_phone || '+1-800-555-BASE',
        reorderAlertThreshold: s.reorder_alert_threshold || 5,
        baseWarehouseName: wh.name || 'Main Base Warehouse',
        baseWarehouseCode: wh.code || 'BASE-01',
        baseWarehouseAddress: wh.address || '',
        baseWarehousePhone: wh.contact_phone || '',
        updatedAt: s.updated_at,
      },
      message: 'Settings retrieved successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update business and base warehouse settings
 * @route   PUT /api/settings
 * @access  Private (Admin, Manager)
 */
const updateSettings = async (req, res, next) => {
  const client = await pool.connect();
  try {
    const {
      companyName,
      currencySymbol,
      supportEmail,
      supportPhone,
      reorderAlertThreshold,
      baseWarehouseName,
      baseWarehouseCode,
      baseWarehouseAddress,
      baseWarehousePhone,
    } = req.body;

    await client.query('BEGIN');

    // 1. Update system_settings
    const updateSettingsSql = `
      INSERT INTO system_settings (id, company_name, currency_symbol, support_email, support_phone, reorder_alert_threshold, updated_at)
      VALUES (1, $1, $2, $3, $4, $5, NOW())
      ON CONFLICT (id) DO UPDATE SET
        company_name = COALESCE($1, system_settings.company_name),
        currency_symbol = COALESCE($2, system_settings.currency_symbol),
        support_email = COALESCE($3, system_settings.support_email),
        support_phone = COALESCE($4, system_settings.support_phone),
        reorder_alert_threshold = COALESCE($5, system_settings.reorder_alert_threshold),
        updated_at = NOW()
      RETURNING *
    `;

    const cleanCompany = companyName ? companyName.trim() : 'StockSync Farm Machinery & Industrial Metals';
    const cleanCurrency = currencySymbol ? currencySymbol.trim() : '$';
    const cleanEmail = supportEmail ? supportEmail.trim() : null;
    const cleanPhone = supportPhone ? supportPhone.trim() : null;
    const cleanThreshold = parseInt(reorderAlertThreshold, 10) || 5;

    const sResult = await client.query(updateSettingsSql, [
      cleanCompany,
      cleanCurrency,
      cleanEmail,
      cleanPhone,
      cleanThreshold,
    ]);
    const s = sResult.rows[0];

    // 2. Update Base Warehouse (id = 1)
    const cleanWhName = baseWarehouseName ? baseWarehouseName.trim() : 'Main Base Warehouse';
    const cleanWhCode = baseWarehouseCode ? baseWarehouseCode.trim().toUpperCase() : 'BASE-01';
    const cleanWhAddress = baseWarehouseAddress !== undefined ? (baseWarehouseAddress ? baseWarehouseAddress.trim() : null) : null;
    const cleanWhPhone = baseWarehousePhone !== undefined ? (baseWarehousePhone ? baseWarehousePhone.trim() : cleanPhone) : cleanPhone;

    // Ensure warehouse 1 exists or update it
    const whUpdateSql = `
      INSERT INTO warehouses (id, name, code, address, contact_phone, is_active)
      VALUES (1, $1, $2, $3, $4, TRUE)
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        code = EXCLUDED.code,
        address = EXCLUDED.address,
        contact_phone = EXCLUDED.contact_phone,
        updated_at = NOW()
      RETURNING *
    `;

    const whResult = await client.query(whUpdateSql, [
      cleanWhName,
      cleanWhCode,
      cleanWhAddress,
      cleanWhPhone,
    ]);
    const wh = whResult.rows[0];

    await client.query('COMMIT');

    return successResponse(res, {
      statusCode: 200,
      data: {
        companyName: s.company_name,
        currencySymbol: s.currency_symbol,
        supportEmail: s.support_email,
        supportPhone: s.support_phone,
        reorderAlertThreshold: s.reorder_alert_threshold,
        baseWarehouseName: wh.name,
        baseWarehouseCode: wh.code,
        baseWarehouseAddress: wh.address || '',
        baseWarehousePhone: wh.contact_phone || '',
        updatedAt: s.updated_at,
      },
      message: 'Business & Base Warehouse settings saved successfully',
    });
  } catch (error) {
    await client.query('ROLLBACK');
    next(error);
  } finally {
    client.release();
  }
};

module.exports = {
  getSettings,
  updateSettings,
};
