const mongoose = require('mongoose');
const { createApp } = require('./app');

async function startServer(options = {}) {
  const {
    port = process.env.PORT || 3000,
    mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/runner',
    mongooseClient = mongoose,
    connectOptions = { useNewUrlParser: true, useUnifiedTopology: true },
    skipDatabase = false,
    logger = console,
    appOptions = {},
  } = options;

  const app = createApp({ logger, ...appOptions });

  if (!skipDatabase) {
    try {
      await mongooseClient.connect(mongoUri, connectOptions);
      if (logger && typeof logger.info === 'function') {
        logger.info(`Connected to MongoDB at ${mongoUri}`);
      }
    } catch (error) {
      if (logger && typeof logger.error === 'function') {
        logger.error('MongoDB connection error:', error);
      }
      throw error;
    }
  }

  return new Promise((resolve, reject) => {
    const server = app.listen(port, () => {
      if (logger && typeof logger.info === 'function') {
        logger.info(`🏃‍♂️ Runner API server running on port ${port}`);
        logger.info(`📍 Health check: http://localhost:${port}/api/health`);
      } else {
        console.log(`🏃‍♂️ Runner API server running on port ${port}`);
        console.log(`📍 Health check: http://localhost:${port}/api/health`);
      }
      resolve({ app, server, port });
    });

    server.on('error', (error) => {
      if (logger && typeof logger.error === 'function') {
        logger.error('Runner API failed to start', error);
      }
      reject(error);
    });
  });
}

module.exports = {
  createApp,
  startServer,
};
