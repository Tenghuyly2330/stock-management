const bcrypt = require('bcryptjs');
const { pool } = require('../config/db');
const env = require('../config/env');

async function runSeed() {
  console.log('====================================================');
  console.log(' Seeding Stock Management Database with Initial Data');
  console.log('====================================================');

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // 1. SEED ROLES
    console.log(' Seeding roles...');
    const rolesData = [
      { name: 'admin', description: 'Full system administrative access' },
      { name: 'manager', description: 'Warehouse operations, procurement, and reports' },
      { name: 'staff', description: 'Inventory scanning, sales fulfillment, and order viewing' },
    ];

    const roleMap = {};
    for (const role of rolesData) {
      const res = await client.query(
        `INSERT INTO roles (name, description)
         VALUES ($1, $2)
         ON CONFLICT (name) DO UPDATE SET description = EXCLUDED.description
         RETURNING id, name`,
        [role.name, role.description]
      );
      roleMap[res.rows[0].name] = res.rows[0].id;
    }

    // 2. SEED USERS
    console.log(' Seeding initial users...');
    const saltRounds = 10;
    const adminHash = await bcrypt.hash('Admin@123456', saltRounds);
    const managerHash = await bcrypt.hash('Manager@123456', saltRounds);
    const staffHash = await bcrypt.hash('Staff@123456', saltRounds);

    const usersData = [
      {
        role_id: roleMap['admin'],
        first_name: 'System',
        last_name: 'Administrator',
        email: 'admin@stocksync.com',
        password_hash: adminHash,
        phone: '+1-555-0100',
      },
      {
        role_id: roleMap['manager'],
        first_name: 'Sarah',
        last_name: 'Connor',
        email: 'manager@stocksync.com',
        password_hash: managerHash,
        phone: '+1-555-0101',
      },
      {
        role_id: roleMap['staff'],
        first_name: 'John',
        last_name: 'Doe',
        email: 'staff@stocksync.com',
        password_hash: staffHash,
        phone: '+1-555-0102',
      },
    ];

    const userMap = {};
    for (const u of usersData) {
      const res = await client.query(
        `INSERT INTO users (role_id, first_name, last_name, email, password_hash, phone)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (email) DO UPDATE SET
           role_id = EXCLUDED.role_id,
           first_name = EXCLUDED.first_name,
           last_name = EXCLUDED.last_name,
           phone = EXCLUDED.phone
         RETURNING id, email`,
        [u.role_id, u.first_name, u.last_name, u.email, u.password_hash, u.phone]
      );
      userMap[res.rows[0].email] = res.rows[0].id;
    }

    // 3. SEED CATEGORIES
    console.log(' Seeding product categories...');
    const categoriesData = [
      { name: 'Farm Machinery & Tractors', description: 'Utility tractors, rotary tillers, PTO augers, log splitters, and agricultural machinery' },
      { name: 'Metals & Structural Steel', description: 'Rebar, corrugated steel sheets, aluminum I-beams, seamless pipes, and welding equipment' },
      { name: 'Irrigation & Farm Pumps', description: 'High-flow diesel trash pumps, well submersible pumps, and agricultural piping' },
      { name: 'Farm Hardware & Fencing', description: 'Barbed wire spools, steel T-posts, heavy-duty silage tarps, and livestock enclosures' },
      { name: 'Electronics', description: 'Sensors, microcontrollers, barcode scanners, and accessories' },
      { name: 'Hardware & Tools', description: 'Assembly tools, fasteners, drills, and brackets' },
      { name: 'Packaging & Shipping', description: 'Corrugated cartons, bubble wrap, labels, and strapping' },
      { name: 'Apparel & Uniforms', description: 'Safety vests, work boots, protective gloves' },
      { name: 'Raw Materials', description: 'Aluminum sheets, copper wiring, polymers' },
    ];

    const categoryMap = {};
    for (const cat of categoriesData) {
      const res = await client.query(
        `INSERT INTO categories (name, description)
         VALUES ($1, $2)
         ON CONFLICT (name) DO UPDATE SET description = EXCLUDED.description
         RETURNING id, name`,
        [cat.name, cat.description]
      );
      categoryMap[res.rows[0].name] = res.rows[0].id;
    }

    // 4. SEED WAREHOUSES
    console.log(' Seeding warehouse locations...');
    const warehousesData = [
      {
        name: 'Main Distribution Center',
        code: 'W-CENTRAL',
        address: '100 Logistics Blvd, Dallas, TX 75201',
        contact_phone: '+1-214-555-0199',
      },
      {
        name: 'North Regional Hub',
        code: 'W-NORTH',
        address: '450 Industrial Pkwy, Chicago, IL 60607',
        contact_phone: '+1-312-555-0144',
      },
      {
        name: 'Downtown Fulfillment Depot',
        code: 'W-DOWNTOWN',
        address: '77 Commerce St, Austin, TX 78701',
        contact_phone: '+1-512-555-0188',
      },
    ];

    const warehouseMap = {};
    for (const wh of warehousesData) {
      const res = await client.query(
        `INSERT INTO warehouses (name, code, address, contact_phone)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (code) DO UPDATE SET
           name = EXCLUDED.name,
           address = EXCLUDED.address,
           contact_phone = EXCLUDED.contact_phone
         RETURNING id, code`,
        [wh.name, wh.code, wh.address, wh.contact_phone]
      );
      warehouseMap[res.rows[0].code] = res.rows[0].id;
    }

    // 5. SEED SUPPLIERS
    console.log(' Seeding suppliers...');
    const suppliersData = [
      {
        company_name: 'Apex Global Technologies',
        contact_person: 'Alice Vance',
        email: 'orders@apexglobal.com',
        phone: '+1-800-555-4321',
        address: '500 Technology Way',
        city: 'San Jose',
        country: 'USA',
      },
      {
        company_name: 'Nordic Packaging Solutions',
        contact_person: 'Robert King',
        email: 'sales@nordicpackaging.com',
        phone: '+1-888-555-9876',
        address: '88 Harbor Rd',
        city: 'Seattle',
        country: 'USA',
      },
      {
        company_name: 'Titan Industrial Hardware',
        contact_person: 'Maria Chen',
        email: 'mchen@titanhardware.com',
        phone: '+1-877-555-3456',
        address: '220 Foundry Lane',
        city: 'Pittsburgh',
        country: 'USA',
      },
    ];

    const supplierMap = {};
    for (const sup of suppliersData) {
      const res = await client.query(
        `INSERT INTO suppliers (company_name, contact_person, email, phone, address, city, country)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING id, company_name`,
        [sup.company_name, sup.contact_person, sup.email, sup.phone, sup.address, sup.city, sup.country]
      );
      supplierMap[sup.company_name] = res.rows[0].id;
    }

    // 6. SEED PRODUCTS
    console.log(' Seeding master product catalog...');
    const productsData = [
      {
        category_id: categoryMap['Electronics'],
        name: 'Industrial Handheld Barcode Scanner 2D',
        sku: 'ELEC-SCN-001',
        barcode: '8901234567890',
        description: 'Rugged IP65 wireless barcode scanner with Bluetooth base station',
        purchase_price: 120.00,
        selling_price: 199.99,
        min_stock_level: 15,
      },
      {
        category_id: categoryMap['Electronics'],
        name: 'Thermal Shipping Label Printer 4x6',
        sku: 'ELEC-PRN-002',
        barcode: '8901234567891',
        description: 'High-speed thermal direct printer for warehouse shipping tags',
        purchase_price: 145.00,
        selling_price: 249.50,
        min_stock_level: 10,
      },
      {
        category_id: categoryMap['Hardware & Tools'],
        name: 'Precision Heavy Duty Pallet Jack (5500 lbs)',
        sku: 'HDW-PLT-003',
        barcode: '8901234567892',
        description: 'Hydraulic hand pallet truck with polyurethane steer wheels',
        purchase_price: 280.00,
        selling_price: 450.00,
        min_stock_level: 5,
      },
      {
        category_id: categoryMap['Hardware & Tools'],
        name: 'Safety Utility Box Cutters (Pack of 12)',
        sku: 'HDW-CUT-004',
        barcode: '8901234567893',
        description: 'Auto-retracting safety film and carton box cutter knives',
        purchase_price: 18.00,
        selling_price: 36.00,
        min_stock_level: 25,
      },
      {
        category_id: categoryMap['Packaging & Shipping'],
        name: 'Heavy Duty Shipping Cartons 18x14x12 (Bundle of 25)',
        sku: 'PKG-BOX-005',
        barcode: '8901234567894',
        description: 'Double-walled corrugated shipping boxes for freight',
        purchase_price: 32.50,
        selling_price: 58.00,
        min_stock_level: 50,
      },
      {
        category_id: categoryMap['Packaging & Shipping'],
        name: 'Industrial Stretch Film Roll 18 inch x 1500 ft',
        sku: 'PKG-FLM-006',
        barcode: '8901234567895',
        description: '80 Gauge heavy-duty clear pallet wrapping stretch film',
        purchase_price: 14.00,
        selling_price: 26.50,
        min_stock_level: 40,
      },
      {
        category_id: categoryMap['Apparel & Uniforms'],
        name: 'High-Visibility Reflective Safety Vest (Class 2)',
        sku: 'APP-VST-007',
        barcode: '8901234567896',
        description: 'ANSI certified fluorescent yellow mesh safety vest with zipper',
        purchase_price: 6.50,
        selling_price: 14.99,
        min_stock_level: 30,
      },
      {
        category_id: categoryMap['Apparel & Uniforms'],
        name: 'Steel Toe Puncture-Resistant Work Boots',
        sku: 'APP-BOT-008',
        barcode: '8901234567897',
        description: 'Oil and slip-resistant composite shank safety work boots',
        purchase_price: 55.00,
        selling_price: 110.00,
        min_stock_level: 12,
      },
    ];

    const productMap = {};
    for (const p of productsData) {
      const res = await client.query(
        `INSERT INTO products (category_id, name, sku, barcode, description, purchase_price, selling_price, min_stock_level)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         ON CONFLICT (sku) DO UPDATE SET
           name = EXCLUDED.name,
           purchase_price = EXCLUDED.purchase_price,
           selling_price = EXCLUDED.selling_price,
           min_stock_level = EXCLUDED.min_stock_level
         RETURNING id, sku`,
        [p.category_id, p.name, p.sku, p.barcode, p.description, p.purchase_price, p.selling_price, p.min_stock_level]
      );
      productMap[res.rows[0].sku] = res.rows[0].id;
    }

    // 7. SEED INVENTORY & INITIAL STOCK MOVEMENTS
    console.log(' Seeding warehouse inventory balances & movement ledger...');
    const adminUserId = userMap['admin@stocksync.com'];
    const centralWhId = warehouseMap['W-CENTRAL'];
    const northWhId = warehouseMap['W-NORTH'];
    const downtownWhId = warehouseMap['W-DOWNTOWN'];

    const initialInventory = [
      { sku: 'ELEC-SCN-001', whId: centralWhId, qty: 50 },
      { sku: 'ELEC-SCN-001', whId: northWhId, qty: 20 },
      { sku: 'ELEC-PRN-002', whId: centralWhId, qty: 35 },
      { sku: 'ELEC-PRN-002', whId: downtownWhId, qty: 15 },
      { sku: 'HDW-PLT-003', whId: centralWhId, qty: 8 },
      { sku: 'HDW-PLT-003', whId: northWhId, qty: 4 },
      { sku: 'HDW-CUT-004', whId: centralWhId, qty: 120 },
      { sku: 'HDW-CUT-004', whId: downtownWhId, qty: 45 },
      { sku: 'PKG-BOX-005', whId: centralWhId, qty: 250 },
      { sku: 'PKG-BOX-005', whId: northWhId, qty: 100 },
      { sku: 'PKG-FLM-006', whId: centralWhId, qty: 180 },
      { sku: 'APP-VST-007', whId: centralWhId, qty: 90 },
      { sku: 'APP-VST-007', whId: northWhId, qty: 40 },
      { sku: 'APP-BOT-008', whId: centralWhId, qty: 30 },
      { sku: 'APP-BOT-008', whId: downtownWhId, qty: 10 },
    ];

    for (const inv of initialInventory) {
      const prodId = productMap[inv.sku];

      // Upsert inventory
      await client.query(
        `INSERT INTO inventory (product_id, warehouse_id, quantity)
         VALUES ($1, $2, $3)
         ON CONFLICT (product_id, warehouse_id)
         DO UPDATE SET quantity = EXCLUDED.quantity`,
        [prodId, inv.whId, inv.qty]
      );

      // Record in stock_movements ledger
      await client.query(
        `INSERT INTO stock_movements (
           product_id, destination_warehouse_id, movement_type, quantity,
           reference_type, reference_id, notes, created_by
         ) VALUES ($1, $2, 'IN', $3, 'INITIAL_STOCK', 'INIT-2026', 'Opening stock balance seeding', $4)`,
        [prodId, inv.whId, inv.qty, adminUserId]
      );
    }

    await client.query('COMMIT');
    console.log('====================================================');
    console.log(' Database Seeding Finished Successfully!');
    console.log(' Default Login Credentials:');
    console.log('   Admin:    admin@stocksync.com   / Admin@123456');
    console.log('   Manager:  manager@stocksync.com / Manager@123456');
    console.log('   Staff:    staff@stocksync.com   / Staff@123456');
    console.log('====================================================');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(' Seeding Failed! Transaction rolled back:', err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

if (require.main === module) {
  runSeed();
}

module.exports = runSeed;

