jest.mock('../services/fitFileService', () => ({
  generateFitFile: jest.fn(),
  getFitFile: jest.fn(),
  cleanupOldFiles: jest.fn(),
}));

// Mock OpenAI service
jest.mock('../services/openaiService', () => ({
  generateTrainingPlan: jest.fn(),
}));

// Create test app
require('dotenv').config();
const request = require('supertest');
const express = require('express');
const authRoutes = require('../routes/auth');
const planRoutes = require('../routes/plans');
const fitRoutes = require('../routes/fit');
const User = require('../models/User');
const TrainingPlan = require('../models/TrainingPlan');
const { setupTestDB, teardownTestDB, clearTestDB } = require('./setup');
const fitFileService = require('../services/fitFileService');
const openaiService = require('../services/openaiService');

const mockFitFile = {
  fileName: 'workout_123_1234567890.fit',
  filePath: '/path/to/file.fit',
  url: '/api/fit/download/workout_123_1234567890.fit',
};

const mockPlan = {
  title: 'Test Plan',
  description: 'Test description',
  duration: 12,
  difficulty: 'beginner',
  goals: ['Test goal'],
  workouts: [
    {
      title: 'Test Workout',
      description: 'Test workout description',
      type: 'easy',
      duration: 30,
      distance: 5.0,
      intensity: 'low',
      instructions: ['Test instruction'],
      weekNumber: 1,
      dayOfWeek: 1,
    },
  ],
  aiGeneratedContent: 'Mock response',
};

const app = express();
app.use(express.json());
app.use('/api/auth', authRoutes);
app.use('/api/plans', planRoutes);
app.use('/api/fit', fitRoutes);

describe('FIT File Routes', () => {
  let authToken;
  let userId;
  let workoutId;

  beforeAll(async () => {
    await setupTestDB();
  });

  afterAll(async () => {
    await teardownTestDB();
  });

  beforeEach(async () => {
    await clearTestDB();
    fitFileService.generateFitFile.mockResolvedValue(mockFitFile);
    fitFileService.getFitFile.mockResolvedValue(Buffer.from('mock fit file data'));
    fitFileService.cleanupOldFiles.mockResolvedValue();
    openaiService.generateTrainingPlan.mockResolvedValue(mockPlan);

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

    workoutId = planResponse.body.plan.workouts[0]._id;
  });

  describe('GET /api/fit/:workoutId', () => {
    it('should generate and download FIT file', async () => {
      const response = await request(app)
        .get(`/api/fit/${workoutId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.headers['content-type']).toBe('application/octet-stream');
      expect(response.headers['content-disposition']).toContain('attachment');
      expect(response.body).toEqual(Buffer.from('mock fit file data'));
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .get(`/api/fit/${workoutId}`)
        .expect(401);

      expect(response.body).toHaveProperty('message', 'No token, authorization denied');
    });

    it('should return 404 for non-existent workout', async () => {
      const fakeId = '507f1f77bcf86cd799439011';
      
      const response = await request(app)
        .get(`/api/fit/${fakeId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body).toHaveProperty('message', 'Workout not found');
    });
  });

  describe('GET /api/fit/download/:fileName', () => {
    it('should download FIT file by filename', async () => {
      const fileName = 'workout_123_1234567890.fit';
      
      const response = await request(app)
        .get(`/api/fit/download/${fileName}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.headers['content-type']).toBe('application/octet-stream');
      expect(response.headers['content-disposition']).toContain(`attachment; filename="${fileName}"`);
    });

    it('should require authentication', async () => {
      const fileName = 'workout_123_1234567890.fit';
      
      const response = await request(app)
        .get(`/api/fit/download/${fileName}`)
        .expect(401);

      expect(response.body).toHaveProperty('message', 'No token, authorization denied');
    });

    it('should validate filename format', async () => {
      const invalidFileName = '../../../etc/passwd';
      
      const response = await request(app)
        .get(`/api/fit/download/${invalidFileName}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);

      expect(response.body).toHaveProperty('message', 'Invalid filename');
    });
  });

  describe('POST /api/fit/cleanup', () => {
    it('should cleanup old FIT files', async () => {
      const response = await request(app)
        .post('/api/fit/cleanup')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('message', 'FIT files cleanup completed');
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .post('/api/fit/cleanup')
        .expect(401);

      expect(response.body).toHaveProperty('message', 'No token, authorization denied');
    });
  });
});
