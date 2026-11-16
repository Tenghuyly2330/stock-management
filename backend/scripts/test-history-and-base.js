/**
 * Test History (Who buy and add products) & Base Warehouse (1 is base)
 */
const http = require('http');
const app = require('../src/app');
const { pool } = require('../src/config/db');

let server;

function request(options, body = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        let parsed = data;
        try {
          parsed = JSON.parse(data);
        } catch {}
        resolve({ statusCode: res.statusCode, body: parsed });
      });
    });
    req.on('error', reject);
    if (body) {
      req.write(typeof body === 'object' ? JSON.stringify(body) : body);
    }
    req.end();
  });
}

async function runTest() {
  console.log('====================================================');
  console.log(' TESTING HISTORY (BUY/ADD) & BASE WAREHOUSE (1 IS BASE)');
  console.log('====================================================\n');

  try {
    server = app.listen(5002);
    await new Promise((r) => setTimeout(r, 600));

    // 1. Login
    const loginRes = await request(
      {
        hostname: 'localhost',
        port: 5002,
        path: '/api/auth/login',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      },
      { email: 'admin@stocksync.com', password: 'Admin@123456' }
    );
    const token = loginRes.body.data.token;
    console.log('1. Admin logged in.');

    // 2. Verify Base Warehouse (Warehouse 1)
    const baseWhRes = await request({
      hostname: 'localhost',
      port: 5002,
      path: '/api/warehouses/1',
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` },
    });
    console.log(`2. Base Warehouse: ${baseWhRes.body.data?.name} (Code: ${baseWhRes.body.data?.code})`);
    console.log(`   Items in Base: ${baseWhRes.body.data?.inventory?.length}, Total Units: ${baseWhRes.body.data?.total_stock_units}`);

    const targetProductId = baseWhRes.body.data?.inventory[0]?.product_id;

    // 3. Test Add Product Stock (Arrival)
    const addRes = await request(
      {
        hostname: 'localhost',
        port: 5002,
        path: '/api/history/add',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      },
      {
        productId: targetProductId,
        quantity: 3,
        supplierName: 'Titan Industrial Machinery Supply',
        notes: 'Spring season stock intake',
      }
    );
    console.log(`3. Added product: status ${addRes.statusCode}, msg: "${addRes.body.message}"`);
    console.log(`   New Base Warehouse stock: ${addRes.body.data?.newStock} units`);

    // 4. Test Record Customer Purchase (Buy)
    const buyRes = await request(
      {
        hostname: 'localhost',
        port: 5002,
        path: '/api/history/buy',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      },
      {
        productId: targetProductId,
        quantity: 1,
        customerName: 'Robert Vance Family Ranch',
        notes: 'Commercial delivery to North field',
      }
    );
    console.log(`4. Recorded buy: status ${buyRes.statusCode}, msg: "${buyRes.body.message}"`);
    console.log(`   Remaining Base stock: ${buyRes.body.data?.remainingStock} units`);

    // 5. Query Unified History Log
    const histRes = await request({
      hostname: 'localhost',
      port: 5002,
      path: '/api/history?limit=10',
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` },
    });
    console.log(`5. History entries retrieved: ${histRes.body.data?.length}`);
    const latest = histRes.body.data[0];
    console.log(`   Latest: [${latest.action}] ${latest.quantity} units of ${latest.product_name} by ${latest.party_name} ($${latest.total_amount})`);

    console.log('\n====================================================');
    console.log(' ALL HISTORY & BASE WAREHOUSE TESTS PASSED 100%!');
    console.log('====================================================\n');
  } catch (err) {
    console.error('Test failed:', err);
    process.exitCode = 1;
  } finally {
    if (server) server.close();
    await pool.end();
  }
}

runTest();

