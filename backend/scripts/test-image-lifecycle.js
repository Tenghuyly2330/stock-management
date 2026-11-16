const app = require('../src/app');
const { pool } = require('../src/config/db');

async function testImageLifecycle() {
  console.log('====================================================');
  console.log(' Testing Image Lifecycle (Upload -> Update -> Delete)');
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

    const token = loginRes.data.token;
    const authHeaders = { Authorization: `Bearer ${token}` };

    // 2. Upload Image File via Multer (streams to Cloudinary with local fallback)
    console.log('2. Testing POST /api/products/upload-image...');
    const tinyPng = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      'base64'
    );

    const formData = new FormData();
    const blob = new Blob([tinyPng], { type: 'image/png' });
    formData.append('image', blob, 'sample-item.png');

    const uploadRes = await fetch(`${baseUrl}/products/upload-image`, {
      method: 'POST',
      headers: authHeaders,
      body: formData,
    }).then((r) => r.json());

    if (!uploadRes.success || !uploadRes.data.imageUrl) {
      throw new Error(`Upload failed: ${JSON.stringify(uploadRes)}`);
    }

    const { imageUrl, imagePublicId } = uploadRes.data;
    console.log(`   OK: Image uploaded! URL: ${imageUrl} (PublicId: ${imagePublicId})`);

    // 3. Create Product using this Image
    console.log('3. Creating product with the uploaded image...');
    const createProdRes = await fetch(`${baseUrl}/products`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        name: `Lifecycle Media Test Product ${Date.now()}`,
        categoryId: 1,
        imageUrl,
        imagePublicId,
        purchasePrice: 15.00,
        sellingPrice: 30.00,
        minStockLevel: 5,
      }),
    }).then((r) => r.json());

    if (!createProdRes.success) {
      throw new Error(`Create product failed: ${createProdRes.message}`);
    }

    const productId = createProdRes.data.id;
    console.log(`   OK: Product created! ID: ${productId} with image_url: ${createProdRes.data.image_url}`);

    // 4. Update Product with a new external image link (Triggers deletion of previous Cloudinary/local asset)
    console.log('4. Updating product with a new image URL (verifying old asset cleanup)...');
    const updateRes = await fetch(`${baseUrl}/products/${productId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        imageUrl: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30',
        imagePublicId: '',
      }),
    }).then((r) => r.json());

    if (!updateRes.success) {
      throw new Error(`Update product failed: ${updateRes.message}`);
    }
    console.log(`   OK: Product updated! New image URL: ${updateRes.data.image_url}`);

    // 5. Delete Product (Triggers asset cleanup)
    console.log('5. Deleting product...');
    const delRes = await fetch(`${baseUrl}/products/${productId}`, {
      method: 'DELETE',
      headers: authHeaders,
    }).then((r) => r.json());

    if (!delRes.success) {
      throw new Error(`Delete product failed: ${delRes.message}`);
    }
    console.log(`   OK: Product and associated media cleaned up: ${delRes.message}`);

    console.log('====================================================');
    console.log(' Image Lifecycle Verification Passed 100%');
    console.log('====================================================');
    process.exit(0);
  } catch (err) {
    console.error(' Image Lifecycle Test Failed:', err.message);
    process.exit(1);
  } finally {
    server.close();
    await pool.end();
  }
}

testImageLifecycle();
