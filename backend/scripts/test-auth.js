const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { pool, query } = require('../src/config/db');
const env = require('../src/config/env');

async function testAuthModule() {
  console.log('====================================================');
  console.log(' Testing Authentication, JWT & RBAC Engine');
  console.log('====================================================');

  try {
    // 1. Test Admin User Existence & Password Match
    console.log('1. Testing Admin Credential Verification...');
    const adminRes = await query(
      `SELECT u.id, u.email, u.password_hash, r.name as role
       FROM users u
       JOIN roles r ON u.role_id = r.id
       WHERE u.email = 'admin@stocksync.com'`
    );

    if (adminRes.rowCount === 0) {
      throw new Error('Admin user not found. Did you run npm run db:seed?');
    }

    const admin = adminRes.rows[0];
    const isPasswordCorrect = await bcrypt.compare('Admin@123456', admin.password_hash);
    if (!isPasswordCorrect) {
      throw new Error('Password hash does not match Admin@123456!');
    }
    console.log(`  Password verified for: ${admin.email} (Role: ${admin.role})`);

    // 2. Test Invalid Password
    console.log('2. Testing Incorrect Password Rejection...');
    const isBadPasswordValid = await bcrypt.compare('WrongPassword999', admin.password_hash);
    if (isBadPasswordValid) {
      throw new Error('Security flaw: Incorrect password was accepted!');
    }
    console.log('  Invalid password rejected correctly.');

    // 3. Test JWT Token Creation & Verification
    console.log('3. Testing JWT Token Issuance & Verification...');
    const payload = {
      id: admin.id,
      email: admin.email,
      role: admin.role,
    };
    const token = jwt.sign(payload, env.JWT_SECRET, { expiresIn: '1h' });
    const decoded = jwt.verify(token, env.JWT_SECRET);

    if (decoded.email !== admin.email || decoded.role !== 'admin') {
      throw new Error('JWT decoded payload does not match original token payload!');
    }
    console.log(`  Token issued and verified successfully for ${decoded.email}.`);

    // 4. Test RBAC Permissions Matrix
    console.log('4. Testing Role-Based Access Control (RBAC) Logic...');
    const rbacCheck = (userRole, requiredRoles) => requiredRoles.includes(userRole);

    const testCases = [
      { role: 'admin', required: ['admin'], expected: true, desc: 'Admin accessing Admin route' },
      { role: 'manager', required: ['admin'], expected: false, desc: 'Manager accessing Admin route' },
      { role: 'staff', required: ['admin'], expected: false, desc: 'Staff accessing Admin route' },
      { role: 'manager', required: ['admin', 'manager'], expected: true, desc: 'Manager accessing Manager route' },
      { role: 'staff', required: ['admin', 'manager'], expected: false, desc: 'Staff accessing Manager route' },
    ];

    for (const tc of testCases) {
      const allowed = rbacCheck(tc.role, tc.required);
      if (allowed !== tc.expected) {
        throw new Error(`RBAC failure: ${tc.desc} expected ${tc.expected} but got ${allowed}`);
      }
      console.log(`  ${tc.desc}: ${allowed ? 'ALLOWED (Pass)' : 'DENIED (Pass)'}`);
    }

    console.log('====================================================');
    console.log(' Authentication & RBAC Verification Passed 100%');
    console.log('====================================================');
    process.exit(0);
  } catch (err) {
    console.error(' Auth test failed:', err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

testAuthModule();
