const express = require('express');
const TrainingPlan = require('../models/TrainingPlan');
const auth = require('../middleware/auth');

const router = express.Router();

// @route   GET /api/workouts/user
// @desc    Get user's scheduled workouts
// @access  Private
router.get('/user', auth, async (req, res) => {
  try {
    const userId = req.user._id;
    
    const plan = await TrainingPlan.findOne({ userId }).sort({ createdAt: -1 });
    
    if (!plan) {
      return res.json([]);
    }

    // Return workouts sorted by scheduled date
    const workouts = plan.workouts
      .map(workout => ({
        id: workout._id,
        planId: plan._id,
        title: workout.title,
        description: workout.description,
        type: workout.type,
        duration: workout.duration,
        distance: workout.distance,
        intensity: workout.intensity,
        scheduledDate: workout.scheduledDate,
        completed: workout.completed,
        instructions: workout.instructions,
        fitFileUrl: workout.fitFileUrl
      }))
      .sort((a, b) => new Date(a.scheduledDate) - new Date(b.scheduledDate));

    res.json(workouts);

  } catch (error) {
    console.error('Get workouts error:', error);
    res.status(500).json({ message: 'Failed to retrieve workouts' });
  }
});

// @route   GET /api/workouts/upcoming
// @desc    Get user's upcoming workouts (next 7 days)
// @access  Private
router.get('/upcoming', auth, async (req, res) => {
  try {
    const userId = req.user._id;
    const today = new Date();
    const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
    
    const plan = await TrainingPlan.findOne({ userId }).sort({ createdAt: -1 });
    
    if (!plan) {
      return res.json([]);
    }

    const upcomingWorkouts = plan.workouts
      .filter(workout => {
        const workoutDate = new Date(workout.scheduledDate);
        return workoutDate >= today && workoutDate <= nextWeek && !workout.completed;
      })
      .map(workout => ({
        id: workout._id,
        planId: plan._id,
        title: workout.title,
        description: workout.description,
        type: workout.type,
        duration: workout.duration,
        distance: workout.distance,
        intensity: workout.intensity,
        scheduledDate: workout.scheduledDate,
        completed: workout.completed,
        instructions: workout.instructions,
        fitFileUrl: workout.fitFileUrl
      }))
      .sort((a, b) => new Date(a.scheduledDate) - new Date(b.scheduledDate));

    res.json(upcomingWorkouts);

  } catch (error) {
    console.error('Get upcoming workouts error:', error);
    res.status(500).json({ message: 'Failed to retrieve upcoming workouts' });
  }
});

// @route   GET /api/workouts/:workoutId
// @desc    Get specific workout details
// @access  Private
router.get('/:workoutId', auth, async (req, res) => {
  try {
    const { workoutId } = req.params;
    const userId = req.user._id;
    
    const plan = await TrainingPlan.findOne({ userId, 'workouts._id': workoutId });
    
    if (!plan) {
      return res.status(404).json({ message: 'Workout not found' });
    }

    const workout = plan.workouts.id(workoutId);
    
    res.json({
      id: workout._id,
      planId: plan._id,
      title: workout.title,
      description: workout.description,
      type: workout.type,
      duration: workout.duration,
      distance: workout.distance,
      intensity: workout.intensity,
      scheduledDate: workout.scheduledDate,
      completed: workout.completed,
      instructions: workout.instructions,
      fitFileUrl: workout.fitFileUrl
    });

  } catch (error) {
    console.error('Get workout error:', error);
    res.status(500).json({ message: 'Failed to retrieve workout' });
  }
});

// @route   PUT /api/workouts/:workoutId/complete
// @desc    Mark workout as completed
// @access  Private
router.put('/:workoutId/complete', auth, async (req, res) => {
  try {
    const { workoutId } = req.params;
    const userId = req.user._id;
    
    const plan = await TrainingPlan.findOne({ userId, 'workouts._id': workoutId });
    
    if (!plan) {
      return res.status(404).json({ message: 'Workout not found' });
    }

    const workout = plan.workouts.id(workoutId);
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

// @route   PUT /api/workouts/:workoutId/reschedule
// @desc    Reschedule a workout
// @access  Private
router.put('/:workoutId/reschedule', auth, async (req, res) => {
  try {
    const { workoutId } = req.params;
    const { scheduledDate } = req.body;
    const userId = req.user._id;
    
    if (!scheduledDate) {
      return res.status(400).json({ message: 'Scheduled date is required' });
    }
    
    const plan = await TrainingPlan.findOne({ userId, 'workouts._id': workoutId });
    
    if (!plan) {
      return res.status(404).json({ message: 'Workout not found' });
    }

    const workout = plan.workouts.id(workoutId);
    workout.scheduledDate = new Date(scheduledDate);
    
    await plan.save();

    res.json({
      message: 'Workout rescheduled successfully',
      workout: {
        id: workout._id,
        title: workout.title,
        scheduledDate: workout.scheduledDate
      }
    });

  } catch (error) {
    console.error('Reschedule workout error:', error);
    res.status(500).json({ message: 'Failed to reschedule workout' });
  }
});

module.exports = router;
