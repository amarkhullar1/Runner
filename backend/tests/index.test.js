const { startServer } = require('../index');

describe('startServer', () => {
  let logger;
  let mongooseClient;

  beforeEach(() => {
    logger = { info: jest.fn(), error: jest.fn() };
    mongooseClient = { connect: jest.fn().mockResolvedValue() };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  const closeServer = (server) => new Promise((resolve, reject) => {
    server.close((error) => {
      if (error) {
        reject(error);
      } else {
        resolve();
      }
    });
  });

  it('connects to MongoDB and starts the HTTP server', async () => {
    const result = await startServer({
      port: 0,
      mongoUri: 'mongodb://localhost:27017/test-runner',
      mongooseClient,
      logger,
      appOptions: {
        enableRateLimiting: false,
        enableSecurityHeaders: false,
      },
    });

    expect(mongooseClient.connect).toHaveBeenCalledWith(
      'mongodb://localhost:27017/test-runner',
      expect.objectContaining({
        useNewUrlParser: true,
        useUnifiedTopology: true,
      }),
    );
    expect(result).toHaveProperty('app');
    expect(result).toHaveProperty('server');
    expect(logger.info).toHaveBeenCalled();

    await closeServer(result.server);
  });

  it('skips database connectivity when configured', async () => {
    const result = await startServer({
      port: 0,
      skipDatabase: true,
      mongooseClient,
      logger,
      appOptions: {
        enableRateLimiting: false,
        enableSecurityHeaders: false,
      },
    });

    expect(mongooseClient.connect).not.toHaveBeenCalled();

    await closeServer(result.server);
  });

  it('propagates database connection failures', async () => {
    const connectionError = new Error('connection failed');
    mongooseClient.connect.mockRejectedValue(connectionError);

    await expect(startServer({
      port: 0,
      mongooseClient,
      logger,
      appOptions: {
        enableRateLimiting: false,
        enableSecurityHeaders: false,
      },
    })).rejects.toThrow('connection failed');

    expect(logger.error).toHaveBeenCalledWith('MongoDB connection error:', connectionError);
  });
});
