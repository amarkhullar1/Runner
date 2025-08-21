const TrainingPlan = require('../../models/TrainingPlan');
const User = require('../../models/User');
const { setupTestDB, teardownTestDB, clearTestDB } = require('../setup');

describe('TrainingPlan Model', () => {
  let userId;

  beforeAll(async () => {
    await setupTestDB();
  });

  afterAll(async () => {
    await teardownTestDB();
  });

  beforeEach(async () => {
    await clearTestDB();
    
    // Create a test user
    const user = new User({
      name: 'John Doe',
      email: 'john@example.com',
      password: 'password123'
    });
    const savedUser = await user.save();
    userId = savedUser._id;
  });

  describe('TrainingPlan Creation', () => {
    it('should create training plan with valid data', async () => {
      const planData = {
        userId,
        title: 'Beginner 5K Plan',
        description: 'A plan for beginners',
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
            scheduledDate: new Date(),
            completed: false,
            instructions: ['Warm up', 'Run easy', 'Cool down']
          }
        ],
        inputData: {
          distance: 5.0,
          distanceUnit: 'km',
          maxDistance: 10.0,
          maxDistanceUnit: 'km'
        }
      };

      const plan = new TrainingPlan(planData);
      const savedPlan = await plan.save();

      expect(savedPlan._id).toBeDefined();
      expect(savedPlan.title).toBe(planData.title);
      expect(savedPlan.workouts).toHaveLength(1);
      expect(savedPlan.workouts[0].title).toBe('Easy Run');
    });

    it('should require userId', async () => {
      const planData = {
        title: 'Test Plan',
        description: 'Test description',
        duration: 12,
        difficulty: 'beginner'
      };

      const plan = new TrainingPlan(planData);
      await expect(plan.save()).rejects.toThrow();
    });

    it('should require title', async () => {
      const planData = {
        userId,
        description: 'Test description',
        duration: 12,
        difficulty: 'beginner'
      };

      const plan = new TrainingPlan(planData);
      await expect(plan.save()).rejects.toThrow();
    });

    it('should validate difficulty enum', async () => {
      const planData = {
        userId,
        title: 'Test Plan',
        description: 'Test description',
        duration: 12,
        difficulty: 'invalid'
      };

      const plan = new TrainingPlan(planData);
      await expect(plan.save()).rejects.toThrow();
    });
  });

  describe('Workout Subdocuments', () => {
    it('should validate workout type enum', async () => {
      const planData = {
        userId,
        title: 'Test Plan',
        description: 'Test description',
        duration: 12,
        difficulty: 'beginner',
        workouts: [
          {
            title: 'Test Workout',
            description: 'Test description',
            type: 'invalid_type',
            duration: 30,
            intensity: 'low'
          }
        ]
      };

      const plan = new TrainingPlan(planData);
      await expect(plan.save()).rejects.toThrow();
    });

    it('should validate workout intensity enum', async () => {
      const planData = {
        userId,
        title: 'Test Plan',
        description: 'Test description',
        duration: 12,
        difficulty: 'beginner',
        workouts: [
          {
            title: 'Test Workout',
            description: 'Test description',
            type: 'easy',
            duration: 30,
            intensity: 'invalid_intensity'
          }
        ]
      };

      const plan = new TrainingPlan(planData);
      await expect(plan.save()).rejects.toThrow();
    });

    it('should allow valid workout types', async () => {
      const validTypes = ['easy', 'tempo', 'interval', 'long_run', 'recovery', 'race', 'cross_training'];
      
      for (const type of validTypes) {
        const planData = {
          userId,
          title: `Test Plan ${type}`,
          description: 'Test description',
          duration: 12,
          difficulty: 'beginner',
          workouts: [
            {
              title: 'Test Workout',
              description: 'Test description',
              type: type,
              duration: 30,
              intensity: 'low'
            }
          ]
        };

        const plan = new TrainingPlan(planData);
        const savedPlan = await plan.save();
        expect(savedPlan.workouts[0].type).toBe(type);
        
        await TrainingPlan.findByIdAndDelete(savedPlan._id);
      }
    });

    it('should allow valid intensity levels', async () => {
      const validIntensities = ['low', 'moderate', 'high', 'maximum'];
      
      for (const intensity of validIntensities) {
        const planData = {
          userId,
          title: `Test Plan ${intensity}`,
          description: 'Test description',
          duration: 12,
          difficulty: 'beginner',
          workouts: [
            {
              title: 'Test Workout',
              description: 'Test description',
              type: 'easy',
              duration: 30,
              intensity: intensity
            }
          ]
        };

        const plan = new TrainingPlan(planData);
        const savedPlan = await plan.save();
        expect(savedPlan.workouts[0].intensity).toBe(intensity);
        
        await TrainingPlan.findByIdAndDelete(savedPlan._id);
      }
    });
  });

  describe('Input Data Validation', () => {
    it('should validate distance unit enum', async () => {
      const planData = {
        userId,
        title: 'Test Plan',
        description: 'Test description',
        duration: 12,
        difficulty: 'beginner',
        inputData: {
          distance: 5.0,
          distanceUnit: 'invalid_unit',
          maxDistance: 10.0,
          maxDistanceUnit: 'km'
        }
      };

      const plan = new TrainingPlan(planData);
      await expect(plan.save()).rejects.toThrow();
    });

    it('should allow valid distance units', async () => {
      const validUnits = ['km', 'miles'];
      
      for (const unit of validUnits) {
        const planData = {
          userId,
          title: `Test Plan ${unit}`,
          description: 'Test description',
          duration: 12,
          difficulty: 'beginner',
          inputData: {
            distance: 5.0,
            distanceUnit: unit,
            maxDistance: 10.0,
            maxDistanceUnit: unit
          }
        };

        const plan = new TrainingPlan(planData);
        const savedPlan = await plan.save();
        expect(savedPlan.inputData.distanceUnit).toBe(unit);
        
        await TrainingPlan.findByIdAndDelete(savedPlan._id);
      }
    });
  });

  describe('Workout Management', () => {
    let planId;
    let workoutId;

    beforeEach(async () => {
      const planData = {
        userId,
        title: 'Test Plan',
        description: 'Test description',
        duration: 12,
        difficulty: 'beginner',
        workouts: [
          {
            title: 'Test Workout',
            description: 'Test description',
            type: 'easy',
            duration: 30,
            intensity: 'low',
            completed: false
          }
        ]
      };

      const plan = new TrainingPlan(planData);
      const savedPlan = await plan.save();
      planId = savedPlan._id;
      workoutId = savedPlan.workouts[0]._id;
    });

    it('should mark workout as completed', async () => {
      const plan = await TrainingPlan.findById(planId);
      const workout = plan.workouts.id(workoutId);
      
      workout.completed = true;
      await plan.save();

      const updatedPlan = await TrainingPlan.findById(planId);
      expect(updatedPlan.workouts.id(workoutId).completed).toBe(true);
    });

    it('should update workout scheduled date', async () => {
      const newDate = new Date('2023-12-25');
      const plan = await TrainingPlan.findById(planId);
      const workout = plan.workouts.id(workoutId);
      
      workout.scheduledDate = newDate;
      await plan.save();

      const updatedPlan = await TrainingPlan.findById(planId);
      expect(updatedPlan.workouts.id(workoutId).scheduledDate).toEqual(newDate);
    });
  });
});
