const express = require('express');
const { body, validationResult } = require('express-validator');
const TrainingPlan = require('../models/TrainingPlan');
const auth = require('../middleware/auth');
const openaiService = require('../services/openaiService');

const router = express.Router();

// @route   POST /api/plans/generate
// @desc    Generate a new training plan using OpenAI
// @access  Private
router.post('/generate', [
  auth,
  body('maxDistance').isFloat({ min: 0.1 }).withMessage('Max distance must be a positive number'),
  body('maxDistanceUnit').isIn(['km', 'miles']).withMessage('Max distance unit must be km or miles'),
  body('distance').optional().isFloat({ min: 0.1 }).withMessage('Distance must be a positive number'),
  body('distanceUnit').optional().isIn(['km', 'miles']).withMessage('Distance unit must be km or miles'),
  body('time.hours').optional().isInt({ min: 0, max: 23 }).withMessage('Hours must be between 0 and 23'),
  body('time.minutes').optional().isInt({ min: 0, max: 59 }).withMessage('Minutes must be between 0 and 59')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const userId = req.user._id;
    const runningData = req.body;

    // Check if user already has a plan (optional - could allow multiple plans)
    const existingPlan = await TrainingPlan.findOne({ userId });
    if (existingPlan) {
      // Delete existing plan to create a new one
      await TrainingPlan.findByIdAndDelete(existingPlan._id);
    }

    // Generate plan using OpenAI
    const aiPlanData = await openaiService.generateTrainingPlan(runningData);

    // Process workouts and add scheduled dates
    const processedWorkouts = aiPlanData.workouts.map((workout, index) => {
      const startDate = new Date();
      const weekNumber = workout.weekNumber || Math.floor(index / 5) + 1;
      const dayOfWeek = workout.dayOfWeek || (index % 5) + 1;
      
      // Calculate scheduled date (week * 7 days + day offset)
      const scheduledDate = new Date(startDate);
      scheduledDate.setDate(startDate.getDate() + ((weekNumber - 1) * 7) + (dayOfWeek - 1));

      return {
        ...workout,
        scheduledDate,
        completed: false,
        fitFileUrl: null
      };
    });

    // Create training plan
    const trainingPlan = new TrainingPlan({
      userId,
      title: aiPlanData.title,
      description: aiPlanData.description,
      duration: aiPlanData.duration || 12,
      difficulty: aiPlanData.difficulty || 'intermediate',
      goals: aiPlanData.goals || [],
      workouts: processedWorkouts,
      inputData: runningData,
      aiGeneratedContent: aiPlanData.aiGeneratedContent
    });

    await trainingPlan.save();

    res.status(201).json({
      message: 'Training plan generated successfully',
      plan: {
        id: trainingPlan._id,
        title: trainingPlan.title,
        description: trainingPlan.description,
        duration: trainingPlan.duration,
        difficulty: trainingPlan.difficulty,
        goals: trainingPlan.goals,
        workouts: trainingPlan.workouts,
        createdAt: trainingPlan.createdAt
      }
    });

  } catch (error) {
    console.error('Plan generation error:', error);
    res.status(500).json({ 
      message: error.message || 'Failed to generate training plan' 
    });
  }
});

// @route   GET /api/plans/user
// @desc    Get user's current training plan
// @access  Private
router.get('/user', auth, async (req, res) => {
  try {
    const userId = req.user._id;
    
    const plan = await TrainingPlan.findOne({ userId }).sort({ createdAt: -1 });
    
    if (!plan) {
      return res.status(404).json({ message: 'No training plan found' });
    }

    res.json({
      id: plan._id,
      title: plan.title,
      description: plan.description,
      duration: plan.duration,
      difficulty: plan.difficulty,
      goals: plan.goals,
      workouts: plan.workouts,
      createdAt: plan.createdAt,
      updatedAt: plan.updatedAt
    });

  } catch (error) {
    console.error('Get plan error:', error);
    res.status(500).json({ message: 'Failed to retrieve training plan' });
  }
});

// @route   PUT /api/plans/:planId/workout/:workoutId/complete
// @desc    Mark a workout as completed
// @access  Private
router.put('/:planId/workout/:workoutId/complete', auth, async (req, res) => {
  try {
    const { planId, workoutId } = req.params;
    const userId = req.user._id;

    const plan = await TrainingPlan.findOne({ _id: planId, userId });
    if (!plan) {
      return res.status(404).json({ message: 'Training plan not found' });
    }

    const workout = plan.workouts.id(workoutId);
    if (!workout) {
      return res.status(404).json({ message: 'Workout not found' });
    }

    workout.completed = true;
    await plan.save();

    res.json({
      message: 'Workout marked as completed',
      workout: {
        id: workout._id,
        title: workout.title,
        completed: workout.completed
      }
    });

  } catch (error) {
    console.error('Complete workout error:', error);
    res.status(500).json({ message: 'Failed to mark workout as completed' });
  }
});

// @route   DELETE /api/plans/:planId
// @desc    Delete a training plan
// @access  Private
router.delete('/:planId', auth, async (req, res) => {
  try {
    const { planId } = req.params;
    const userId = req.user._id;

    const plan = await TrainingPlan.findOneAndDelete({ _id: planId, userId });
    if (!plan) {
      return res.status(404).json({ message: 'Training plan not found' });
    }

    res.json({ message: 'Training plan deleted successfully' });

  } catch (error) {
    console.error('Delete plan error:', error);
    res.status(500).json({ message: 'Failed to delete training plan' });
  }
});

module.exports = router;
