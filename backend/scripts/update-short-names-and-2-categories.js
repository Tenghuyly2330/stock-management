/**
 * Script: Simplify to exactly 2 categories and short product names
 */
const { pool } = require('../src/config/db');

async function updateShortNamesAnd2Categories() {
  const client = await pool.connect();
  console.log('================================================================');
  console.log(' CONFIGURING EXACTLY 2 CATEGORIES & SHORT PRODUCT NAMES');
  console.log('================================================================\n');

  try {
    await client.query('BEGIN');

    // 1. Delete all other inactive categories so ONLY 2 categories exist in DB
    await client.query(`DELETE FROM categories WHERE id NOT IN (7, 8)`);

    // 2. Rename categories 7 and 8 to short names
    await client.query(
      `UPDATE categories 
       SET name = 'Farm Machines', 
           description = 'Farm tractors, tillers, and agricultural machinery', 
           is_active = TRUE 
       WHERE id = 7`
    );

    await client.query(
      `UPDATE categories 
       SET name = 'Metals', 
           description = 'Steel rebar, roofing metal sheets, and structural metals', 
           is_active = TRUE 
       WHERE id = 8`
    );

    console.log('1. Categories updated to 2 clean categories:');
    const catRes = await client.query(`SELECT id, name FROM categories ORDER BY id`);
    console.log(catRes.rows);

    // 3. Update the 4 product names to short, simple names
    await client.query(
      `UPDATE products 
       SET name = 'Farm Tractor',
           category_id = 7
       WHERE sku = 'MCH-TRC-75HP'`
    );

    await client.query(
      `UPDATE products 
       SET name = 'Rotary Tiller',
           category_id = 7
       WHERE sku = 'MCH-TIL-72IN'`
    );

    await client.query(
      `UPDATE products 
       SET name = 'Steel Rebar',
           category_id = 8
       WHERE sku = 'MTL-RBR-050B'`
    );

    await client.query(
      `UPDATE products 
       SET name = 'Roofing Sheet',
           category_id = 8
       WHERE sku = 'MTL-CRG-29G12'`
    );

    console.log('\n2. Products updated to short names:');
    const prodRes = await client.query(`SELECT id, name, sku, purchase_price, selling_price FROM products ORDER BY id`);
    console.log(prodRes.rows);

    await client.query('COMMIT');
    console.log('\n================================================================');
    console.log(' DATABASE SUCCESSFULLY UPDATED!');
    console.log('================================================================\n');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Update Failed:', error);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

updateShortNamesAnd2Categories();
