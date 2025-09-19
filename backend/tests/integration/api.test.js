jest.mock('../../services/openaiService', () => ({
  generateTrainingPlan: jest.fn(),
}));

describe('API Integration Tests', () => {
  require('dotenv').config();
  const request = require('supertest');
  const express = require('express');
  const authRoutes = require('../../routes/auth');
  const planRoutes = require('../../routes/plans');
  const workoutRoutes = require('../../routes/workouts');
  const fitRoutes = require('../../routes/fit');
  const { setupTestDB, teardownTestDB, clearTestDB } = require('../setup');
  const openaiService = require('../../services/openaiService');

  const integrationPlan = {
    title: 'Integration Test Plan',
    description: 'A plan for integration testing',
    duration: 12,
    difficulty: 'beginner',
    goals: ['Test goal 1', 'Test goal 2'],
    workouts: [
      {
        title: 'Integration Test Workout',
        description: 'Test workout',
        type: 'easy',
        duration: 30,
        distance: 5.0,
        intensity: 'low',
        instructions: ['Test instruction'],
        weekNumber: 1,
        dayOfWeek: 1,
      },
    ],
    aiGeneratedContent: 'Mock AI response',
  };

  const app = express();
  app.use(express.json());
  app.use('/api/auth', authRoutes);
  app.use('/api/plans', planRoutes);
  app.use('/api/workouts', workoutRoutes);
  app.use('/api/fit', fitRoutes);

  let authToken;
  let userId;

  beforeAll(async () => {
    await setupTestDB();
  });

  afterAll(async () => {
    await teardownTestDB();
  });

  beforeEach(async () => {
    await clearTestDB();
    openaiService.generateTrainingPlan.mockResolvedValue(integrationPlan);

    // Register and authenticate user
    const userData = {
      name: 'Integration Test User',
      email: 'integration@test.com',
      password: 'password123'
    };

    const registerResponse = await request(app)
      .post('/api/auth/register')
      .send(userData);

    authToken = registerResponse.body.token;
    userId = registerResponse.body.user.id;
  });

  describe('Complete User Journey', () => {
    it('should complete full user workflow', async () => {
      // 1. User registers (already done in beforeEach)
      expect(authToken).toBeDefined();

      // 2. User generates training plan
      const runningData = {
        distance: 5.0,
        distanceUnit: 'km',
        time: { hours: 0, minutes: 30 },
        maxDistance: 10.0,
        maxDistanceUnit: 'km'
      };

      const planResponse = await request(app)
        .post('/api/plans/generate')
        .set('Authorization', `Bearer ${authToken}`)
        .send(runningData)
        .expect(201);

      expect(planResponse.body.plan.title).toBe('Integration Test Plan');
      const planId = planResponse.body.plan.id;
      const workoutId = planResponse.body.plan.workouts[0]._id;

      // 3. User views their plan
      const getPlanResponse = await request(app)
        .get('/api/plans/user')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(getPlanResponse.body.title).toBe('Integration Test Plan');

      // 4. User views workouts
      const workoutsResponse = await request(app)
        .get('/api/workouts/user')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(workoutsResponse.body).toHaveLength(1);
      expect(workoutsResponse.body[0].title).toBe('Integration Test Workout');

      // 5. User completes a workout
      const completeResponse = await request(app)
        .put(`/api/workouts/${workoutId}/complete`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(completeResponse.body.workout.completed).toBe(true);

      // 6. User downloads FIT file
      const fitResponse = await request(app)
        .get(`/api/fit/${workoutId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(fitResponse.headers['content-type']).toBe('application/octet-stream');

      // 7. User views profile
      const profileResponse = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(profileResponse.body.user.email).toBe('integration@test.com');
    });

    it('should handle authentication flow', async () => {
      // Login with existing user
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'integration@test.com',
          password: 'password123'
        })
        .expect(200);

      expect(loginResponse.body.token).toBeDefined();
      expect(loginResponse.body.user.email).toBe('integration@test.com');

      // Use token to access protected route
      const protectedResponse = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${loginResponse.body.token}`)
        .expect(200);

      expect(protectedResponse.body.user.id).toBe(userId);
    });

    it('should handle workout rescheduling', async () => {
      // Generate plan first
      const runningData = {
        maxDistance: 10.0,
        maxDistanceUnit: 'km'
      };

      const planResponse = await request(app)
        .post('/api/plans/generate')
        .set('Authorization', `Bearer ${authToken}`)
        .send(runningData);

      const workoutId = planResponse.body.plan.workouts[0]._id;

      // Reschedule workout
      const newDate = new Date();
      newDate.setDate(newDate.getDate() + 7);

      const rescheduleResponse = await request(app)
        .put(`/api/workouts/${workoutId}/reschedule`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ scheduledDate: newDate.toISOString() })
        .expect(200);

      expect(rescheduleResponse.body.message).toBe('Workout rescheduled successfully');
    });

    it('should handle plan deletion', async () => {
      // Generate plan first
      const runningData = {
        maxDistance: 10.0,
        maxDistanceUnit: 'km'
      };

      const planResponse = await request(app)
        .post('/api/plans/generate')
        .set('Authorization', `Bearer ${authToken}`)
        .send(runningData);

      const planId = planResponse.body.plan.id;

      // Delete plan
      await request(app)
        .delete(`/api/plans/${planId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // Verify plan is deleted
      await request(app)
        .get('/api/plans/user')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid authentication', async () => {
      await request(app)
        .get('/api/plans/user')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);
    });

    it('should handle validation errors', async () => {
      const invalidData = {
        distance: -5, // Invalid negative distance
        distanceUnit: 'invalid',
        maxDistance: 'not-a-number'
      };

      await request(app)
        .post('/api/plans/generate')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidData)
        .expect(400);
    });

    it('should handle non-existent resources', async () => {
      const fakeId = '507f1f77bcf86cd799439011';

      await request(app)
        .get(`/api/workouts/${fakeId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });
  });
});
