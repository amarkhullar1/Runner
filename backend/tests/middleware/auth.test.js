require('dotenv').config();
const request = require('supertest');
const express = require('express');
const jwt = require('jsonwebtoken');
const auth = require('../../middleware/auth');
const User = require('../../models/User');
const { setupTestDB, teardownTestDB, clearTestDB } = require('../setup');

// Create test app
const app = express();
app.use(express.json());

// Test route that uses auth middleware
app.get('/protected', auth, (req, res) => {
  res.json({ message: 'Protected route accessed', userId: req.user._id });
});

describe('Auth Middleware', () => {
  let user;
  let validToken;

  beforeAll(async () => {
    await setupTestDB();
  });

  afterAll(async () => {
    await teardownTestDB();
  });

  beforeEach(async () => {
    await clearTestDB();
    
    // Create test user
    user = new User({
      name: 'John Doe',
      email: 'john@example.com',
      password: 'password123'
    });
    await user.save();

    // Generate valid token
    validToken = jwt.sign({ id: user._id }, process.env.JWT_SECRET || 'test-secret');
  });

  it('should allow access with valid token', async () => {
    const response = await request(app)
      .get('/protected')
      .set('Authorization', `Bearer ${validToken}`)
      .expect(200);

    expect(response.body.message).toBe('Protected route accessed');
    expect(response.body.userId).toBe(user._id.toString());
  });

  it('should deny access without token', async () => {
    const response = await request(app)
      .get('/protected')
      .expect(401);

    expect(response.body.message).toBe('No token, authorization denied');
  });

  it('should deny access with invalid token', async () => {
    const response = await request(app)
      .get('/protected')
      .set('Authorization', 'Bearer invalid-token')
      .expect(401);

    expect(response.body.message).toBe('Token is not valid');
  });

  it('should deny access with malformed authorization header', async () => {
    const response = await request(app)
      .get('/protected')
      .set('Authorization', 'InvalidFormat token')
      .expect(401);

    expect(response.body.message).toBe('No token, authorization denied');
  });

  it('should deny access for inactive user', async () => {
    // Deactivate user
    user.isActive = false;
    await user.save();

    const response = await request(app)
      .get('/protected')
      .set('Authorization', `Bearer ${validToken}`)
      .expect(401);

    expect(response.body.message).toBe('Token is not valid');
  });

  it('should deny access for non-existent user', async () => {
    // Delete user but keep token
    await User.findByIdAndDelete(user._id);

    const response = await request(app)
      .get('/protected')
      .set('Authorization', `Bearer ${validToken}`)
      .expect(401);

    expect(response.body.message).toBe('Token is not valid');
  });
});
