const openaiService = require('../../services/openaiService');

// Mock OpenAI
jest.mock('openai', () => {
  return jest.fn().mockImplementation(() => ({
    chat: {
      completions: {
        create: jest.fn()
      }
    }
  }));
});

describe('OpenAI Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('generateTrainingPlan', () => {
    it('should generate training plan with valid input', async () => {
      const mockResponse = {
        choices: [{
          message: {
            content: JSON.stringify({
              title: 'Beginner 5K Training Plan',
              description: 'A comprehensive plan for beginners',
              duration: 12,
              difficulty: 'beginner',
              goals: ['Complete 5K', 'Build endurance'],
              workouts: [
                {
                  title: 'Easy Run',
                  description: 'Comfortable pace',
                  type: 'easy',
                  duration: 30,
                  distance: 3.0,
                  intensity: 'low',
                  instructions: ['Warm up', 'Run easy', 'Cool down'],
                  weekNumber: 1,
                  dayOfWeek: 1
                }
              ]
            })
          }
        }]
      };

      const OpenAI = require('openai');
      const mockCreate = OpenAI().chat.completions.create;
      mockCreate.mockResolvedValue(mockResponse);

      const runningData = {
        distance: 5.0,
        distanceUnit: 'km',
        time: { hours: 0, minutes: 30 },
        maxDistance: 10.0,
        maxDistanceUnit: 'km'
      };

      const result = await openaiService.generateTrainingPlan(runningData);

      expect(result).toHaveProperty('title', 'Beginner 5K Training Plan');
      expect(result).toHaveProperty('workouts');
      expect(result.workouts).toHaveLength(1);
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'gpt-4',
          messages: expect.arrayContaining([
            expect.objectContaining({
              role: 'system',
              content: expect.stringContaining('expert running coach')
            })
          ])
        })
      );
    });

    it('should handle OpenAI API errors', async () => {
      const OpenAI = require('openai');
      const mockCreate = OpenAI().chat.completions.create;
      mockCreate.mockRejectedValue(new Error('API Error'));

      const runningData = {
        maxDistance: 10.0,
        maxDistanceUnit: 'km'
      };

      await expect(openaiService.generateTrainingPlan(runningData))
        .rejects.toThrow('Failed to generate training plan');
    });

    it('should handle invalid JSON response', async () => {
      const mockResponse = {
        choices: [{
          message: {
            content: 'Invalid JSON response'
          }
        }]
      };

      const OpenAI = require('openai');
      const mockCreate = OpenAI().chat.completions.create;
      mockCreate.mockResolvedValue(mockResponse);

      const runningData = {
        maxDistance: 10.0,
        maxDistanceUnit: 'km'
      };

      await expect(openaiService.generateTrainingPlan(runningData))
        .rejects.toThrow('Invalid response format from AI service');
    });

    it('should handle quota exceeded error', async () => {
      const quotaError = new Error('Quota exceeded');
      quotaError.code = 'insufficient_quota';

      const OpenAI = require('openai');
      const mockCreate = OpenAI().chat.completions.create;
      mockCreate.mockRejectedValue(quotaError);

      const runningData = {
        maxDistance: 10.0,
        maxDistanceUnit: 'km'
      };

      await expect(openaiService.generateTrainingPlan(runningData))
        .rejects.toThrow('AI service quota exceeded');
    });
  });

  describe('generateWorkoutInstructions', () => {
    it('should generate workout instructions', async () => {
      const mockResponse = {
        choices: [{
          message: {
            content: JSON.stringify([
              'Warm up with 5 minutes of walking',
              'Run at steady pace',
              'Cool down with stretching'
            ])
          }
        }]
      };

      const OpenAI = require('openai');
      const mockCreate = OpenAI().chat.completions.create;
      mockCreate.mockResolvedValue(mockResponse);

      const result = await openaiService.generateWorkoutInstructions('easy', 30, 5.0);

      expect(result).toHaveLength(3);
      expect(result[0]).toContain('Warm up');
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'gpt-3.5-turbo'
        })
      );
    });

    it('should return default instructions on error', async () => {
      const OpenAI = require('openai');
      const mockCreate = OpenAI().chat.completions.create;
      mockCreate.mockRejectedValue(new Error('API Error'));

      const result = await openaiService.generateWorkoutInstructions('easy', 30, 5.0);

      expect(result).toHaveLength(4);
      expect(result[0]).toContain('warm-up');
    });
  });
});
