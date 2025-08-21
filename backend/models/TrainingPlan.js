const mongoose = require('mongoose');

const workoutSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['easy', 'tempo', 'interval', 'long_run', 'recovery', 'race', 'cross_training'],
    required: true
  },
  duration: {
    type: Number, // minutes
    required: true
  },
  distance: {
    type: Number, // km
    required: false
  },
  intensity: {
    type: String,
    enum: ['low', 'moderate', 'high', 'maximum'],
    required: true
  },
  scheduledDate: {
    type: Date,
    required: false
  },
  completed: {
    type: Boolean,
    default: false
  },
  instructions: [{
    type: String
  }],
  fitFileUrl: {
    type: String,
    required: false
  }
}, {
  timestamps: true
});

const trainingPlanSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  title: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  duration: {
    type: Number, // weeks
    required: true
  },
  difficulty: {
    type: String,
    enum: ['beginner', 'intermediate', 'advanced'],
    required: true
  },
  goals: [{
    type: String
  }],
  workouts: [workoutSchema],
  inputData: {
    distance: Number,
    distanceUnit: {
      type: String,
      enum: ['km', 'miles']
    },
    time: {
      hours: Number,
      minutes: Number
    },
    maxDistance: Number,
    maxDistanceUnit: {
      type: String,
      enum: ['km', 'miles']
    }
  },
  aiGeneratedContent: {
    type: String, // Store the raw OpenAI response
    required: false
  }
}, {
  timestamps: true
});

// Index for efficient queries
trainingPlanSchema.index({ userId: 1, createdAt: -1 });
workoutSchema.index({ scheduledDate: 1 });

module.exports = mongoose.model('TrainingPlan', trainingPlanSchema);
