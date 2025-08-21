require('dotenv').config();
const request = require('supertest');
const express = require('express');
const planRoutes = require('../routes/plans');
const User = require('../models/User');
const TrainingPlan = require('../models/TrainingPlan');
const { setupTestDB, teardownTestDB, clearTestDB } = require('./setup');

// Mock OpenAI service
jest.mock('../services/openaiService', () => ({
  generateTrainingPlan: jest.fn().mockResolvedValue({
    title: 'Beginner 5K Training Plan',
    description: 'A 12-week plan to prepare for your first 5K race',
    duration: 12,
    difficulty: 'beginner',
    goals: ['Complete a 5K race', 'Build aerobic base', 'Improve running form'],
    workouts: [
      {
        title: 'Easy Run',
        description: 'Comfortable pace run',
        type: 'easy',
        duration: 30,
        distance: 3.0,
        intensity: 'low',
        instructions: ['Warm up with walking', 'Run at conversational pace', 'Cool down'],
        weekNumber: 1,
        dayOfWeek: 1
      },
      {
        title: 'Tempo Run',
        description: 'Comfortably hard pace',
        type: 'tempo',
        duration: 25,
        distance: 2.5,
        intensity: 'moderate',
        instructions: ['Warm up thoroughly', 'Run at tempo pace', 'Cool down'],
        weekNumber: 1,
        dayOfWeek: 3
      }
    ],
    aiGeneratedContent: 'Mock AI response'
  })
}));

// Create test app
const app = express();
app.use(express.json());
app.use('/api/auth', authRoutes);
app.use('/api/plans', planRoutes);

