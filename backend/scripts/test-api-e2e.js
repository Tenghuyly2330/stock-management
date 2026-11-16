const app = require('../src/app');
const { pool } = require('../src/config/db');

async function testE2E() {
  console.log('====================================================');
  console.log(' Running End-to-End API Integration Verification');
  console.log('====================================================');

  const server = app.listen(0);
  const port = server.address().port;
  const baseUrl = `http://localhost:${port}/api`;

  try {
    // 1. Health check
    console.log('1. Testing GET /api/health...');
    const healthRes = await fetch(`${baseUrl}/health`).then((r) => r.json());
    if (!healthRes.success) throw new Error('Health check failed');
    console.log(`   OK: Server status: ${healthRes.data.status}`);

    // 2. Admin Login
    console.log('2. Testing POST /api/auth/login (Admin credentials)...');
    const loginRes = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@stocksync.com', password: 'Admin@123456' }),
    }).then((r) => r.json());

    if (!loginRes.success || !loginRes.data.token) {
      throw new Error(`Admin login failed: ${loginRes.message}`);
    }
    const adminToken = loginRes.data.token;
    console.log(`   OK: Admin authenticated, JWT issued (${adminToken.substring(0, 20)}...)`);

    // 3. GET /api/auth/me
    console.log('3. Testing GET /api/auth/me with Bearer token...');
    const meRes = await fetch(`${baseUrl}/auth/me`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    }).then((r) => r.json());

    if (!meRes.success || meRes.data.role !== 'admin') {
      throw new Error(`Profile check failed: ${JSON.stringify(meRes)}`);
    }
    console.log(`   OK: User profile verified: ${meRes.data.firstName} ${meRes.data.lastName} (Role: ${meRes.data.role})`);

    // 4. GET /api/users (Admin query)
    console.log('4. Testing GET /api/users (Admin privileges)...');
    const usersRes = await fetch(`${baseUrl}/users`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    }).then((r) => r.json());

    if (!usersRes.success || !Array.isArray(usersRes.data)) {
      throw new Error('Failed to retrieve user list');
    }
    console.log(`   OK: Retrieved ${usersRes.data.length} users (Total: ${usersRes.meta.total})`);

    // 5. Staff Login & RBAC Guard Test
    console.log('5. Testing Staff Login & RBAC Rejection...');
    const staffLoginRes = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'staff@stocksync.com', password: 'Staff@123456' }),
    }).then((r) => r.json());

    const staffToken = staffLoginRes.data.token;

    // Staff attempts to create user -> must get 403
    const forbiddenRes = await fetch(`${baseUrl}/users`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${staffToken}`,
      },
      body: JSON.stringify({
        firstName: 'Hacker',
        lastName: 'User',
        email: 'hacker@test.com',
        password: 'password123',
        roleId: 1,
      }),
    });

    if (forbiddenRes.status !== 403) {
      throw new Error(`RBAC failure: Staff user received HTTP ${forbiddenRes.status} instead of 403 Forbidden!`);
    }
    console.log('   OK: Staff POST /api/users correctly rejected with HTTP 403 Forbidden.');

    console.log('====================================================');
    console.log(' All End-to-End API Checks Passed 100%');
    console.log('====================================================');
    process.exit(0);
  } catch (err) {
    console.error(' E2E Test Failed:', err.message);
    process.exit(1);
  } finally {
    server.close();
    await pool.end();
  }
}

testE2E();

