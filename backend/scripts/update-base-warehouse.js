const { query, pool } = require('../src/config/db');

async function updateBaseWarehouse() {
  try {
    const res = await query(
      `UPDATE warehouses 
       SET name = 'Main Base Warehouse', code = 'BASE-01', address = '7700 Industrial Parkway, Base Depot, TX 75201', contact_phone = '+1-800-555-BASE'
       WHERE id = 1
       RETURNING *`
    );
    console.log('Base Warehouse Updated:', res.rows[0]);
  } catch (err) {
    console.error('Error updating base warehouse:', err);
  } finally {
    await pool.end();
  }
}

updateBaseWarehouse();

