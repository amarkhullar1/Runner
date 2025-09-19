const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const authRoutes = require('./routes/auth');
const planRoutes = require('./routes/plans');
const workoutRoutes = require('./routes/workouts');
const fitRoutes = require('./routes/fit');

function createApp(options = {}) {
  const {
    enableSecurityHeaders = true,
    enableRateLimiting = true,
    corsOptions = {},
    rateLimitOptions = {},
    jsonLimit = '10mb',
    urlencodedOptions = { extended: true },
    logger = console,
    healthCheck = true,
  } = options;

  const app = express();

  if (enableSecurityHeaders) {
    const helmetConfig = typeof enableSecurityHeaders === 'object' ? enableSecurityHeaders : undefined;
    app.use(helmet(helmetConfig));
  }

  if (enableRateLimiting) {
    const limiter = rateLimit({
      windowMs: 15 * 60 * 1000,
      max: 100,
      message: 'Too many requests from this IP, please try again later.',
      standardHeaders: true,
      legacyHeaders: false,
      ...rateLimitOptions,
    });
    app.use('/api/', limiter);
  }

  const defaultOrigins = process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'];
  const corsConfig = {
    origin: defaultOrigins,
    credentials: true,
    ...corsOptions,
  };
  app.use(cors(corsConfig));

  app.use(express.json({ limit: jsonLimit }));
  app.use(express.urlencoded({ ...urlencodedOptions }));

  app.use('/api/auth', authRoutes);
  app.use('/api/plans', planRoutes);
  app.use('/api/workouts', workoutRoutes);
  app.use('/api/fit', fitRoutes);

  if (healthCheck) {
    app.get('/api/health', (req, res) => {
      res.json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        version: process.env.npm_package_version || '1.0.0',
      });
    });
  }

  app.use((err, req, res, next) => {
    if (logger && typeof logger.error === 'function') {
      logger.error(err.stack || err);
    }

    if (err.name === 'ValidationError') {
      return res.status(400).json({
        error: 'Validation Error',
        message: err.message,
      });
    }

    if (err.name === 'JsonWebTokenError') {
      return res.status(401).json({
        error: 'Invalid Token',
        message: 'Please log in again',
      });
    }

    res.status(500).json({
      error: 'Internal Server Error',
      message: process.env.NODE_ENV === 'production' ? 'Something went wrong' : err.message,
    });
  });

  app.use('*', (req, res) => {
    res.status(404).json({
      error: 'Not Found',
      message: 'The requested resource was not found',
    });
  });

  return app;
}

module.exports = { createApp };
