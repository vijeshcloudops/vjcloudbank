// tests/unit/userController.test.js
//
// Unit tests for user-service controllers.
// We use Jest as the test runner + supertest to call the Express app.
// The pg pool and bcrypt/jwt libraries are mocked so tests never hit
// a real database and run deterministically.

const request = require('supertest');

// ── Mock external dependencies BEFORE requiring the app ──
jest.mock('../../src/config/db', () => ({
  pool: {
    query: jest.fn(),
  },
  initializeDatabase: jest.fn().mockResolvedValue(true),
}));

jest.mock('bcryptjs', () => ({
  hash: jest.fn().mockResolvedValue('hashed_password_stub'),
  compare: jest.fn(),
}));

jest.mock('jsonwebtoken', () => ({
  sign: jest.fn().mockReturnValue('fake.jwt.token'),
  verify: jest.fn(),
}));

// Prevent app.js from calling app.listen() during tests
const originalListen = require('express').application.listen;
require('express').application.listen = jest.fn();

const { pool } = require('../../src/config/db');
const bcrypt = require('bcryptjs');

// Require the app AFTER mocks
const app = require('../../src/app');

// ── Restore listen after test suite ──
afterAll(() => {
  require('express').application.listen = originalListen;
});

// Reset mocks between tests to isolate state
beforeEach(() => {
  jest.clearAllMocks();
  process.env.JWT_SECRET = 'test-secret';
});

// ═══════════════════════════════════════════════════════════════
// HEALTH CHECK TESTS
// ═══════════════════════════════════════════════════════════════
describe('GET /api/users/health', () => {
  test('returns 200 when database is reachable', async () => {
    pool.query.mockResolvedValueOnce({ rows: [{ '?column?': 1 }] });

    const res = await request(app).get('/api/users/health');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.service).toBe('user-service');
    expect(res.body.status).toBe('healthy');
    expect(pool.query).toHaveBeenCalledWith('SELECT 1');
  });

  test('returns 503 when database is unreachable', async () => {
    pool.query.mockRejectedValueOnce(new Error('Connection refused'));

    const res = await request(app).get('/api/users/health');

    expect(res.status).toBe(503);
    expect(res.body.success).toBe(false);
    expect(res.body.status).toBe('unhealthy');
  });
});

// ═══════════════════════════════════════════════════════════════
// REGISTER TESTS
// ═══════════════════════════════════════════════════════════════
describe('POST /api/users/register', () => {
  const validPayload = {
    full_name: 'Test User',
    email: 'test@example.com',
    password: 'StrongPass1',
  };

  test('creates new user and returns 201', async () => {
    // First query: check for existing user — none found
    pool.query.mockResolvedValueOnce({ rows: [] });
    // Second query: INSERT — returns new user
    pool.query.mockResolvedValueOnce({
      rows: [{
        id: 'user-uuid-1',
        full_name: 'Test User',
        email: 'test@example.com',
        role: 'customer',
        created_at: new Date().toISOString(),
      }],
    });

    const res = await request(app)
      .post('/api/users/register')
      .send(validPayload);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.email).toBe('test@example.com');
    expect(res.body.data.password_hash).toBeUndefined();  // must not expose hash
    expect(bcrypt.hash).toHaveBeenCalledWith('StrongPass1', 10);
  });

  test('returns 409 when email already exists', async () => {
    pool.query.mockResolvedValueOnce({ rows: [{ id: 'existing-user' }] });

    const res = await request(app)
      .post('/api/users/register')
      .send(validPayload);

    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/already exists/i);
    expect(bcrypt.hash).not.toHaveBeenCalled();  // should exit before hashing
  });

  test('returns 400 for weak password (no uppercase)', async () => {
    const res = await request(app)
      .post('/api/users/register')
      .send({ ...validPayload, password: 'weakpass1' });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.errors).toBeDefined();
    expect(res.body.errors.some(e => /uppercase/i.test(e.msg))).toBe(true);
  });

  test('returns 400 for invalid email', async () => {
    const res = await request(app)
      .post('/api/users/register')
      .send({ ...validPayload, email: 'not-an-email' });

    expect(res.status).toBe(400);
    expect(res.body.errors.some(e => /valid email/i.test(e.msg))).toBe(true);
  });

  test('returns 500 when database fails during insert', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] });
    pool.query.mockRejectedValueOnce(new Error('DB down'));

    const res = await request(app)
      .post('/api/users/register')
      .send(validPayload);

    expect(res.status).toBe(500);
    expect(res.body.success).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════
// LOGIN TESTS
// ═══════════════════════════════════════════════════════════════
describe('POST /api/users/login', () => {
  const validPayload = {
    email: 'test@example.com',
    password: 'StrongPass1',
  };

  const dbUser = {
    id: 'user-uuid-1',
    full_name: 'Test User',
    email: 'test@example.com',
    password_hash: 'stored_hash',
    role: 'customer',
    is_active: true,
  };

  test('returns 200 with JWT on valid credentials', async () => {
    pool.query.mockResolvedValueOnce({ rows: [dbUser] });
    bcrypt.compare.mockResolvedValueOnce(true);
    pool.query.mockResolvedValueOnce({ rows: [] });  // UPDATE last-login

    const res = await request(app)
      .post('/api/users/login')
      .send(validPayload);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.token).toBe('fake.jwt.token');
    expect(res.body.data.user.email).toBe('test@example.com');
    expect(res.body.data.user.password_hash).toBeUndefined();
  });

  test('returns 401 when email is not found', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] });

    const res = await request(app)
      .post('/api/users/login')
      .send(validPayload);

    expect(res.status).toBe(401);
    expect(res.body.message).toMatch(/invalid email or password/i);
    // Generic message — should not reveal that email doesn't exist
    expect(bcrypt.compare).not.toHaveBeenCalled();
  });

  test('returns 401 when password is wrong', async () => {
    pool.query.mockResolvedValueOnce({ rows: [dbUser] });
    bcrypt.compare.mockResolvedValueOnce(false);

    const res = await request(app)
      .post('/api/users/login')
      .send(validPayload);

    expect(res.status).toBe(401);
    expect(res.body.message).toMatch(/invalid email or password/i);
  });

  test('returns 400 when email is missing', async () => {
    const res = await request(app)
      .post('/api/users/login')
      .send({ password: 'StrongPass1' });

    expect(res.status).toBe(400);
    expect(res.body.errors).toBeDefined();
  });
});

// ═══════════════════════════════════════════════════════════════
// 404 HANDLER
// ═══════════════════════════════════════════════════════════════
describe('404 handler', () => {
  test('unknown route returns 404 with clean JSON', async () => {
    const res = await request(app).get('/api/users/does-not-exist');

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/not found/i);
  });
});