describe('Training Plans Routes', () => {
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
    
    // Create and authenticate user
    const userData = {
      name: 'John Doe',
      email: 'john@example.com',
      password: 'password123'
    };

    const registerResponse = await request(app)
      .post('/api/auth/register')
      .send(userData);

    authToken = registerResponse.body.token;
    userId = registerResponse.body.user.id;
  });

  describe('POST /api/plans/generate', () => {
    it('should generate a training plan successfully', async () => {
      const runningData = {
        distance: 5.0,
        distanceUnit: 'km',
        time: { hours: 0, minutes: 30 },
        maxDistance: 10.0,
        maxDistanceUnit: 'km'
      };

      const response = await request(app)
        .post('/api/plans/generate')
        .set('Authorization', `Bearer ${authToken}`)
        .send(runningData)
        .expect(201);

      expect(response.body).toHaveProperty('message', 'Training plan generated successfully');
      expect(response.body).toHaveProperty('plan');
      expect(response.body.plan.title).toBe('Beginner 5K Training Plan');
      expect(response.body.plan.workouts).toHaveLength(2);
    });

    it('should require authentication', async () => {
      const runningData = {
        maxDistance: 10.0,
        maxDistanceUnit: 'km'
      };

      const response = await request(app)
        .post('/api/plans/generate')
        .send(runningData)
        .expect(401);

      expect(response.body).toHaveProperty('message', 'No token, authorization denied');
    });

    it('should validate required fields', async () => {
      const runningData = {
        distance: 5.0,
        distanceUnit: 'km'
        // Missing maxDistance
      };

      const response = await request(app)
        .post('/api/plans/generate')
        .set('Authorization', `Bearer ${authToken}`)
        .send(runningData)
        .expect(400);

      expect(response.body).toHaveProperty('message', 'Validation failed');
    });

    it('should validate distance units', async () => {
      const runningData = {
        distance: 5.0,
        distanceUnit: 'invalid',
        maxDistance: 10.0,
        maxDistanceUnit: 'km'
      };

      const response = await request(app)
        .post('/api/plans/generate')
        .set('Authorization', `Bearer ${authToken}`)
        .send(runningData)
        .expect(400);

      expect(response.body).toHaveProperty('message', 'Validation failed');
    });

    it('should replace existing plan when generating new one', async () => {
      const runningData = {
        maxDistance: 10.0,
        maxDistanceUnit: 'km'
      };

      // Generate first plan
      await request(app)
        .post('/api/plans/generate')
        .set('Authorization', `Bearer ${authToken}`)
        .send(runningData)
        .expect(201);

      // Generate second plan
      const response = await request(app)
        .post('/api/plans/generate')
        .set('Authorization', `Bearer ${authToken}`)
        .send(runningData)
        .expect(201);

      // Check only one plan exists
      const plans = await TrainingPlan.find({ userId });
      expect(plans).toHaveLength(1);
    });
  });

  describe('GET /api/plans/user', () => {
    beforeEach(async () => {
      // Create a training plan
      const runningData = {
        maxDistance: 10.0,
        maxDistanceUnit: 'km'
      };

      await request(app)
        .post('/api/plans/generate')
        .set('Authorization', `Bearer ${authToken}`)
        .send(runningData);
    });

    it('should get user training plan', async () => {
      const response = await request(app)
        .get('/api/plans/user')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('title', 'Beginner 5K Training Plan');
      expect(response.body).toHaveProperty('workouts');
      expect(response.body.workouts).toHaveLength(2);
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .get('/api/plans/user')
        .expect(401);

      expect(response.body).toHaveProperty('message', 'No token, authorization denied');
    });

    it('should return 404 when no plan exists', async () => {
      await clearTestDB();
      
      // Create new user without plan
      const userData = {
        name: 'Jane Doe',
        email: 'jane@example.com',
        password: 'password123'
      };

      const registerResponse = await request(app)
        .post('/api/auth/register')
        .send(userData);

      const newToken = registerResponse.body.token;

      const response = await request(app)
        .get('/api/plans/user')
        .set('Authorization', `Bearer ${newToken}`)
        .expect(404);

      expect(response.body).toHaveProperty('message', 'No training plan found');
    });
  });

  describe('PUT /api/plans/:planId/workout/:workoutId/complete', () => {
    let planId;
    let workoutId;

    beforeEach(async () => {
      // Create a training plan
      const runningData = {
        maxDistance: 10.0,
        maxDistanceUnit: 'km'
      };

      const planResponse = await request(app)
        .post('/api/plans/generate')
        .set('Authorization', `Bearer ${authToken}`)
        .send(runningData);

      planId = planResponse.body.plan.id;
      workoutId = planResponse.body.plan.workouts[0]._id;
    });

    it('should mark workout as completed', async () => {
      const response = await request(app)
        .put(`/api/plans/${planId}/workout/${workoutId}/complete`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('message', 'Workout marked as completed');
      expect(response.body.workout.completed).toBe(true);
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .put(`/api/plans/${planId}/workout/${workoutId}/complete`)
        .expect(401);

      expect(response.body).toHaveProperty('message', 'No token, authorization denied');
    });

    it('should return 404 for non-existent plan', async () => {
      const fakeId = '507f1f77bcf86cd799439011';
      
      const response = await request(app)
        .put(`/api/plans/${fakeId}/workout/${workoutId}/complete`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body).toHaveProperty('message', 'Training plan not found');
    });
  });

  describe('DELETE /api/plans/:planId', () => {
    let planId;

    beforeEach(async () => {
      // Create a training plan
      const runningData = {
        maxDistance: 10.0,
        maxDistanceUnit: 'km'
      };

      const planResponse = await request(app)
        .post('/api/plans/generate')
        .set('Authorization', `Bearer ${authToken}`)
        .send(runningData);

      planId = planResponse.body.plan.id;
    });

    it('should delete training plan', async () => {
      const response = await request(app)
        .delete(`/api/plans/${planId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('message', 'Training plan deleted successfully');

      // Verify plan is deleted
      const plan = await TrainingPlan.findById(planId);
      expect(plan).toBeNull();
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .delete(`/api/plans/${planId}`)
        .expect(401);

      expect(response.body).toHaveProperty('message', 'No token, authorization denied');
    });

    it('should return 404 for non-existent plan', async () => {
      const fakeId = '507f1f77bcf86cd799439011';
      
      const response = await request(app)
        .delete(`/api/plans/${fakeId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body).toHaveProperty('message', 'Training plan not found');
    });
  });
});
