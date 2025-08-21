const fitFileService = require('../../services/fitFileService');
const fs = require('fs').promises;
const path = require('path');

// Mock fs operations
jest.mock('fs', () => ({
  promises: {
    mkdir: jest.fn(),
    writeFile: jest.fn(),
    readFile: jest.fn(),
    readdir: jest.fn(),
    stat: jest.fn(),
    unlink: jest.fn()
  }
}));

describe('FIT File Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('generateFitFile', () => {
    it('should generate FIT file successfully', async () => {
      const mockWorkout = {
        id: '123',
        title: 'Test Workout',
        duration: 30,
        distance: 5.0,
        scheduledDate: new Date('2023-01-01'),
        type: 'easy',
        intensity: 'low'
      };

      fs.writeFile.mockResolvedValue();

      const result = await fitFileService.generateFitFile(mockWorkout);

      expect(result).toHaveProperty('fileName');
      expect(result).toHaveProperty('filePath');
      expect(result).toHaveProperty('url');
      expect(result.fileName).toMatch(/^workout_123_\d+\.fit$/);
      expect(fs.writeFile).toHaveBeenCalled();
    });

    it('should handle file write errors', async () => {
      const mockWorkout = {
        id: '123',
        title: 'Test Workout',
        duration: 30
      };

      fs.writeFile.mockRejectedValue(new Error('Write failed'));

      await expect(fitFileService.generateFitFile(mockWorkout))
        .rejects.toThrow('Failed to generate FIT file');
    });
  });

  describe('getFitFile', () => {
    it('should read FIT file successfully', async () => {
      const fileName = 'test.fit';
      const mockData = Buffer.from('fit file data');
      
      fs.readFile.mockResolvedValue(mockData);

      const result = await fitFileService.getFitFile(fileName);

      expect(result).toEqual(mockData);
      expect(fs.readFile).toHaveBeenCalledWith(
        expect.stringContaining(fileName)
      );
    });

    it('should handle file read errors', async () => {
      const fileName = 'nonexistent.fit';
      
      fs.readFile.mockRejectedValue(new Error('File not found'));

      await expect(fitFileService.getFitFile(fileName))
        .rejects.toThrow('FIT file not found');
    });
  });

  describe('deleteFitFile', () => {
    it('should delete FIT file successfully', async () => {
      const fileName = 'test.fit';
      
      fs.unlink.mockResolvedValue();

      await fitFileService.deleteFitFile(fileName);

      expect(fs.unlink).toHaveBeenCalledWith(
        expect.stringContaining(fileName)
      );
    });

    it('should handle delete errors gracefully', async () => {
      const fileName = 'test.fit';
      
      fs.unlink.mockRejectedValue(new Error('Delete failed'));

      // Should not throw
      await expect(fitFileService.deleteFitFile(fileName))
        .resolves.toBeUndefined();
    });
  });

  describe('cleanupOldFiles', () => {
    it('should cleanup old files', async () => {
      const oldDate = new Date(Date.now() - 25 * 60 * 60 * 1000); // 25 hours ago
      const recentDate = new Date(Date.now() - 1 * 60 * 60 * 1000); // 1 hour ago

      fs.readdir.mockResolvedValue(['old.fit', 'recent.fit']);
      fs.stat
        .mockResolvedValueOnce({ mtime: oldDate })
        .mockResolvedValueOnce({ mtime: recentDate });
      fs.unlink.mockResolvedValue();

      await fitFileService.cleanupOldFiles(24);

      expect(fs.unlink).toHaveBeenCalledTimes(1);
      expect(fs.unlink).toHaveBeenCalledWith(
        expect.stringContaining('old.fit')
      );
    });

    it('should handle cleanup errors gracefully', async () => {
      fs.readdir.mockRejectedValue(new Error('Read directory failed'));

      // Should not throw
      await expect(fitFileService.cleanupOldFiles())
        .resolves.toBeUndefined();
    });
  });

  describe('createFitFileData', () => {
    it('should create valid FIT file structure', () => {
      const mockWorkout = {
        id: '123',
        title: 'Test Workout',
        duration: 30,
        distance: 5.0,
        scheduledDate: new Date('2023-01-01'),
        type: 'easy',
        intensity: 'low'
      };

      const fitData = fitFileService.createFitFileData(mockWorkout);

      expect(Buffer.isBuffer(fitData)).toBe(true);
      expect(fitData.length).toBeGreaterThan(14); // At least header size
      
      // Check FIT file header
      expect(fitData.readUInt8(0)).toBe(14); // Header size
      expect(fitData.readUInt8(1)).toBe(0x10); // Protocol version
      expect(fitData.toString('ascii', 8, 12)).toBe('.FIT'); // Data type
    });
  });

  describe('toFitTimestamp', () => {
    it('should convert date to FIT timestamp', () => {
      const testDate = new Date('2023-01-01T00:00:00Z');
      const timestamp = fitFileService.toFitTimestamp(testDate);
      
      expect(typeof timestamp).toBe('number');
      expect(timestamp).toBeGreaterThan(0);
    });
  });
});
