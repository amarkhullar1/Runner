const fs = require('fs').promises;
const path = require('path');

class FitFileService {
  constructor() {
    this.fitFilesDir = path.join(__dirname, '..', 'fit-files');
    this.ensureFitFilesDirectory();
  }

  async ensureFitFilesDirectory() {
    try {
      await fs.mkdir(this.fitFilesDir, { recursive: true });
    } catch (error) {
      console.error('Failed to create fit-files directory:', error);
    }
  }

  async generateFitFile(workout) {
    try {
      const fitData = this.createFitFileData(workout);
      const fileName = `workout_${workout.id}_${Date.now()}.fit`;
      const filePath = path.join(this.fitFilesDir, fileName);
      
      // Write binary FIT file data
      await fs.writeFile(filePath, fitData);
      
      return {
        fileName,
        filePath,
        url: `/api/fit/download/${fileName}`
      };
    } catch (error) {
      console.error('FIT file generation error:', error);
      throw new Error('Failed to generate FIT file');
    }
  }

  createFitFileData(workout) {
    // FIT file header (14 bytes)
    const header = Buffer.alloc(14);
    header.writeUInt8(14, 0); // Header size
    header.writeUInt8(0x10, 1); // Protocol version
    header.writeUInt16LE(2067, 2); // Profile version
    header.writeUInt32LE(0, 4); // Data size (will be updated)
    header.write('.FIT', 8, 4); // Data type
    header.writeUInt16LE(0, 12); // CRC (will be calculated)

    // Create workout data
    const workoutData = this.createWorkoutData(workout);
    
    // Update data size in header
    header.writeUInt32LE(workoutData.length, 4);
    
    // Calculate CRC for header
    const headerCrc = this.calculateCrc(header.slice(0, 12));
    header.writeUInt16LE(headerCrc, 12);
    
    // Combine header and data
    const fitFile = Buffer.concat([header, workoutData]);
    
    // Add file CRC at the end
    const fileCrc = this.calculateCrc(fitFile);
    const crcBuffer = Buffer.alloc(2);
    crcBuffer.writeUInt16LE(fileCrc, 0);
    
    return Buffer.concat([fitFile, crcBuffer]);
  }

  createWorkoutData(workout) {
    const data = [];
    
    // File ID message
    data.push(this.createFileIdMessage());
    
    // Workout message
    data.push(this.createWorkoutMessage(workout));
    
    // Session message
    data.push(this.createSessionMessage(workout));
    
    // Activity message
    data.push(this.createActivityMessage(workout));
    
    return Buffer.concat(data);
  }

  createFileIdMessage() {
    // Simplified FIT file ID message
    const message = Buffer.alloc(20);
    message.writeUInt8(0x40, 0); // Record header (normal header, message type 0)
    message.writeUInt8(0x00, 1); // Message type (File ID)
    
    // File type (4 = activity)
    message.writeUInt8(4, 2);
    
    // Manufacturer (255 = development)
    message.writeUInt16LE(255, 3);
    
    // Product (0 = unknown)
    message.writeUInt16LE(0, 5);
    
    // Serial number
    message.writeUInt32LE(12345, 7);
    
    // Time created (FIT timestamp)
    const fitTimestamp = this.toFitTimestamp(new Date());
    message.writeUInt32LE(fitTimestamp, 11);
    
    return message;
  }

  createWorkoutMessage(workout) {
    const message = Buffer.alloc(30);
    message.writeUInt8(0x40, 0); // Record header
    message.writeUInt8(0x1A, 1); // Message type (Workout)
    
    // Workout name (limited to 16 characters)
    const workoutName = workout.title.substring(0, 15);
    message.write(workoutName, 2, workoutName.length);
    
    // Sport (1 = running)
    message.writeUInt8(1, 18);
    
    return message;
  }

  createSessionMessage(workout) {
    const message = Buffer.alloc(50);
    message.writeUInt8(0x40, 0); // Record header
    message.writeUInt8(0x12, 1); // Message type (Session)
    
    // Start time
    const startTime = this.toFitTimestamp(workout.scheduledDate || new Date());
    message.writeUInt32LE(startTime, 2);
    
    // Total elapsed time (in seconds)
    const totalTime = workout.duration * 60;
    message.writeUInt32LE(totalTime * 1000, 6); // FIT uses milliseconds
    
    // Total distance (in meters)
    if (workout.distance) {
      const distanceMeters = workout.distance * 1000;
      message.writeUInt32LE(distanceMeters * 100, 10); // FIT uses centimeters
    }
    
    // Sport (1 = running)
    message.writeUInt8(1, 14);
    
    // Trigger (0 = manual)
    message.writeUInt8(0, 15);
    
    return message;
  }

  createActivityMessage(workout) {
    const message = Buffer.alloc(20);
    message.writeUInt8(0x40, 0); // Record header
    message.writeUInt8(0x22, 1); // Message type (Activity)
    
    // Timestamp
    const timestamp = this.toFitTimestamp(workout.scheduledDate || new Date());
    message.writeUInt32LE(timestamp, 2);
    
    // Total timer time
    const totalTime = workout.duration * 60 * 1000; // milliseconds
    message.writeUInt32LE(totalTime, 6);
    
    // Type (0 = manual)
    message.writeUInt8(0, 10);
    
    return message;
  }

  toFitTimestamp(date) {
    // FIT timestamp is seconds since 00:00 Dec 31 1989 UTC
    const fitEpoch = new Date('1989-12-31T00:00:00Z');
    return Math.floor((date.getTime() - fitEpoch.getTime()) / 1000);
  }

  calculateCrc(data) {
    // Simplified CRC calculation for FIT files
    let crc = 0;
    for (let i = 0; i < data.length; i++) {
      crc = ((crc >> 8) | (crc << 8)) & 0xFFFF;
      crc ^= data[i] & 0xFF;
      crc ^= (crc & 0xFF) >> 4;
      crc ^= (crc << 8) << 4;
      crc ^= ((crc & 0xFF) << 4) << 1;
    }
    return crc & 0xFFFF;
  }

  async getFitFile(fileName) {
    try {
      const filePath = path.join(this.fitFilesDir, fileName);
      const data = await fs.readFile(filePath);
      return data;
    } catch (error) {
      console.error('Failed to read FIT file:', error);
      throw new Error('FIT file not found');
    }
  }

  async deleteFitFile(fileName) {
    try {
      const filePath = path.join(this.fitFilesDir, fileName);
      await fs.unlink(filePath);
    } catch (error) {
      console.error('Failed to delete FIT file:', error);
    }
  }

  async cleanupOldFiles(maxAgeHours = 24) {
    try {
      const files = await fs.readdir(this.fitFilesDir);
      const now = Date.now();
      const maxAge = maxAgeHours * 60 * 60 * 1000;

      for (const file of files) {
        const filePath = path.join(this.fitFilesDir, file);
        const stats = await fs.stat(filePath);
        
        if (now - stats.mtime.getTime() > maxAge) {
          await this.deleteFitFile(file);
          console.log(`Cleaned up old FIT file: ${file}`);
        }
      }
    } catch (error) {
      console.error('Failed to cleanup old FIT files:', error);
    }
  }
}

module.exports = new FitFileService();
