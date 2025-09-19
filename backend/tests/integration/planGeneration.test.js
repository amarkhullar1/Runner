jest.mock('../../services/openaiService', () => ({
  generateTrainingPlan: jest.fn(),
}));

const buildPlan = (input = {}) => {
  const weeks = 12;
  const distance = input.distance || input.maxDistance || 5;
  const difficultyLevel = (() => {
    if (distance >= 30 || (input.maxDistance || 0) >= 30) return 'advanced';
    if (distance >= 10 || (input.maxDistance || 0) >= 21) return 'intermediate';
      return 'beginner';
    })();

    const workouts = Array.from({ length: 10 }).map((_, index) => {
      const baseTypes = ['easy', 'tempo', 'interval', 'long_run', 'recovery'];
      const type = baseTypes[index % baseTypes.length];
      const intensityMap = {
        easy: 'low',
        tempo: 'moderate',
        interval: 'high',
        long_run: difficultyLevel === 'advanced' ? 'high' : 'moderate',
        recovery: 'low',
      };

      const durationBase = [30, 35, 40, 60, 25][index % 5];
      const distanceFactor = Math.max(1, distance / 5);

      return {
        title: `${type.replace('_', ' ')} session ${index + 1}`,
        description: `Mocked ${type} workout tailored for ${difficultyLevel} runners`,
        type,
        duration: Math.round(durationBase * Math.min(distanceFactor, 3)),
        distance: Number((Math.max(2, distance / 2) + index * 0.5).toFixed(1)),
        intensity: intensityMap[type],
        instructions: [
          'Start with a dynamic warm-up',
          `Maintain focus on ${type === 'interval' ? 'speed' : 'form'} throughout`,
          'Cool down with light jogging and stretching',
        ],
        weekNumber: Math.floor(index / 5) + 1,
        dayOfWeek: (index % 5) + 1,
        scheduledDate: new Date(Date.now() + index * 86400000).toISOString(),
      };
    });

    return {
      title: `${difficultyLevel.charAt(0).toUpperCase()}${difficultyLevel.slice(1)} ${Math.round(
        distance,
      )}K Training Plan`,
      description: `A comprehensive ${weeks}-week program for ${difficultyLevel} runners`,
      duration: weeks,
      difficulty: difficultyLevel,
      goals: [
        'Build aerobic endurance',
        'Improve running efficiency',
        'Enhance race-day confidence',
      ],
      workouts,
    aiGeneratedContent: JSON.stringify({ difficulty: difficultyLevel, distance }),
  };
};

require('dotenv').config();
const request = require('supertest');
const express = require('express');
const fs = require('fs');
const path = require('path');
const authRoutes = require('../../routes/auth');
const planRoutes = require('../../routes/plans');
const { setupTestDB, teardownTestDB, clearTestDB } = require('../setup');
const openaiService = require('../../services/openaiService');

// Create Express app for testing
const app = express();
app.use(express.json());
app.use('/api/auth', authRoutes);
app.use('/api/plans', planRoutes);

