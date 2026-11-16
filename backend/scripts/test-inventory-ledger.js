/**
 * Automated Verification Script for Day 5:
 * Warehouses, Suppliers, and Transactional Inventory Ledger
 */
const http = require('http');
const app = require('../src/app');
const { pool } = require('../src/config/db');

let server;
let adminToken = '';
let managerToken = '';
let staffToken = '';

function request(options, body = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        let parsed = data;
        try {
          parsed = JSON.parse(data);
        } catch {
          // keep string
        }
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: parsed,
        });
      });
    });
    req.on('error', reject);
    if (body) {
      if (typeof body === 'object') {
        req.write(JSON.stringify(body));
      } else {
        req.write(body);
      }
    }
    req.end();
  });
}

async function loginUser(email, password) {
  const res = await request(
    {
      hostname: 'localhost',
      port: 5001,
      path: '/api/auth/login',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    },
    { email, password }
  );
  if (res.statusCode !== 200) {
    throw new Error(`Login failed for ${email}: ${JSON.stringify(res.body)}`);
  }
  return res.body.data.token;
}

async function runTests() {
  console.log('===============================================================');
  console.log('   DAY 5 VERIFICATION: WAREHOUSES, SUPPLIERS & INVENTORY LEDGER');
  console.log('===============================================================\n');

  try {
    // 1. Start test server
    server = app.listen(5001);
    await new Promise((r) => setTimeout(r, 600));

    // 2. Authenticate all three roles
    console.log('[AUTH] Logging in test accounts...');
    adminToken = await loginUser('admin@stocksync.com', 'Admin@123456');
    managerToken = await loginUser('manager@stocksync.com', 'Manager@123456');
    staffToken = await loginUser('staff@stocksync.com', 'Staff@123456');
    console.log('  Admin, Manager, and Staff tokens obtained successfully.\n');

    // 3. Test Warehouses API
    console.log('[WAREHOUSES] Testing Warehouse Endpoints...');
    const listWh = await request({
      hostname: 'localhost',
      port: 5001,
      path: '/api/warehouses',
      method: 'GET',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    console.log(`  GET /api/warehouses -> status ${listWh.statusCode}, found ${listWh.body.data.length} warehouses`);
    if (listWh.statusCode !== 200 || listWh.body.data.length === 0) {
      throw new Error('Failed to retrieve seeded warehouses');
    }

    const testWh1 = listWh.body.data[0];
    const testWh2 = listWh.body.data[1];

    // Get single warehouse with inventory
    const singleWh = await request({
      hostname: 'localhost',
      port: 5001,
      path: `/api/warehouses/${testWh1.id}`,
      method: 'GET',
      headers: { Authorization: `Bearer ${staffToken}` },
    });
    console.log(`  GET /api/warehouses/${testWh1.id} -> status ${singleWh.statusCode}, items stored: ${singleWh.body.data.inventory.length}`);
    if (singleWh.statusCode !== 200 || !singleWh.body.data.inventory) {
      throw new Error('Failed to retrieve single warehouse breakdown');
    }

    // Create a new warehouse
    const uniqueWhCode = `W-TEST-${Date.now().toString().slice(-4)}`;
    const createWh = await request(
      {
        hostname: 'localhost',
        port: 5001,
        path: '/api/warehouses',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${managerToken}`,
        },
      },
      {
        name: `Test Facility ${uniqueWhCode}`,
        code: uniqueWhCode,
        address: '999 Logistics Expressway, Phoenix, AZ',
        contact_phone: '+1-602-555-0999',
      }
    );
    console.log(`  POST /api/warehouses -> status ${createWh.statusCode}, created code: ${createWh.body.data?.code}`);
    if (createWh.statusCode !== 201) {
      throw new Error(`Failed to create warehouse: ${JSON.stringify(createWh.body)}`);
    }
    const createdWhId = createWh.body.data.id;

    // Test Deletion Protection: seeded warehouse with stock > 0 should REJECT deletion
    const deleteBlocked = await request({
      hostname: 'localhost',
      port: 5001,
      path: `/api/warehouses/${testWh1.id}`,
      method: 'DELETE',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    console.log(`  DELETE /api/warehouses/${testWh1.id} (with active stock) -> status ${deleteBlocked.statusCode} (Expected 400)`);
    if (deleteBlocked.statusCode !== 400) {
      throw new Error(`Expected 400 Bad Request when deleting warehouse with stock, got ${deleteBlocked.statusCode}`);
    }

    // Clean delete of the newly created empty warehouse
    const deleteEmpty = await request({
      hostname: 'localhost',
      port: 5001,
      path: `/api/warehouses/${createdWhId}`,
      method: 'DELETE',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    console.log(`  DELETE /api/warehouses/${createdWhId} (empty) -> status ${deleteEmpty.statusCode}`);
    if (deleteEmpty.statusCode !== 200) {
      throw new Error(`Failed to delete empty warehouse: ${JSON.stringify(deleteEmpty.body)}`);
    }
    console.log('  Warehouse tests passed!\n');

    // 4. Test Suppliers API
    console.log('[SUPPLIERS] Testing Supplier Endpoints...');
    const listSuppliers = await request({
      hostname: 'localhost',
      port: 5001,
      path: '/api/suppliers',
      method: 'GET',
      headers: { Authorization: `Bearer ${staffToken}` },
    });
    console.log(`  GET /api/suppliers -> status ${listSuppliers.statusCode}, total suppliers: ${listSuppliers.body.data.length}`);
    if (listSuppliers.statusCode !== 200 || listSuppliers.body.data.length === 0) {
      throw new Error('Failed to retrieve suppliers');
    }

    // Create supplier
    const supName = `Global Vendor ${Date.now().toString().slice(-4)}`;
    const createSup = await request(
      {
        hostname: 'localhost',
        port: 5001,
        path: '/api/suppliers',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${managerToken}`,
        },
      },
      {
        company_name: supName,
        contact_person: 'Sarah Connor',
        email: 'sarah@globalvendor.com',
        phone: '+1-555-888-9999',
        city: 'Seattle',
        country: 'USA',
      }
    );
    console.log(`  POST /api/suppliers -> status ${createSup.statusCode}, name: ${createSup.body.data?.company_name}`);
    if (createSup.statusCode !== 201) {
      throw new Error(`Failed to create supplier: ${JSON.stringify(createSup.body)}`);
    }
    console.log('  Supplier tests passed!\n');

    // 5. Test Inventory List & KPI Summary
    console.log('[INVENTORY] Testing Inventory Ledger & Balances...');
    const invRes = await request({
      hostname: 'localhost',
      port: 5001,
      path: '/api/inventory',
      method: 'GET',
      headers: { Authorization: `Bearer ${staffToken}` },
    });
    console.log(`  GET /api/inventory -> status ${invRes.statusCode}`);
    console.log(`    Total unique records: ${invRes.body.stats?.total_items}`);
    console.log(`    Total stock units: ${invRes.body.stats?.total_quantity}`);
    console.log(`    Total valuation: $${invRes.body.stats?.total_valuation}`);
    if (invRes.statusCode !== 200 || !invRes.body.data || invRes.body.data.length === 0) {
      throw new Error('Failed to retrieve inventory balances');
    }

    // Pick a product and two warehouses for transactions
    const invItem = invRes.body.data[0];
    const testProductId = invItem.product_id;
    const testSourceWhId = testWh1.id;
    const testDestWhId = testWh2.id;
    console.log(`  Testing with Product ID ${testProductId} (${invItem.product_name})`);

    // 6. Test Stock In (Increase)
    console.log('\n[TRANSACTION] Testing Stock In (Atomic Upsert)...');
    const stockInRes = await request(
      {
        hostname: 'localhost',
        port: 5001,
        path: '/api/inventory/stock-in',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${staffToken}`,
        },
      },
      {
        productId: testProductId,
        warehouseId: testSourceWhId,
        quantity: 25,
        referenceType: 'MANUAL_ADJUSTMENT',
        referenceId: 'TEST-PO-999',
        notes: 'Verification test batch stock-in',
      }
    );
    console.log(`  POST /api/inventory/stock-in -> status ${stockInRes.statusCode}`);
    console.log(`    New quantity in ${testWh1.name}: ${stockInRes.body.data?.inventory?.quantity}`);
    console.log(`    Ledger movement recorded ID: ${stockInRes.body.data?.movement?.id}`);
    if (stockInRes.statusCode !== 201) {
      throw new Error(`Stock in failed: ${JSON.stringify(stockInRes.body)}`);
    }

    // 7. Test Negative Stock Prevention (Stock Out over-limit)
    console.log('\n[SAFETY] Testing Negative Stock Prevention (Over-deduction rejection)...');
    const overDeductRes = await request(
      {
        hostname: 'localhost',
        port: 5001,
        path: '/api/inventory/stock-out',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${staffToken}`,
        },
      },
      {
        productId: testProductId,
        warehouseId: testSourceWhId,
        quantity: 999999, // Impossible stock amount
        notes: 'Attempting negative stock violation',
      }
    );
    console.log(`  POST /api/inventory/stock-out (qty: 999999) -> status ${overDeductRes.statusCode} (Expected 400)`);
    console.log(`    Error message: "${overDeductRes.body.message}"`);
    if (overDeductRes.statusCode !== 400) {
      throw new Error(`Expected 400 rejection for over-deduction, got ${overDeductRes.statusCode}`);
    }

    // Valid Stock Out
    console.log('\n[TRANSACTION] Testing Valid Stock Out...');
    const validOutRes = await request(
      {
        hostname: 'localhost',
        port: 5001,
        path: '/api/inventory/stock-out',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${staffToken}`,
        },
      },
      {
        productId: testProductId,
        warehouseId: testSourceWhId,
        quantity: 5,
        referenceType: 'MANUAL_ADJUSTMENT',
        referenceId: 'SO-TEST-01',
        notes: 'Customer dispatch fulfillment',
      }
    );
    console.log(`  POST /api/inventory/stock-out (qty: 5) -> status ${validOutRes.statusCode}`);
    console.log(`    Remaining stock in source: ${validOutRes.body.data?.remainingStock}`);
    if (validOutRes.statusCode !== 200) {
      throw new Error(`Valid stock out failed: ${JSON.stringify(validOutRes.body)}`);
    }

    // 8. Test Warehouse-to-Warehouse Atomic Transfer
    console.log('\n[TRANSACTION] Testing Inter-Warehouse Transfer (Atomic Dual-Balance Update)...');
    const transferRes = await request(
      {
        hostname: 'localhost',
        port: 5001,
        path: '/api/inventory/transfer',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${managerToken}`,
        },
      },
      {
        productId: testProductId,
        sourceWarehouseId: testSourceWhId,
        destinationWarehouseId: testDestWhId,
        quantity: 10,
        notes: 'Inter-facility inventory balancing route',
      }
    );
    console.log(`  POST /api/inventory/transfer (qty: 10) -> status ${transferRes.statusCode}`);
    console.log(`    Source remaining: ${transferRes.body.data?.sourceWarehouse?.remainingStock}`);
    console.log(`    Destination new total: ${transferRes.body.data?.destinationWarehouse?.newTotalStock}`);
    console.log(`    Transfer ledger movement ID: ${transferRes.body.data?.movement?.id}`);
    if (transferRes.statusCode !== 200) {
      throw new Error(`Transfer failed: ${JSON.stringify(transferRes.body)}`);
    }

    // 9. Test Stock Adjustment (Physical Count Reconciliation)
    console.log('\n[TRANSACTION] Testing Physical Count Stock Adjustment...');
    const adjustRes = await request(
      {
        hostname: 'localhost',
        port: 5001,
        path: '/api/inventory/adjust',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${managerToken}`,
        },
      },
      {
        productId: testProductId,
        warehouseId: testDestWhId,
        newQuantity: 40,
        reason: 'Monthly cycle count audit reconciliation',
      }
    );
    console.log(`  POST /api/inventory/adjust -> status ${adjustRes.statusCode}`);
    console.log(`    Prev quantity: ${adjustRes.body.data?.previousQuantity}, New quantity: ${adjustRes.body.data?.newQuantity}, Delta: ${adjustRes.body.data?.delta}`);
    if (adjustRes.statusCode !== 200) {
      throw new Error(`Adjustment failed: ${JSON.stringify(adjustRes.body)}`);
    }

    // 10. Test Movement Ledger History Query
    console.log('\n[AUDIT LEDGER] Testing Stock Movement Audit Log...');
    const movementsRes = await request({
      hostname: 'localhost',
      port: 5001,
      path: `/api/inventory/movements?product_id=${testProductId}`,
      method: 'GET',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    console.log(`  GET /api/inventory/movements?product_id=${testProductId} -> status ${movementsRes.statusCode}, entries: ${movementsRes.body.data.length}`);
    if (movementsRes.statusCode !== 200 || movementsRes.body.data.length === 0) {
      throw new Error('Failed to retrieve movement audit ledger');
    }

    const latestMove = movementsRes.body.data[0];
    console.log(`    Latest movement: Type=${latestMove.movement_type}, Qty=${latestMove.quantity}, Ref=${latestMove.reference_type}, By=${latestMove.created_by_name}`);

    console.log('\n===============================================================');
    console.log(' ALL DAY 5 BACKEND & LEDGER TESTS PASSED SUCCESSFULLY! (100%)');
    console.log('===============================================================\n');
  } catch (error) {
    console.error('\n Test Failure:', error);
    process.exitCode = 1;
  } finally {
    if (server) {
      server.close();
    }
    await pool.end();
  }
}

runTests();
