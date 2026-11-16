/**
 * Seeder Script: Populate Farm Machinery, Agricultural Equipment, and Industrial Metals Catalog
 */
const { pool } = require('../src/config/db');

async function seedFarmAndMetals() {
  const client = await pool.connect();
  console.log('================================================================');
  console.log(' SEEDING FARM MACHINERY, AGRICULTURAL IMPLEMENTS & METALS');
  console.log('================================================================\n');

  try {
    await client.query('BEGIN');

    // 1. Get or create Admin user for movement audit trail
    const adminRes = await client.query(`SELECT id FROM users WHERE email = 'admin@stocksync.com' LIMIT 1`);
    const adminId = adminRes.rows[0]?.id || 1;

    // 2. Fetch active warehouses
    const whRes = await client.query(`SELECT id, code, name FROM warehouses WHERE is_active = TRUE ORDER BY id ASC`);
    if (whRes.rows.length === 0) {
      throw new Error('No active warehouses found. Please run initial migration and seed first.');
    }
    const warehouses = whRes.rows;
    console.log(`Found ${warehouses.length} active warehouses: ${warehouses.map((w) => w.code).join(', ')}`);

    // 3. Define Industry Categories
    const categories = [
      {
        name: 'Farm Machinery & Tractors',
        description: 'Utility tractors, rotary tillers, PTO augers, log splitters, and agricultural machinery',
      },
      {
        name: 'Metals & Structural Steel',
        description: 'Rebar, corrugated steel sheets, aluminum I-beams, seamless pipes, and welding equipment',
      },
      {
        name: 'Irrigation & Farm Pumps',
        description: 'High-flow diesel trash pumps, well submersible pumps, and agricultural piping',
      },
      {
        name: 'Farm Hardware & Fencing',
        description: 'Barbed wire spools, steel T-posts, heavy-duty silage tarps, and livestock enclosures',
      },
    ];

    const categoryMap = {};
    for (const cat of categories) {
      const res = await client.query(
        `INSERT INTO categories (name, description, is_active)
         VALUES ($1, $2, TRUE)
         ON CONFLICT (name) DO UPDATE SET description = EXCLUDED.description, is_active = TRUE
         RETURNING id, name`,
        [cat.name, cat.description]
      );
      categoryMap[res.rows[0].name] = res.rows[0].id;
    }
    console.log(' Categories registered successfully.');

    // 4. Define Farm Machinery, Agricultural Equipment & Industrial Metal Products
    const products = [
      {
        category_id: categoryMap['Farm Machinery & Tractors'],
        name: '75HP 4WD Utility Farm Tractor (Diesel Cab)',
        sku: 'MCH-TRC-75HP',
        barcode: '890554433001',
        description: 'Heavy-duty 75HP 4WD diesel utility tractor with synchronized transmission, dual remote hydraulics, Category 2 three-point hitch, and climate-controlled ROPS safety cab.',
        image_url: 'https://images.unsplash.com/photo-1592878904946-b3cd8ae243d0?auto=format&fit=crop&w=800&q=80',
        purchase_price: 22500.00,
        selling_price: 29990.00,
        min_stock_level: 2,
        stock_distribution: [4, 2, 1], // units per warehouse
      },
      {
        category_id: categoryMap['Farm Machinery & Tractors'],
        name: 'Heavy-Duty Rotary Tiller 72-Inch (3-Point PTO)',
        sku: 'MCH-TIL-72IN',
        barcode: '890554433002',
        description: 'Commercial gear-driven 72-inch rotary tiller for seedbed soil preparation, equipped with heat-treated L-shaped blades and 540 RPM PTO slip clutch protection.',
        image_url: 'https://images.unsplash.com/photo-1589824783837-6169889fa20f?auto=format&fit=crop&w=800&q=80',
        purchase_price: 2400.00,
        selling_price: 3450.00,
        min_stock_level: 5,
        stock_distribution: [8, 4, 3],
      },
      {
        category_id: categoryMap['Farm Machinery & Tractors'],
        name: 'Portable PTO Grain Transport Auger (8in x 51ft)',
        sku: 'MCH-AUG-8X51',
        barcode: '890554433003',
        description: 'Heavy-gauge galvanized steel tubing grain auger with scissor-lift wheeled transport chassis, high-intake flighting, and reversible clean-out gearbox.',
        image_url: 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=800&q=80',
        purchase_price: 4800.00,
        selling_price: 6200.00,
        min_stock_level: 3,
        stock_distribution: [5, 2, 0],
      },
      {
        category_id: categoryMap['Farm Machinery & Tractors'],
        name: 'Commercial Hydraulic Log Splitter (35-Ton Kohler Engine)',
        sku: 'MCH-LOG-35TN',
        barcode: '890554433004',
        description: '35-Ton horizontal and vertical full-beam hydraulic firewood log splitter powered by a 9.5HP Kohler commercial gas engine with 10.5-second auto-return cycle.',
        image_url: 'https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?auto=format&fit=crop&w=800&q=80',
        purchase_price: 1450.00,
        selling_price: 2150.00,
        min_stock_level: 6,
        stock_distribution: [12, 6, 2],
      },
      {
        category_id: categoryMap['Metals & Structural Steel'],
        name: 'Grade 60 Deformed Steel Rebar #4 (1/2" x 20ft Bundle of 50)',
        sku: 'MTL-RBR-050B',
        barcode: '890554433005',
        description: 'ASTM A615 Grade 60 hot-rolled ribbed concrete reinforcing carbon steel rebar bundle for agricultural barn pads, retaining walls, and commercial foundations.',
        image_url: 'https://images.unsplash.com/photo-1504917599217-d4dc5ebe6122?auto=format&fit=crop&w=800&q=80',
        purchase_price: 490.00,
        selling_price: 680.00,
        min_stock_level: 15,
        stock_distribution: [60, 35, 20],
      },
      {
        category_id: categoryMap['Metals & Structural Steel'],
        name: 'Galvanized Corrugated Steel Roofing Sheets 29-Gauge 12ft (Pack of 10)',
        sku: 'MTL-CRG-29G12',
        barcode: '890554433006',
        description: 'Heavy G90 hot-dipped zinc galvanized corrosion-resistant corrugated steel roofing and siding panels for barns, equipment shelters, and grain storage sheds.',
        image_url: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=800&q=80',
        purchase_price: 220.00,
        selling_price: 345.00,
        min_stock_level: 20,
        stock_distribution: [45, 30, 15],
      },
      {
        category_id: categoryMap['Metals & Structural Steel'],
        name: 'Structural Aluminum I-Beam 6061-T6 (4" x 6" x 20ft)',
        sku: 'MTL-ALM-4X6IB',
        barcode: '890554433007',
        description: 'Extruded high-strength architectural aluminum alloy I-beam with superior corrosion resistance for machinery framing, greenhouse trusses, and lightweight spans.',
        image_url: 'https://images.unsplash.com/photo-1535813547-99c456a41d4a?auto=format&fit=crop&w=800&q=80',
        purchase_price: 210.00,
        selling_price: 320.00,
        min_stock_level: 10,
        stock_distribution: [25, 12, 8],
      },
      {
        category_id: categoryMap['Metals & Structural Steel'],
        name: 'Stainless Steel 304 Seamless Pipe (2" SCH 40 x 20ft)',
        sku: 'MTL-PIP-SS304',
        barcode: '890554433008',
        description: 'Austenitic 304 food-grade polished seamless stainless steel piping for dairy washdown systems, food processing, and chemical fertilizer transfer.',
        image_url: 'https://images.unsplash.com/photo-1587293852726-70cdb56c2866?auto=format&fit=crop&w=800&q=80',
        purchase_price: 125.00,
        selling_price: 185.00,
        min_stock_level: 15,
        stock_distribution: [35, 18, 10],
      },
      {
        category_id: categoryMap['Irrigation & Farm Pumps'],
        name: 'High-Output Diesel Irrigation Trash Pump (4-Inch 1200 GPM)',
        sku: 'AGR-PMP-4IN12',
        barcode: '890554433009',
        description: 'Commercial 4-inch self-priming centrifugal dewatering and flood irrigation pump with electric-start 10HP air-cooled diesel engine and rugged steel roll cage.',
        image_url: 'https://images.unsplash.com/photo-1621905252507-b35492cc74b4?auto=format&fit=crop&w=800&q=80',
        purchase_price: 1200.00,
        selling_price: 1850.00,
        min_stock_level: 6,
        stock_distribution: [10, 5, 2],
      },
      {
        category_id: categoryMap['Farm Hardware & Fencing'],
        name: 'High-Tensile 2-Point Barbed Wire Spool (1320 ft / 80 Rods)',
        sku: 'AGR-WIR-1320FT',
        barcode: '890554433010',
        description: 'Heavy 12.5 gauge Class 3 galvanized high-tensile steel barbed wire spool with 5-inch needle-point 2-barb spacing for secure livestock containment.',
        image_url: 'https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?auto=format&fit=crop&w=800&q=80',
        purchase_price: 65.00,
        selling_price: 98.00,
        min_stock_level: 25,
        stock_distribution: [80, 50, 25],
      },
      {
        category_id: categoryMap['Farm Hardware & Fencing'],
        name: 'Heavy-Duty UV Resistant Silage & Hay Tarp (40ft x 60ft)',
        sku: 'AGR-TRP-40X60',
        barcode: '890554433011',
        description: '16-mil multi-layer rip-stop woven polyethylene agricultural tarp with solid brass tie-down grommets and heat-sealed seams for round bale stacks and silage piles.',
        image_url: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=800&q=80',
        purchase_price: 160.00,
        selling_price: 245.00,
        min_stock_level: 15,
        stock_distribution: [40, 25, 12],
      },
      {
        category_id: categoryMap['Metals & Structural Steel'],
        name: 'Industrial MIG / TIG / Stick Multi-Process Welder 250A Kit',
        sku: 'MTL-WLD-250MP',
        barcode: '890554433012',
        description: 'Heavy-duty 250A dual-voltage 120V/240V IGBT inverter multi-process welding system for farm equipment field repair, chassis welding, and structural steel.',
        image_url: 'https://images.unsplash.com/photo-1504917599217-d4dc5ebe6122?auto=format&fit=crop&w=800&q=80',
        purchase_price: 850.00,
        selling_price: 1299.00,
        min_stock_level: 4,
        stock_distribution: [8, 4, 2],
      },
    ];

    console.log(` Seeding ${products.length} Farm Machinery, Metal & Agricultural products...`);

    for (const p of products) {
      // Upsert product
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

      const productId = pRes.rows[0].id;

      // Seed warehouse inventory balances & movement ledger records
      for (let i = 0; i < warehouses.length; i++) {
        const wh = warehouses[i];
        const qty = p.stock_distribution[i] || 0;

        // Upsert inventory
        await client.query(
          `INSERT INTO inventory (product_id, warehouse_id, quantity)
           VALUES ($1, $2, $3)
           ON CONFLICT (product_id, warehouse_id)
           DO UPDATE SET quantity = EXCLUDED.quantity`,
          [productId, wh.id, qty]
        );

        // Record initial movement log if > 0
        if (qty > 0) {
          await client.query(
            `INSERT INTO stock_movements (
               product_id, destination_warehouse_id, movement_type, quantity,
               reference_type, reference_id, notes, created_by
             ) VALUES ($1, $2, 'IN', $3, 'INITIAL_STOCK', 'INIT-FARM-2026', 'Opening stock balance for farm & metal catalog', $4)
             ON CONFLICT DO NOTHING`,
            [productId, wh.id, qty, adminId]
          );
        }
      }
      console.log(`   + [${p.sku}] ${p.name} ($${p.selling_price})`);
    }

    await client.query('COMMIT');
    console.log('\n================================================================');
    console.log(' FARM MACHINERY & METALS CATALOG SEEDED SUCCESSFULLY!');
    console.log('================================================================\n');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error(' Seeding Failed:', error);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

seedFarmAndMetals();