// Utility function to create HTML document from plan response
function createPlanHTML(planData, testName, inputData) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  
  let html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Training Plan - ${testName}</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; background-color: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 8px; margin-bottom: 30px; }
        .input-section { background: #e8f4fd; padding: 15px; border-radius: 8px; margin-bottom: 20px; }
        .plan-overview { background: #f0f8ff; padding: 20px; border-radius: 8px; margin-bottom: 30px; border-left: 5px solid #4CAF50; }
        .workout { background: white; border: 1px solid #ddd; margin: 15px 0; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .workout-header { background: #f8f9fa; padding: 10px; margin: -20px -20px 15px -20px; border-radius: 8px 8px 0 0; border-bottom: 2px solid #e9ecef; }
        .workout-title { font-size: 18px; font-weight: bold; color: #333; margin: 0; }
        .workout-meta { color: #666; font-size: 14px; margin-top: 5px; }
        .instructions { background: #fff3cd; padding: 15px; border-radius: 5px; margin-top: 15px; }
        .instructions h4 { margin-top: 0; color: #856404; }
        .instructions ul { margin: 10px 0; padding-left: 20px; }
        .stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin: 20px 0; }
        .stat-card { background: #f8f9fa; padding: 15px; border-radius: 8px; text-align: center; border: 1px solid #e9ecef; }
        .stat-number { font-size: 24px; font-weight: bold; color: #495057; }
        .stat-label { color: #6c757d; font-size: 14px; }
        .intensity-low { border-left: 5px solid #28a745; }
        .intensity-moderate { border-left: 5px solid #ffc107; }
        .intensity-high { border-left: 5px solid #fd7e14; }
        .intensity-maximum { border-left: 5px solid #dc3545; }
        .type-easy { background-color: #d4edda; }
        .type-tempo { background-color: #fff3cd; }
        .type-interval { background-color: #f8d7da; }
        .type-long_run { background-color: #d1ecf1; }
        .type-recovery { background-color: #e2e3e5; }
        .type-cross_training { background-color: #e7e3ff; }
        .goals { background: #d4edda; padding: 15px; border-radius: 8px; margin: 15px 0; }
        .goals ul { margin: 10px 0; padding-left: 20px; }
        .timestamp { color: #6c757d; font-size: 12px; text-align: right; margin-top: 20px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🏃‍♂️ Training Plan: ${planData.title}</h1>
            <p>Generated from ${testName}</p>
        </div>

        <div class="input-section">
            <h3>📝 Input Data</h3>
            <pre>${JSON.stringify(inputData, null, 2)}</pre>
        </div>

        <div class="plan-overview">
            <h2>📋 Plan Overview</h2>
            <p><strong>Description:</strong> ${planData.description}</p>
            <p><strong>Duration:</strong> ${planData.duration} weeks</p>
            <p><strong>Difficulty:</strong> <span style="text-transform: capitalize; font-weight: bold;">${planData.difficulty}</span></p>
            
            <div class="goals">
                <h4>🎯 Training Goals</h4>
                <ul>
                    ${planData.goals.map(goal => `<li>${goal}</li>`).join('')}
                </ul>
            </div>
        </div>`;

  // Calculate statistics
  const workoutTypes = {};
  const intensityLevels = {};
  let totalDuration = 0;
  let totalDistance = 0;

  planData.workouts.forEach(workout => {
    workoutTypes[workout.type] = (workoutTypes[workout.type] || 0) + 1;
    intensityLevels[workout.intensity] = (intensityLevels[workout.intensity] || 0) + 1;
    totalDuration += workout.duration || 0;
    totalDistance += workout.distance || 0;
  });

  html += `
        <div class="stats">
            <div class="stat-card">
                <div class="stat-number">${planData.workouts.length}</div>
                <div class="stat-label">Total Workouts</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">${(totalDuration/60).toFixed(1)}</div>
                <div class="stat-label">Total Hours</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">${totalDistance.toFixed(1)}</div>
                <div class="stat-label">Total Distance (km)</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">${Object.keys(workoutTypes).length}</div>
                <div class="stat-label">Workout Types</div>
            </div>
        </div>

        <h2>🏃‍♂️ Detailed Workouts</h2>`;

  // Add workouts
  planData.workouts.forEach((workout, index) => {
    html += `
        <div class="workout type-${workout.type} intensity-${workout.intensity}">
            <div class="workout-header">
                <div class="workout-title">${workout.title}</div>
                <div class="workout-meta">
                    Week ${workout.weekNumber || 'N/A'} • Day ${workout.dayOfWeek || 'N/A'} • 
                    ${workout.type.replace('_', ' ').toUpperCase()} • 
                    ${workout.intensity.toUpperCase()} intensity
                </div>
            </div>
            
            <p><strong>Description:</strong> ${workout.description}</p>
            <p><strong>Duration:</strong> ${workout.duration} minutes</p>
            ${workout.distance ? `<p><strong>Distance:</strong> ${workout.distance} km</p>` : ''}
            <p><strong>Scheduled:</strong> ${workout.scheduledDate}</p>
            
            ${workout.instructions && workout.instructions.length > 0 ? `
            <div class="instructions">
                <h4>📋 Instructions</h4>
                <ul>
                    ${workout.instructions.map(instruction => `<li>${instruction}</li>`).join('')}
                </ul>
            </div>
            ` : ''}
        </div>`;
  });

  html += `
        <div class="timestamp">
            Generated on: ${new Date().toLocaleString()}
        </div>
    </div>
</body>
</html>`;

  return html;
}

// Utility function to save HTML file
function savePlanToFile(planData, testName, inputData) {
  try {
    const outputDir = path.join(__dirname, '..', '..', 'test-outputs');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
    const filename = `${testName.replace(/\s+/g, '-').toLowerCase()}-${timestamp}.html`;
    const filepath = path.join(outputDir, filename);
    
    const html = createPlanHTML(planData, testName, inputData);
    fs.writeFileSync(filepath, html, 'utf8');
    
    console.log(`\n💾 Plan saved to: ${filepath}`);
    return filepath;
  } catch (error) {
    console.error('Error saving plan to file:', error);
    return null;
  }
}

describe('Plan Generation Integration Test', () => {
  let authToken;
  let userId;

  beforeAll(async () => {
    await setupTestDB();
  }, 30000); // 30 second timeout

  afterAll(async () => {
    await teardownTestDB();
  }, 30000);

  beforeEach(async () => {
    openaiService.generateTrainingPlan.mockImplementation((input) => Promise.resolve(buildPlan(input)));
    await clearTestDB();

    // Register and authenticate user for testing
    const userData = {
      name: 'Plan Test User',
      email: 'plantest@example.com',
      password: 'testpassword123'
    };

    const registerResponse = await request(app)
      .post('/api/auth/register')
      .send(userData);

    authToken = registerResponse.body.token;
    userId = registerResponse.body.user.id;
  }, 15000);

  describe('Training Plan Generation with Real OpenAI Output', () => {
    it('should generate a training plan and print detailed output', async () => {
      console.log('\n=== TRAINING PLAN GENERATION TEST ===\n');
      
      // Test data representing a typical user input
      const runningData = {
        distance: 5.0,
        distanceUnit: 'km',
        time: { hours: 0, minutes: 25 },
        maxDistance: 10.0,
        maxDistanceUnit: 'km'
      };

      console.log('📝 INPUT DATA:');
      console.log(JSON.stringify(runningData, null, 2));
      console.log('\n🔄 Generating training plan...\n');

      // Call the plan generation endpoint
      const planResponse = await request(app)
        .post('/api/plans/generate')
        .set('Authorization', `Bearer ${authToken}`)
        .send(runningData)
        .expect(201);

      // Print the complete response
      console.log('✅ PLAN GENERATION SUCCESSFUL!\n');
      console.log('📋 GENERATED PLAN OVERVIEW:');
      console.log(`Title: ${planResponse.body.plan.title}`);
      console.log(`Description: ${planResponse.body.plan.description}`);
      console.log(`Duration: ${planResponse.body.plan.duration} weeks`);
      console.log(`Difficulty: ${planResponse.body.plan.difficulty}`);
      console.log(`Goals: ${planResponse.body.plan.goals.join(', ')}`);
      console.log(`Total Workouts: ${planResponse.body.plan.workouts.length}`);
      console.log(`Created: ${planResponse.body.plan.createdAt}`);

      console.log('\n🏃‍♂️ DETAILED WORKOUT BREAKDOWN:');
      planResponse.body.plan.workouts.forEach((workout, index) => {
        console.log(`\n--- Workout ${index + 1} ---`);
        console.log(`Title: ${workout.title}`);
        console.log(`Type: ${workout.type}`);
        console.log(`Duration: ${workout.duration} minutes`);
        console.log(`Distance: ${workout.distance || 'N/A'} km`);
        console.log(`Intensity: ${workout.intensity}`);
        console.log(`Week: ${workout.weekNumber || 'N/A'}, Day: ${workout.dayOfWeek || 'N/A'}`);
        console.log(`Scheduled: ${workout.scheduledDate}`);
        console.log(`Description: ${workout.description}`);
        if (workout.instructions && workout.instructions.length > 0) {
          console.log('Instructions:');
          workout.instructions.forEach((instruction, i) => {
            console.log(`  ${i + 1}. ${instruction}`);
          });
        }
      });

      console.log('\n📊 PLAN STATISTICS:');
      const workoutTypes = {};
      const intensityLevels = {};
      let totalDuration = 0;
      let totalDistance = 0;

      planResponse.body.plan.workouts.forEach(workout => {
        workoutTypes[workout.type] = (workoutTypes[workout.type] || 0) + 1;
        intensityLevels[workout.intensity] = (intensityLevels[workout.intensity] || 0) + 1;
        totalDuration += workout.duration || 0;
        totalDistance += workout.distance || 0;
      });

      console.log(`Total Training Time: ${totalDuration} minutes (${(totalDuration/60).toFixed(1)} hours)`);
      console.log(`Total Distance: ${totalDistance.toFixed(1)} km`);
      console.log('Workout Types:', workoutTypes);
      console.log('Intensity Distribution:', intensityLevels);

      console.log('\n=== END OF PLAN GENERATION TEST ===\n');

      // Save plan to HTML file
      savePlanToFile(planResponse.body.plan, 'Training Plan Generation Test', runningData);

      // Assertions to ensure the plan is valid
      expect(planResponse.body.plan).toBeDefined();
      expect(planResponse.body.plan.title).toBeTruthy();
      expect(planResponse.body.plan.description).toBeTruthy();
      expect(planResponse.body.plan.workouts).toBeInstanceOf(Array);
      expect(planResponse.body.plan.workouts.length).toBeGreaterThan(0);
      expect(planResponse.body.plan.goals).toBeInstanceOf(Array);
      expect(['beginner', 'intermediate', 'advanced']).toContain(planResponse.body.plan.difficulty);
    }, 60000); // 60 second timeout for OpenAI calls

    it('should generate plan for beginner runner (max distance only)', async () => {
      console.log('\n=== BEGINNER RUNNER TEST ===\n');
      
      const beginnerData = {
        maxDistance: 3.0,
        maxDistanceUnit: 'km'
      };

      console.log('📝 BEGINNER INPUT:', JSON.stringify(beginnerData, null, 2));

      const planResponse = await request(app)
        .post('/api/plans/generate')
        .set('Authorization', `Bearer ${authToken}`)
        .send(beginnerData)
        .expect(201);

      console.log('\n🎯 BEGINNER PLAN SUMMARY:');
      console.log(`Title: ${planResponse.body.plan.title}`);
      console.log(`Difficulty: ${planResponse.body.plan.difficulty}`);
      console.log(`First Week Workouts:`);
      
      const firstWeekWorkouts = planResponse.body.plan.workouts.filter(w => w.weekNumber === 1);
      firstWeekWorkouts.forEach(workout => {
        console.log(`  - ${workout.title} (${workout.type}, ${workout.duration}min)`);
      });

      // Save plan to HTML file
      savePlanToFile(planResponse.body.plan, 'Beginner Runner Test', beginnerData);

      expect(planResponse.body.plan.difficulty).toBe('beginner');
    }, 60000); // 60 second timeout

    it('should generate plan for advanced runner', async () => {
      console.log('\n=== ADVANCED RUNNER TEST ===\n');
      
      const advancedData = {
        distance: 21.1,
        distanceUnit: 'km',
        time: { hours: 1, minutes: 45 },
        maxDistance: 42.2,
        maxDistanceUnit: 'km'
      };

      console.log('📝 ADVANCED INPUT:', JSON.stringify(advancedData, null, 2));

      const planResponse = await request(app)
        .post('/api/plans/generate')
        .set('Authorization', `Bearer ${authToken}`)
        .send(advancedData)
        .expect(201);

      console.log('\n🏆 ADVANCED PLAN SUMMARY:');
      console.log(`Title: ${planResponse.body.plan.title}`);
      console.log(`Difficulty: ${planResponse.body.plan.difficulty}`);
      
      const highIntensityWorkouts = planResponse.body.plan.workouts.filter(w => 
        w.intensity === 'high' || w.intensity === 'maximum'
      );
      console.log(`High Intensity Workouts: ${highIntensityWorkouts.length}`);
      
      // Save plan to HTML file
      savePlanToFile(planResponse.body.plan, 'Advanced Runner Test', advancedData);

      expect(['intermediate', 'advanced']).toContain(planResponse.body.plan.difficulty);
    }, 60000); // 60 second timeout
  });
});
