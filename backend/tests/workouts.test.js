jest.mock('../services/openaiService', () => ({
  generateTrainingPlan: jest.fn(),
}));

// Create test app
require('dotenv').config();
const request = require('supertest');
const express = require('express');
const authRoutes = require('../routes/auth');
const planRoutes = require('../routes/plans');
const workoutRoutes = require('../routes/workouts');
const User = require('../models/User');
const TrainingPlan = require('../models/TrainingPlan');
const { setupTestDB, teardownTestDB, clearTestDB } = require('./setup');
const openaiService = require('../services/openaiService');

const mockWorkoutPlan = {
  title: 'Test Training Plan',
  description: 'A test plan',
  duration: 12,
  difficulty: 'beginner',
  goals: ['Test goal'],
  workouts: [
    {
      title: 'Morning Run',
      description: 'Easy pace run',
      type: 'easy',
      duration: 30,
      distance: 5.0,
      intensity: 'low',
      instructions: ['Warm up', 'Run easy', 'Cool down'],
      weekNumber: 1,
      dayOfWeek: 1,
    },
    {
      title: 'Interval Training',
      description: 'Speed work',
      type: 'interval',
      duration: 45,
      distance: 6.0,
      intensity: 'high',
      instructions: ['Warm up well', 'Run intervals', 'Cool down'],
      weekNumber: 1,
      dayOfWeek: 3,
    },
  ],
  aiGeneratedContent: 'Mock response',
};

const app = express();
app.use(express.json());
app.use('/api/auth', authRoutes);
app.use('/api/plans', planRoutes);
app.use('/api/workouts', workoutRoutes);

describe('Workouts Routes', () => {
  let authToken;
  let userId;
  let planId;
  let workoutId;

  beforeAll(async () => {
    await setupTestDB();
  });

  afterAll(async () => {
    await teardownTestDB();
  });

  beforeEach(async () => {
    await clearTestDB();
    openaiService.generateTrainingPlan.mockResolvedValue(mockWorkoutPlan);

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

    // Create a training plan with workouts
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

  describe('GET /api/workouts/user', () => {
    it('should get user workouts', async () => {
      const response = await request(app)
        .get('/api/workouts/user')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveLength(2);
      expect(response.body[0]).toHaveProperty('title', 'Morning Run');
      expect(response.body[0]).toHaveProperty('type', 'easy');
      expect(response.body[1]).toHaveProperty('title', 'Interval Training');
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .get('/api/workouts/user')
        .expect(401);

      expect(response.body).toHaveProperty('message', 'No token, authorization denied');
    });

    it('should return empty array when no plan exists', async () => {
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
        .get('/api/workouts/user')
        .set('Authorization', `Bearer ${newToken}`)
        .expect(200);

      expect(response.body).toEqual([]);
    });
  });

  describe('GET /api/workouts/upcoming', () => {
    it('should get upcoming workouts', async () => {
      const response = await request(app)
        .get('/api/workouts/upcoming')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      // Should include workouts scheduled within next 7 days
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .get('/api/workouts/upcoming')
        .expect(401);

      expect(response.body).toHaveProperty('message', 'No token, authorization denied');
    });
  });

  describe('GET /api/workouts/:workoutId', () => {
    it('should get specific workout', async () => {
      const response = await request(app)
        .get(`/api/workouts/${workoutId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('title', 'Morning Run');
      expect(response.body).toHaveProperty('type', 'easy');
      expect(response.body).toHaveProperty('duration', 30);
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .get(`/api/workouts/${workoutId}`)
        .expect(401);

      expect(response.body).toHaveProperty('message', 'No token, authorization denied');
    });

    it('should return 404 for non-existent workout', async () => {
      const fakeId = '507f1f77bcf86cd799439011';
      
      const response = await request(app)
        .get(`/api/workouts/${fakeId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body).toHaveProperty('message', 'Workout not found');
    });
  });

  describe('PUT /api/workouts/:workoutId/complete', () => {
    it('should mark workout as completed', async () => {
      const response = await request(app)
        .put(`/api/workouts/${workoutId}/complete`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('message', 'Workout marked as completed');
      expect(response.body.workout.completed).toBe(true);
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .put(`/api/workouts/${workoutId}/complete`)
        .expect(401);

      expect(response.body).toHaveProperty('message', 'No token, authorization denied');
    });
  });

  describe('PUT /api/workouts/:workoutId/reschedule', () => {
    it('should reschedule workout', async () => {
      const newDate = new Date();
      newDate.setDate(newDate.getDate() + 7);

      const response = await request(app)
        .put(`/api/workouts/${workoutId}/reschedule`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ scheduledDate: newDate.toISOString() })
        .expect(200);

      expect(response.body).toHaveProperty('message', 'Workout rescheduled successfully');
    });

    it('should require scheduledDate', async () => {
      const response = await request(app)
        .put(`/api/workouts/${workoutId}/reschedule`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({})
        .expect(400);

      expect(response.body).toHaveProperty('message', 'Scheduled date is required');
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .put(`/api/workouts/${workoutId}/reschedule`)
        .send({ scheduledDate: new Date().toISOString() })
        .expect(401);

      expect(response.body).toHaveProperty('message', 'No token, authorization denied');
    });
  });
});
