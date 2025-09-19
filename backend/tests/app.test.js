const request = require('supertest');
const { createApp } = require('../app');

describe('createApp', () => {
  const baseOptions = {
    enableRateLimiting: false,
    enableSecurityHeaders: false,
  };

  it('exposes a health check endpoint when enabled', async () => {
    const app = createApp(baseOptions);

    const response = await request(app).get('/api/health').expect(200);

    expect(response.body).toMatchObject({
      status: 'OK',
    });
    expect(response.body.timestamp).toBeTruthy();
  });

  it('omits the health check endpoint when disabled', async () => {
    const app = createApp({ ...baseOptions, healthCheck: false });

    const response = await request(app).get('/api/health').expect(404);

    expect(response.body).toMatchObject({
      error: 'Not Found',
      message: 'The requested resource was not found',
    });
  });

  it('returns a consistent 404 payload for unknown routes', async () => {
    const app = createApp(baseOptions);

    const response = await request(app).get('/api/does-not-exist').expect(404);

    expect(response.body).toEqual({
      error: 'Not Found',
      message: 'The requested resource was not found',
    });
  });

  it('logs and formats unexpected errors using the shared handler', async () => {
    const logger = { error: jest.fn() };
    const app = createApp({ ...baseOptions, logger });

    const stack = app._router.stack;
    const notFoundLayer = stack.pop();
    const errorLayer = stack.pop();

    app.get('/force-error', () => {
      throw new Error('Boom');
    });

    stack.push(errorLayer, notFoundLayer);

    const response = await request(app).get('/force-error').expect(500);

    expect(logger.error).toHaveBeenCalled();
    expect(response.body).toMatchObject({
      error: 'Internal Server Error',
      message: 'Boom',
    });
  });
});
