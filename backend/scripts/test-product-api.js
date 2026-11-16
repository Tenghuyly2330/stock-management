const app = require('../src/app');
const { pool } = require('../src/config/db');

async function testProductApi() {
  console.log('====================================================');
  console.log(' Running Product & Category REST API Integration Suite');
  console.log('====================================================');

  const server = app.listen(0);
  const port = server.address().port;
  const baseUrl = `http://localhost:${port}/api`;

  try {
    // 1. Authenticate as Admin
    console.log('1. Authenticating as Admin...');
    const loginRes = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@stocksync.com', password: 'Admin@123456' }),
    }).then((r) => r.json());

    if (!loginRes.success) throw new Error('Login failed');
    const token = loginRes.data.token;
    const authHeaders = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    };

    // 2. GET Categories
    console.log('2. Testing GET /api/categories...');
    const catsRes = await fetch(`${baseUrl}/categories`, { headers: authHeaders }).then((r) => r.json());
    if (!catsRes.success || !Array.isArray(catsRes.data)) throw new Error('Failed to get categories');
    console.log(`   OK: Retrieved ${catsRes.data.length} categories.`);

    // 3. POST Category
    console.log('3. Testing POST /api/categories (Creating test category)...');
    const createCatRes = await fetch(`${baseUrl}/categories`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        name: `Test Instruments ${Date.now()}`,
        description: 'Electronic diagnostic calibration instruments',
      }),
    }).then((r) => r.json());

    if (!createCatRes.success) throw new Error(`Category creation failed: ${createCatRes.message}`);
    const createdCatId = createCatRes.data.id;
    console.log(`   OK: Created category ID ${createdCatId}: '${createCatRes.data.name}'`);

    // 4. POST Product with Auto-Generated SKU and Barcode
    console.log('4. Testing POST /api/products (Auto-generating SKU & Barcode)...');
    const createProdRes = await fetch(`${baseUrl}/products`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        name: 'Digital Vernier Caliper 150mm Stainless Steel',
        categoryId: createdCatId,
        purchasePrice: 24.50,
        sellingPrice: 49.99,
        minStockLevel: 10,
        description: 'High-precision 0.01mm measuring caliper with LCD display',
      }),
    }).then((r) => r.json());

    if (!createProdRes.success) throw new Error(`Product creation failed: ${createProdRes.message}`);
    const createdProduct = createProdRes.data;
    console.log(`   OK: Product created! ID: ${createdProduct.id}`);
    console.log(`   - Auto-generated SKU:     ${createdProduct.sku}`);
    console.log(`   - Auto-generated Barcode: ${createdProduct.barcode}`);

    // 5. GET /api/products with search
    console.log('5. Testing GET /api/products?search=Caliper...');
    const searchRes = await fetch(`${baseUrl}/products?search=Caliper`, { headers: authHeaders }).then((r) => r.json());
    if (!searchRes.success || searchRes.data.length === 0) throw new Error('Search failed to find created product');
    console.log(`   OK: Search found: '${searchRes.data[0].name}' (Margin: ${searchRes.data[0].margin_pct}%)`);

    // 6. GET /api/products/:id with warehouse inventory breakdown
    console.log(`6. Testing GET /api/products/${createdProduct.id} (Warehouse Breakdown)...`);
    const detailRes = await fetch(`${baseUrl}/products/${createdProduct.id}`, { headers: authHeaders }).then((r) => r.json());
    if (!detailRes.success || !Array.isArray(detailRes.data.warehouses)) throw new Error('Failed to fetch product details');
    console.log(`   OK: Product details retrieved with ${detailRes.data.warehouses.length} warehouse locations mapped.`);

    // 7. Cleanup test product & category
    console.log('7. Cleaning up test fixtures...');
    await fetch(`${baseUrl}/products/${createdProduct.id}`, { method: 'DELETE', headers: authHeaders });
    await fetch(`${baseUrl}/categories/${createdCatId}`, { method: 'DELETE', headers: authHeaders });
    console.log('   OK: Test records cleaned up.');

    console.log('====================================================');
    console.log(' Product & Category Integration Suite Passed 100%');
    console.log('====================================================');
    process.exit(0);
  } catch (err) {
    console.error(' Product API Test Failed:', err.message);
    process.exit(1);
  } finally {
    server.close();
    await pool.end();
  }
}

testProductApi();
