const { resetStores } = require('./utils/inMemoryStore');

jest.mock('../models/User', () => require('./utils/inMemoryUserModel'));
jest.mock('../models/TrainingPlan', () => require('./utils/inMemoryTrainingPlanModel'));

process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';
process.env.JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';
process.env.OPENAI_API_KEY = process.env.OPENAI_API_KEY || 'test-openai-key';

const setupTestDB = async () => {
  resetStores();
};

const teardownTestDB = async () => {
  resetStores();
};

const clearTestDB = async () => {
  resetStores();
};

module.exports = {
  setupTestDB,
  teardownTestDB,
  clearTestDB,
};
