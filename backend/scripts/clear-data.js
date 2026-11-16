const { pool, query } = require('../src/config/db');
const { deleteImage } = require('../src/config/cloudinary');

async function clearData() {
  console.log('====================================================');
  console.log(' CLEARING ALL PRODUCTS, HISTORY, AND CATEGORIES');
  console.log('====================================================');

  const client = await pool.connect();

  try {
    // 1. Fetch all products to clean up Cloudinary images if any
    const prodRes = await client.query('SELECT id, name, image_url, image_public_id FROM products');
    console.log(`Found ${prodRes.rows.length} product(s) to remove.`);

    for (const prod of prodRes.rows) {
      if (prod.image_public_id) {
        console.log(`Deleting image for product "${prod.name}": ${prod.image_public_id}`);
        try {
          await deleteImage(prod.image_public_id);
        } catch (e) {
          console.warn(`Could not delete image: ${e.message}`);
        }
      }
    }

    // 2. Begin transaction to safely truncate/delete dependent tables
    await client.query('BEGIN');

    console.log('Clearing stock_movements (History)...');
    await client.query('DELETE FROM stock_movements');
    await client.query('ALTER SEQUENCE IF EXISTS stock_movements_id_seq RESTART WITH 1');

    console.log('Clearing sales orders and items...');
    await client.query('DELETE FROM sales_order_items');
    await client.query('ALTER SEQUENCE IF EXISTS sales_order_items_id_seq RESTART WITH 1');
    await client.query('DELETE FROM sales_orders');
    await client.query('ALTER SEQUENCE IF EXISTS sales_orders_id_seq RESTART WITH 1');

    console.log('Clearing purchase orders and items...');
    await client.query('DELETE FROM purchase_order_items');
    await client.query('ALTER SEQUENCE IF EXISTS purchase_order_items_id_seq RESTART WITH 1');
    await client.query('DELETE FROM purchase_orders');
    await client.query('ALTER SEQUENCE IF EXISTS purchase_orders_id_seq RESTART WITH 1');

    console.log('Clearing inventory...');
    await client.query('DELETE FROM inventory');
    await client.query('ALTER SEQUENCE IF EXISTS inventory_id_seq RESTART WITH 1');

    console.log('Clearing products...');
    await client.query('DELETE FROM products');
    await client.query('ALTER SEQUENCE IF EXISTS products_id_seq RESTART WITH 1');

    console.log('Clearing categories...');
    await client.query('DELETE FROM categories');
    await client.query('ALTER SEQUENCE IF EXISTS categories_id_seq RESTART WITH 1');

    await client.query('COMMIT');
    console.log('Transaction committed successfully.');

    // 3. Verify counts
    const checks = await Promise.all([
      client.query('SELECT COUNT(*) FROM products'),
      client.query('SELECT COUNT(*) FROM categories'),
      client.query('SELECT COUNT(*) FROM stock_movements'),
      client.query('SELECT COUNT(*) FROM inventory'),
      client.query('SELECT COUNT(*) FROM warehouses'),
      client.query('SELECT COUNT(*) FROM users'),
    ]);

    console.log('====================================================');
    console.log(' VERIFICATION RESULT:');
    console.log(` Products:        ${checks[0].rows[0].count}`);
    console.log(` Categories:      ${checks[1].rows[0].count}`);
    console.log(` Stock Movements: ${checks[2].rows[0].count} (History)`);
    console.log(` Inventory:       ${checks[3].rows[0].count}`);
    console.log(` Warehouses:      ${checks[4].rows[0].count} (Preserved)`);
    console.log(` Users:           ${checks[5].rows[0].count} (Preserved)`);
    console.log('====================================================');
    console.log('ALL PRODUCTS, HISTORY, AND CATEGORIES SUCCESSFULLY REMOVED!');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('ERROR during data cleanup:', err);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

clearData();

