# Local Deployment Options for Runner App

Since MongoDB isn't installed locally, here are your deployment options:

## Option 1: MongoDB Atlas (Cloud) - RECOMMENDED ⭐

### Steps:
1. Go to [MongoDB Atlas](https://www.mongodb.com/atlas) and create a free account
2. Create a new cluster (free tier available)
3. Create a database user with username/password
4. Get your connection string
5. Update `.env` file with your connection string:

```env
MONGODB_URI=mongodb+srv://your-username:your-password@cluster0.xxxxx.mongodb.net/runner?retryWrites=true&w=majority
```

### Pros:
- ✅ No local installation required
- ✅ Free tier available (512MB)
- ✅ Production-ready
- ✅ Automatic backups

## Option 2: Install MongoDB Locally

### Windows Installation:
1. Download MongoDB Community Server from [mongodb.com](https://www.mongodb.com/try/download/community)
2. Run the installer and follow setup wizard
3. Start MongoDB service:
   ```bash
   net start MongoDB
   ```
4. Use local connection string:
   ```env
   MONGODB_URI=mongodb://localhost:27017/runner
   ```

## Option 3: Docker MongoDB (If Docker is installed)

### Steps:
1. Run MongoDB in Docker:
   ```bash
   docker run -d -p 27017:27017 --name mongodb mongo:latest
   ```
2. Use local connection string:
   ```env
   MONGODB_URI=mongodb://localhost:27017/runner
   ```

## Option 4: Test-Only Deployment (Current Working Solution)

Since the tests use in-memory MongoDB and are passing, you can:

1. **Run tests to verify functionality:**
   ```bash
   cd backend
   npm test
   ```

2. **Use the iOS simulator with mock data** for development

3. **Deploy to production** with MongoDB Atlas when ready

## Current Status

✅ **Backend dependencies installed**  
✅ **Environment configured**  
✅ **Tests passing** (using in-memory MongoDB)  
❌ **Server needs database connection**  

## Quick Start with MongoDB Atlas

1. **Sign up at MongoDB Atlas** (5 minutes)
2. **Create cluster and get connection string**
3. **Update `.env` file** with your connection string
4. **Start server:**
   ```bash
   npm start
   ```

## Alternative: Continue with Tests Only

If you want to proceed without setting up MongoDB right now:

```bash
# Run all tests to verify backend functionality
npm test

# Tests use in-memory MongoDB and verify:
# - User authentication
# - Training plan generation (mocked OpenAI)
# - Workout management
# - FIT file generation
```

The tests confirm your backend is fully functional and ready for deployment once you add a database connection.
