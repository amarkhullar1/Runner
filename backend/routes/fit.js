const express = require('express');
const TrainingPlan = require('../models/TrainingPlan');
const auth = require('../middleware/auth');
const fitFileService = require('../services/fitFileService');

const router = express.Router();

// @route   GET /api/fit/:workoutId
// @desc    Generate and download FIT file for a workout
// @access  Private
router.get('/:workoutId', auth, async (req, res) => {
  try {
    const { workoutId } = req.params;
    const userId = req.user._id;
    
    // Find the workout
    const plan = await TrainingPlan.findOne({ userId, 'workouts._id': workoutId });
    
    if (!plan) {
      return res.status(404).json({ message: 'Workout not found' });
    }

    const workout = plan.workouts.id(workoutId);
    
    // Generate FIT file
    const fitFileInfo = await fitFileService.generateFitFile({
      id: workout._id,
      title: workout.title,
      duration: workout.duration,
      distance: workout.distance,
      scheduledDate: workout.scheduledDate,
      type: workout.type,
      intensity: workout.intensity
    });

    // Update workout with FIT file URL
    workout.fitFileUrl = fitFileInfo.url;
    await plan.save();

    // Read and send the file
    const fitData = await fitFileService.getFitFile(fitFileInfo.fileName);
    
    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${workout.title.replace(/[^a-zA-Z0-9]/g, '_')}.fit"`);
    res.send(fitData);

  } catch (error) {
    console.error('FIT file download error:', error);
    res.status(500).json({ message: 'Failed to generate FIT file' });
  }
});

// @route   GET /api/fit/download/:fileName
// @desc    Download FIT file by filename
// @access  Private
router.get('/download/:fileName(*)', auth, async (req, res) => {
  try {
    const { fileName } = req.params;
    
    // Validate filename to prevent directory traversal
    if (!/^workout_[a-f0-9]+_\d+\.fit$/.test(fileName)) {
      return res.status(400).json({ message: 'Invalid filename' });
    }

    const fitData = await fitFileService.getFitFile(fileName);
    
    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.send(fitData);

  } catch (error) {
    console.error('FIT file download error:', error);
    res.status(404).json({ message: 'FIT file not found' });
  }
});

// @route   POST /api/fit/cleanup
// @desc    Cleanup old FIT files (admin endpoint)
// @access  Private
router.post('/cleanup', auth, async (req, res) => {
  try {
    await fitFileService.cleanupOldFiles(24); // Clean files older than 24 hours
    res.json({ message: 'FIT files cleanup completed' });
  } catch (error) {
    console.error('FIT cleanup error:', error);
    res.status(500).json({ message: 'Failed to cleanup FIT files' });
  }
});

module.exports = router;
