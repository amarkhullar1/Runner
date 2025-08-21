# Runner App Deployment Guide

This guide covers how to set up, test, and deploy the Runner AI-powered running training app.

## Prerequisites

### Required Software
- **Node.js 18+** - Backend runtime
- **MongoDB** - Database (local or cloud)
- **Xcode 14+** - iOS development (Mac required)
- **OpenAI API Key** - For AI training plan generation

### Development Tools
- **Git** - Version control
- **npm** - Package manager
- **MongoDB Compass** (optional) - Database GUI

## Backend Setup

### 1. Install Dependencies
```bash
cd backend
npm install
```

### 2. Environment Configuration
Create `.env` file from the example:
```bash
cp .env.example .env
```

Edit `.env` with your configuration:
```env
# Database
MONGODB_URI=mongodb://localhost:27017/runner

# JWT Configuration
JWT_SECRET=your_super_secret_jwt_key_here_make_it_long_and_random
JWT_EXPIRES_IN=7d

# OpenAI API
OPENAI_API_KEY=sk-your-openai-api-key-here

# Server Configuration
PORT=3000
NODE_ENV=development

# CORS (add your frontend URLs)
ALLOWED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000
```

### 3. Database Setup

#### Option A: Local MongoDB
1. Install MongoDB Community Edition
2. Start MongoDB service:
   ```bash
   # Windows
   net start MongoDB
   
   # macOS (with Homebrew)
   brew services start mongodb-community
   
   # Linux
   sudo systemctl start mongod
   ```

#### Option B: MongoDB Atlas (Cloud)
1. Create account at [MongoDB Atlas](https://www.mongodb.com/atlas)
2. Create cluster and get connection string
3. Update `MONGODB_URI` in `.env`

### 4. Start Backend Server
```bash
# Development mode (with auto-restart)
npm run dev

# Production mode
npm start
```

Server will start at `http://localhost:3000`

## Running Tests

### Backend Tests
```bash
cd backend

# Run all tests
npm test

# Run tests with coverage report
npm run test -- --coverage

# Run tests in watch mode (development)
npm run test -- --watch

# Run specific test file
npm test auth.test.js

# Run tests matching pattern
npm test -- --testNamePattern="should register user"
```

### Test Database
Tests use in-memory MongoDB (mongodb-memory-server), so no separate database setup is needed.

## iOS App Setup

### 1. Open Project in Xcode
```bash
cd ios/Runner
open Runner.xcodeproj
```

### 2. Configure API Base URL
In `ios/Runner/Runner/Services/APIService.swift`, update the base URL:
```swift
private let baseURL = "http://localhost:3000/api" // Development
// private let baseURL = "https://your-api-domain.com/api" // Production
```

### 3. Build and Run
1. Select target device/simulator in Xcode
2. Press `Cmd+R` to build and run
3. App will launch on selected device/simulator

## API Endpoints Reference

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user
- `PUT /api/auth/profile` - Update profile

### Training Plans
- `POST /api/plans/generate` - Generate AI training plan
- `GET /api/plans/user` - Get user's training plan
- `DELETE /api/plans/:planId` - Delete training plan

### Workouts
- `GET /api/workouts/user` - Get all user workouts
- `GET /api/workouts/upcoming` - Get upcoming workouts
- `GET /api/workouts/:workoutId` - Get specific workout
- `PUT /api/workouts/:workoutId/complete` - Mark workout complete
- `PUT /api/workouts/:workoutId/reschedule` - Reschedule workout

### FIT Files
- `GET /api/fit/:workoutId` - Generate and download FIT file
- `GET /api/fit/download/:fileName` - Download FIT file by name
- `POST /api/fit/cleanup` - Cleanup old FIT files

## Production Deployment

### Backend Deployment Options

#### Option 1: Railway
1. Create account at [Railway](https://railway.app)
2. Connect GitHub repository
3. Add environment variables in Railway dashboard
4. Deploy automatically on git push

#### Option 2: Heroku
1. Install Heroku CLI
2. Create Heroku app:
   ```bash
   heroku create runner-api
   ```
3. Add MongoDB addon:
   ```bash
   heroku addons:create mongolab:sandbox
   ```
4. Set environment variables:
   ```bash
   heroku config:set OPENAI_API_KEY=your-key
   heroku config:set JWT_SECRET=your-secret
   ```
5. Deploy:
   ```bash
   git push heroku main
   ```

#### Option 3: DigitalOcean App Platform
1. Create account at DigitalOcean
2. Create new app from GitHub repository
3. Configure environment variables
4. Deploy with automatic scaling

### iOS App Deployment

#### TestFlight (Beta Testing)
1. Archive app in Xcode (`Product > Archive`)
2. Upload to App Store Connect
3. Add beta testers in TestFlight
4. Distribute for testing

#### App Store Release
1. Complete app metadata in App Store Connect
2. Submit for review
3. Release after approval

## Environment Variables Reference

| Variable | Description | Required | Example |
|----------|-------------|----------|---------|
| `MONGODB_URI` | MongoDB connection string | Yes | `mongodb://localhost:27017/runner` |
| `JWT_SECRET` | Secret for JWT token signing | Yes | `your-super-secret-key` |
| `JWT_EXPIRES_IN` | JWT token expiration | No | `7d` |
| `OPENAI_API_KEY` | OpenAI API key for AI features | Yes | `sk-...` |
| `PORT` | Server port | No | `3000` |
| `NODE_ENV` | Environment mode | No | `production` |
| `ALLOWED_ORIGINS` | CORS allowed origins | No | `https://yourapp.com` |

## Monitoring and Maintenance

### Health Checks
- Backend: `GET /api/health`
- Returns server status and timestamp

### Log Monitoring
```bash
# View server logs
npm start 2>&1 | tee logs/server.log

# Monitor error logs
tail -f logs/error.log
```

### Database Maintenance
```bash
# Backup database
mongodump --uri="mongodb://localhost:27017/runner" --out=backup/

# Restore database
mongorestore --uri="mongodb://localhost:27017/runner" backup/runner/
```

### FIT File Cleanup
The system automatically cleans up FIT files older than 24 hours. Manual cleanup:
```bash
curl -X POST http://localhost:3000/api/fit/cleanup \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## Troubleshooting

### Common Issues

#### Backend won't start
- Check MongoDB is running
- Verify environment variables in `.env`
- Check port 3000 is available

#### Tests failing
- Ensure no other MongoDB instances interfere
- Clear node_modules and reinstall: `rm -rf node_modules && npm install`

#### OpenAI API errors
- Verify API key is valid and has credits
- Check rate limits and quotas

#### iOS build errors
- Clean build folder: `Product > Clean Build Folder`
- Update API base URL for your environment
- Check iOS deployment target compatibility

### Getting Help
- Check logs for detailed error messages
- Verify all environment variables are set
- Ensure all services (MongoDB, OpenAI) are accessible
- Test API endpoints with tools like Postman

## Security Considerations

### Production Security
- Use strong JWT secrets (32+ characters)
- Enable HTTPS in production
- Implement rate limiting
- Validate all inputs
- Keep dependencies updated
- Use environment variables for secrets
- Enable MongoDB authentication
- Implement proper CORS policies

### API Security
- All routes except auth require JWT tokens
- Passwords are hashed with bcrypt
- Input validation on all endpoints
- Rate limiting prevents abuse
- File upload restrictions for security
