const http = require('http');
const app = require('../src/app');

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

async function runCartCheckoutTest() {
  console.log('====================================================');
  console.log(' TESTING CART POS CHECKOUT & CUSTOMER IDENTIFICATION');
  console.log('====================================================\n');

  server = app.listen(5091);
  const port = server.address().port;

  try {
    // 1. Login as Staff
    const loginRes = await request(
      {
        hostname: '127.0.0.1',
        port,
        path: '/api/auth/login',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      },
      { email: 'staff@stocksync.com', password: 'Staff@123456' }
    );
    const token = loginRes.body.data.token;
    console.log('1. Staff logged in successfully.');

    // 2. Fetch products to get active items
    const prodRes = await request({
      hostname: '127.0.0.1',
      port,
      path: '/api/products?limit=10',
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` },
    });
    const prods = prodRes.body.data || [];
    console.log(`2. Retrieved ${prods.length} products. Available:`);
    prods.forEach(p => console.log(`   - ID ${p.id}: ${p.name} (${p.sku}) Stock: ${p.current_stock} @ $${p.selling_price}`));

    if (prods.length < 2) {
      throw new Error('Need at least 2 products to test multi-item cart');
    }

    const item1 = prods[0];
    const item2 = prods[1];

    // 3. Checkout with Customer Name and Customer Phone
    const customerName = 'Dakota Miller Farm';
    const customerPhone = '098-765-4321';
    console.log(`\n3. Executing Cart Checkout for ${customerName} (${customerPhone})...`);

    const checkoutRes = await request(
      {
        hostname: '127.0.0.1',
        port,
        path: '/api/history/checkout',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      },
      {
        customerName,
        customerPhone,
        notes: 'Delivered to North Field Gate 2',
        items: [
          { productId: item1.id, quantity: 1, unitPrice: item1.selling_price },
          { productId: item2.id, quantity: 2, unitPrice: item2.selling_price },
        ],
      }
    );

    console.log('   Status:', checkoutRes.statusCode);
    console.log('   Message:', checkoutRes.body.message);
    console.log('   Total:', `$${checkoutRes.body.data?.totalAmount}`);
    console.log('   Party Identifier:', checkoutRes.body.data?.partyIdentifier);

    if (checkoutRes.statusCode !== 201) {
      throw new Error(`Checkout failed with status ${checkoutRes.statusCode}: ${JSON.stringify(checkoutRes.body)}`);
    }

    // 4. Search in History by Phone Number
    console.log(`\n4. Searching History for Phone "${customerPhone}"...`);
    const searchRes = await request({
      hostname: '127.0.0.1',
      port,
      path: `/api/history?search=${encodeURIComponent(customerPhone)}`,
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` },
    });

    console.log('   Search Status:', searchRes.statusCode);
    const foundRows = searchRes.body.data || [];
    console.log(`   Found ${foundRows.length} history records matching phone "${customerPhone}":`);
    foundRows.forEach(r => {
      console.log(`   - [${r.action}] ${r.quantity}x ${r.product_name} | Customer: ${r.customer_name} | Tel: ${r.customer_phone} | $${r.total_amount}`);
    });

    if (foundRows.length === 0) {
      throw new Error('Search by phone number did not return the newly placed order!');
    }

    console.log('\n====================================================');
    console.log(' ALL CART CHECKOUT & PHONE SEARCH TESTS PASSED 100%!');
    console.log('====================================================\n');
  } finally {
    server.close();
  }
}

runCartCheckoutTest().catch((err) => {
  console.error('Test Failed:', err);
  if (server) server.close();
  process.exit(1);
});
