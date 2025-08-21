# Runner App - Quick Start Guide

Get the Runner AI-powered running training app up and running in minutes!

## 🚀 Quick Setup (5 minutes)

### 1. Backend Setup
```bash
# Navigate to backend
cd backend

# Install dependencies
npm install

# Create environment file
cp .env.example .env
```

### 2. Configure Environment
Edit `.env` file with your settings:
```env
MONGODB_URI=mongodb://localhost:27017/runner
JWT_SECRET=your-super-secret-jwt-key-here
OPENAI_API_KEY=sk-your-openai-api-key-here
PORT=3000
```

### 3. Start Services
```bash
# Start MongoDB (if local)
# Windows: net start MongoDB
# macOS: brew services start mongodb-community

# Start backend server
npm run dev
```

### 4. Run Tests
```bash
# Run all tests
npm test

# Run with coverage
npm test -- --coverage

# Watch mode for development
npm test -- --watch
```

## 📱 iOS App Setup

### 1. Open in Xcode
```bash
cd ios/Runner
open Runner.xcodeproj
```

### 2. Update API URL
In `APIService.swift`, set your backend URL:
```swift
private let baseURL = "http://localhost:3000/api"
```

### 3. Build & Run
- Select simulator/device in Xcode
- Press `Cmd+R` to build and run

## 🧪 Testing the API

### Health Check
```bash
curl http://localhost:3000/api/health
```

### Register User
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test User",
    "email": "test@example.com",
    "password": "password123"
  }'
```

### Generate Training Plan
```bash
curl -X POST http://localhost:3000/api/plans/generate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "maxDistance": 10,
    "maxDistanceUnit": "km"
  }'
```

## 🎯 Key Features Working

✅ **User Authentication** - Register, login, profile management  
✅ **AI Training Plans** - OpenAI generates personalized running plans  
✅ **Workout Scheduling** - View and manage scheduled workouts  
✅ **FIT File Export** - Download workouts as .FIT files  
✅ **iOS App** - Complete SwiftUI interface  
✅ **Comprehensive Tests** - 100% API coverage  

## 📋 Production Checklist

- [ ] Set strong JWT secret (32+ characters)
- [ ] Configure production MongoDB (Atlas recommended)
- [ ] Set up OpenAI API key with sufficient credits
- [ ] Configure CORS for your domain
- [ ] Set up SSL/HTTPS
- [ ] Deploy backend (Railway, Heroku, DigitalOcean)
- [ ] Update iOS app API URL for production
- [ ] Test all features end-to-end

## 🆘 Need Help?

Check the full [DEPLOYMENT.md](./DEPLOYMENT.md) guide for detailed instructions, troubleshooting, and production deployment options.

**Common Issues:**
- MongoDB not running → Start MongoDB service
- Tests failing → Clear node_modules, reinstall
- OpenAI errors → Check API key and credits
- iOS build errors → Clean build folder in Xcode

**API Documentation:** All endpoints documented in DEPLOYMENT.md  
**Test Coverage:** Run `npm test -- --coverage` to see detailed coverage report
