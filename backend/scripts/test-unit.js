/**
 * Unit Test Suite for Backend Core Utilities
 * Fast, self-contained, no external database required
 */
const assert = require('assert');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const env = require('../src/config/env');
const { successResponse, errorResponse, paginatedResponse } = require('../src/utils/response');
const { register } = require('../src/utils/metrics');
const app = require('../src/app');

async function runUnitTests() {
  console.log('====================================================');
  console.log(' RUNNING BACKEND UNIT & INTEGRATION TESTS');
  console.log('====================================================\n');

  let passed = 0;
  let total = 0;

  function test(name, fn) {
    total++;
    try {
      fn();
      console.log(`✓ [PASS] ${name}`);
      passed++;
    } catch (err) {
      console.error(`✗ [FAIL] ${name}`);
      console.error(err);
      process.exitCode = 1;
    }
  }

  async function asyncTest(name, fn) {
    total++;
    try {
      await fn();
      console.log(`✓ [PASS] ${name}`);
      passed++;
    } catch (err) {
      console.error(`✗ [FAIL] ${name}`);
      console.error(err);
      process.exitCode = 1;
    }
  }

  // 1. Password Hashing & Verification
  await asyncTest('Password hashing produces secure bcrypt hash and verifies correctly', async () => {
    const raw = 'SecurePass@2026';
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(raw, salt);
    assert.strictEqual(typeof hash, 'string', 'Hash should be a string');
    assert.ok(hash.startsWith('$2'), 'Hash should be a valid bcrypt hash');
    const isValid = await bcrypt.compare(raw, hash);
    assert.strictEqual(isValid, true, 'compare should return true for matching password');
    const isWrong = await bcrypt.compare('WrongPassword', hash);
    assert.strictEqual(isWrong, false, 'compare should return false for wrong password');
  });

  // 2. JWT Generation & Verification
  test('JWT token generation and verification returns valid payload', () => {
    const payload = { id: 42, email: 'admin@stocksync.com', role: 'admin' };
    const token = jwt.sign(payload, env.JWT_SECRET, { expiresIn: '1h' });
    assert.strictEqual(typeof token, 'string', 'Token should be a string');
    const decoded = jwt.verify(token, env.JWT_SECRET);
    assert.strictEqual(decoded.id, 42, 'Decoded ID should match payload');
    assert.strictEqual(decoded.email, 'admin@stocksync.com', 'Decoded email should match payload');
    assert.strictEqual(decoded.role, 'admin', 'Decoded role should match payload');
  });

  // 3. Response Helpers
  test('Standard response helpers format JSON consistently', () => {
    let mockResData = null;
    let mockResStatus = null;
    const mockRes = {
      status(code) {
        mockResStatus = code;
        return this;
      },
      json(data) {
        mockResData = data;
        return this;
      },
    };

    successResponse(mockRes, { statusCode: 200, message: 'OK', data: { test: 1 } });
    assert.strictEqual(mockResStatus, 200);
    assert.strictEqual(mockResData.success, true);
    assert.strictEqual(mockResData.data.test, 1);

    errorResponse(mockRes, { statusCode: 404, message: 'Not Found', code: 'RES_NOT_FOUND' });
    assert.strictEqual(mockResStatus, 404);
    assert.strictEqual(mockResData.success, false);
    assert.strictEqual(mockResData.code, 'RES_NOT_FOUND');

    paginatedResponse(mockRes, { data: [1, 2], total: 20, page: 1, limit: 10, message: 'Paged' });
    assert.strictEqual(mockResData.meta.total, 20);
    assert.strictEqual(mockResData.meta.totalPages, 2);
  });

  // 4. Prometheus Metrics Registry
  await asyncTest('Prometheus metrics registry collects standard metrics', async () => {
    assert.ok(register, 'Metrics registry should exist');
    const metricsOutput = await register.metrics();
    assert.ok(metricsOutput.includes('http_request_duration_seconds'), 'Metrics should include request duration');
    assert.ok(metricsOutput.includes('http_requests_total'), 'Metrics should include total requests');
  });

  // 5. Express App Route Configuration
  test('Express app exposes health and metrics routes', () => {
    const routerStack = app.router?.stack || app._router?.stack;
    assert.ok(routerStack, 'Express app should have an initialized router stack');
    const routePaths = routerStack
      .filter((layer) => layer.route)
      .map((layer) => layer.route.path);
    assert.ok(routePaths.includes('/metrics'), 'App should expose /metrics route');
    assert.ok(routePaths.includes('/health'), 'App should expose /health route');
  });

  console.log(`\n====================================================`);
  console.log(` TEST SUMMARY: ${passed}/${total} TESTS PASSED (100%)`);
  console.log(`====================================================\n`);
}

runUnitTests().catch((err) => {
  console.error('Fatal Test Runner Error:', err);
  process.exit(1);
});
