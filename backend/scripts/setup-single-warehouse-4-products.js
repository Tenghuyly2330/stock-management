/**
 * Setup Script: Configure exactly 1 Warehouse (BASE-01) and 4 Products (Farm Machines & Metals)
 */
const { pool } = require('../src/config/db');

async function setupSingleWarehouseAnd4Products() {
  const client = await pool.connect();
  console.log('================================================================');
  console.log(' CONFIGURING 1 BASE WAREHOUSE & EXACTLY 4 PRODUCTS');
  console.log('================================================================\n');

  try {
    await client.query('BEGIN');

    // 1. Ensure Categories exist
    const catMachinery = await client.query(
      `INSERT INTO categories (name, description, is_active)
       VALUES ('Farm Machinery & Tractors', 'Utility tractors, rotary tillers, and heavy agricultural machinery', TRUE)
       ON CONFLICT (name) DO UPDATE SET is_active = TRUE
       RETURNING id`
    );
    const catMachineryId = catMachinery.rows[0].id;

    const catMetals = await client.query(
      `INSERT INTO categories (name, description, is_active)
       VALUES ('Metals & Structural Steel', 'Steel rebar bundles, corrugated roofing panels, and structural steel', TRUE)
       ON CONFLICT (name) DO UPDATE SET is_active = TRUE
       RETURNING id`
    );
    const catMetalsId = catMetals.rows[0].id;

    // Deactivate unused categories so category list only displays Farm Machinery & Metals
    await client.query(`UPDATE categories SET is_active = FALSE WHERE id NOT IN ($1, $2)`, [catMachineryId, catMetalsId]);

    // 2. Ensure Warehouse 1 is the ONLY active Base Warehouse
    await client.query(
      `UPDATE warehouses 
       SET name = 'Main Base Warehouse', 
           code = 'BASE-01', 
           address = '7700 Industrial Parkway, Base Depot, TX 75201', 
           contact_phone = '+1-800-555-BASE',
           is_active = TRUE 
       WHERE id = 1`
    );

    // Remove or soft-delete other warehouses (ids != 1)
    await client.query(`DELETE FROM inventory WHERE warehouse_id != 1`);
    await client.query(`UPDATE stock_movements SET source_warehouse_id = 1 WHERE source_warehouse_id != 1`);
    await client.query(`UPDATE stock_movements SET destination_warehouse_id = 1 WHERE destination_warehouse_id != 1`);
    await client.query(`DELETE FROM purchase_orders WHERE warehouse_id != 1`);
    await client.query(`DELETE FROM sales_orders WHERE warehouse_id != 1`);
    await client.query(`DELETE FROM warehouses WHERE id != 1`);

    console.log('1. Set single Base Warehouse: Main Base Warehouse (BASE-01)');

    // 3. Define the 4 target products: 2 Farm Machines + 2 Metals
    const targetProducts = [
      {
        category_id: catMachineryId,
        name: '75HP 4WD Utility Farm Tractor (Diesel Cab)',
        sku: 'MCH-TRC-75HP',
        barcode: '890554433001',
        description: 'Heavy-duty 75HP 4WD diesel utility tractor with synchronized transmission, dual remote hydraulics, Category 2 three-point hitch, and climate-controlled ROPS safety cab.',
        image_url: 'https://images.unsplash.com/photo-1592878904946-b3cd8ae243d0?auto=format&fit=crop&w=800&q=80',
        purchase_price: 22500.00,
        selling_price: 29990.00,
        min_stock_level: 2,
        stock_units: 8,
      },
      {
        category_id: catMachineryId,
        name: 'Heavy-Duty Rotary Tiller 72-Inch (3-Point PTO)',
        sku: 'MCH-TIL-72IN',
        barcode: '890554433002',
        description: 'Commercial gear-driven 72-inch rotary tiller for seedbed soil preparation, equipped with heat-treated L-shaped blades and 540 RPM PTO slip clutch protection.',
        image_url: 'https://images.unsplash.com/photo-1589824783837-6169889fa20f?auto=format&fit=crop&w=800&q=80',
        purchase_price: 2400.00,
        selling_price: 3450.00,
        min_stock_level: 4,
        stock_units: 15,
      },
      {
        category_id: catMetalsId,
        name: 'Grade 60 Deformed Steel Rebar #4 (1/2" x 20ft Bundle of 50)',
        sku: 'MTL-RBR-050B',
        barcode: '890554433005',
        description: 'ASTM A615 Grade 60 hot-rolled ribbed concrete reinforcing carbon steel rebar bundle for agricultural barn pads, retaining walls, and commercial foundations.',
        image_url: 'https://images.unsplash.com/photo-1504917599217-d4dc5ebe6122?auto=format&fit=crop&w=800&q=80',
        purchase_price: 490.00,
        selling_price: 680.00,
        min_stock_level: 15,
        stock_units: 120,
      },
      {
        category_id: catMetalsId,
        name: 'Galvanized Corrugated Steel Roofing Sheets 29-Gauge 12ft (Pack of 10)',
        sku: 'MTL-CRG-29G12',
        barcode: '890554433006',
        description: 'Heavy G90 hot-dipped zinc galvanized corrosion-resistant corrugated steel roofing and siding panels for barns, equipment shelters, and grain storage sheds.',
        image_url: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=800&q=80',
        purchase_price: 220.00,
        selling_price: 345.00,
        min_stock_level: 20,
        stock_units: 85,
      },
    ];

    // 4. Upsert the 4 products and capture their IDs
    const keptProductIds = [];
    const keptProductMap = {};

    for (const p of targetProducts) {
      const pRes = await client.query(
        `INSERT INTO products (
           category_id, name, sku, barcode, description, image_url,
           purchase_price, selling_price, min_stock_level, is_active
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, TRUE)
         ON CONFLICT (sku) DO UPDATE SET
           name = EXCLUDED.name,
           category_id = EXCLUDED.category_id,
           barcode = EXCLUDED.barcode,
           description = EXCLUDED.description,
           image_url = EXCLUDED.image_url,
           purchase_price = EXCLUDED.purchase_price,
           selling_price = EXCLUDED.selling_price,
           min_stock_level = EXCLUDED.min_stock_level,
           is_active = TRUE
         RETURNING id, name, sku`,
        [
          p.category_id,
          p.name,
          p.sku,
          p.barcode,
          p.description,
          p.image_url,
          p.purchase_price,
          p.selling_price,
          p.min_stock_level,
        ]
      );
      const prodId = pRes.rows[0].id;
      keptProductIds.push(prodId);
      keptProductMap[p.sku] = { ...p, id: prodId };
    }

    // 5. Clean up other products (only keep the 4 target products active)
    await client.query(`DELETE FROM inventory WHERE product_id NOT IN (${keptProductIds.join(',')})`);
    await client.query(`DELETE FROM stock_movements WHERE product_id NOT IN (${keptProductIds.join(',')})`);
    await client.query(`DELETE FROM purchase_order_items WHERE product_id NOT IN (${keptProductIds.join(',')})`);
    await client.query(`DELETE FROM sales_order_items WHERE product_id NOT IN (${keptProductIds.join(',')})`);
    await client.query(`DELETE FROM products WHERE id NOT IN (${keptProductIds.join(',')})`);

    console.log(`2. Trimmed catalog to exactly ${keptProductIds.length} products.`);

    // 6. Set stock in Base Warehouse (warehouse_id = 1) for the 4 products
    const adminRes = await client.query(`SELECT id FROM users WHERE email = 'admin@stocksync.com' LIMIT 1`);
    const adminId = adminRes.rows[0]?.id || 1;

    for (const p of targetProducts) {
      const prodId = keptProductMap[p.sku].id;

      // Upsert into inventory for Base Warehouse (id = 1)
      await client.query(
        `INSERT INTO inventory (product_id, warehouse_id, quantity)
         VALUES ($1, 1, $2)
         ON CONFLICT (product_id, warehouse_id)
         DO UPDATE SET quantity = EXCLUDED.quantity`,
        [prodId, p.stock_units]
      );

      // Record in stock_movements
      await client.query(
        `INSERT INTO stock_movements (
           product_id, destination_warehouse_id, movement_type, quantity,
           reference_type, reference_id, notes, created_by
         ) VALUES ($1, 1, 'IN', $2, 'INITIAL_STOCK', 'INIT-BASE-2026', 'Opening stock in Base Warehouse', $3)`,
        [prodId, p.stock_units, adminId]
      );

      console.log(`   + [${p.sku}] ${p.name}: ${p.stock_units} units in Base Warehouse`);
    }

    // Add a couple of realistic "Who Bought & Who Added" sample history records
    const tractorId = keptProductMap['MCH-TRC-75HP'].id;
    const rebarId = keptProductMap['MTL-RBR-050B'].id;

    // A recent customer purchase
    await client.query(
      `INSERT INTO stock_movements (
         product_id, source_warehouse_id, movement_type, quantity,
         reference_type, reference_id, notes, created_by
       ) VALUES ($1, 1, 'OUT', 1, 'SALES_ORDER', 'Highland Valley Cattle Co.', 'Sold 1 unit 75HP Tractor for North Pasture deployment', $2)`,
      [tractorId, adminId]
    );

    // A recent supplier stock arrival
    await client.query(
      `INSERT INTO stock_movements (
         product_id, destination_warehouse_id, movement_type, quantity,
         reference_type, reference_id, notes, created_by
       ) VALUES ($1, 1, 'IN', 20, 'PURCHASE_ORDER', 'Apex Industrial Steel Corp.', 'Restock delivery of 20 bundles Grade 60 Rebar', $2)`,
      [rebarId, adminId]
    );

    await client.query('COMMIT');
    console.log('\n================================================================');
    console.log(' DATABASE SUCCESSFULLY CONFIGURED: 1 WAREHOUSE & 4 PRODUCTS!');
    console.log('================================================================\n');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Configuration Failed:', error);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

setupSingleWarehouseAnd4Products();
