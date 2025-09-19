require('dotenv').config();
const { startServer } = require('./index');

startServer()
  .catch((error) => {
    console.error('Failed to start Runner API server:', error);
    process.exit(1);
  });
