# Runner - AI-Powered Running Training App

Runner is an iOS app that generates personalized running training plans using OpenAI, complete with scheduled workouts and .FIT files.

## Features

- **User Input Collection**: Distance (1-43km or miles), time, and max distance
- **AI-Powered Training Plans**: OpenAI generates personalized running plans
- **User Authentication**: Secure sign-up and login system
- **Workout Scheduling**: View and manage scheduled workouts
- **FIT File Generation**: Export workouts as .FIT files for fitness devices
- **Modern iOS UI**: Built with SwiftUI

## Architecture

### iOS App (SwiftUI)
- User authentication and registration
- Input forms for running data
- Training plan and workout display
- .FIT file export functionality

### Backend API (Node.js/Express)
- User authentication and data management
- OpenAI integration for plan generation
- .FIT file creation and storage
- RESTful API endpoints

### Database
- User profiles and authentication
- Running data and preferences
- Generated training plans
- Workout schedules

## Setup Instructions

### Prerequisites
- Xcode 14+ (for iOS development)
- Node.js 18+ (for backend)
- OpenAI API key

### Backend Setup
1. Navigate to the `backend` directory
2. Install dependencies: `npm install`
3. Set up environment variables in `.env`
4. Run the server: `npm start`

### iOS App Setup
1. Open `Runner.xcodeproj` in Xcode
2. Update the API base URL in `Config.swift`
3. Build and run on simulator or device

## API Endpoints

- `POST /auth/register` - User registration
- `POST /auth/login` - User login
- `POST /plans/generate` - Generate training plan
- `GET /plans/:userId` - Get user's training plan
- `GET /workouts/:userId` - Get scheduled workouts
- `GET /fit/:workoutId` - Download .FIT file

## Environment Variables

```
OPENAI_API_KEY=your_openai_api_key
JWT_SECRET=your_jwt_secret
DATABASE_URL=your_database_connection_string
```

## Development Notes

- Developed on Windows for iOS deployment
- Uses OpenAI GPT for intelligent training plan generation
- .FIT files compatible with Garmin, Strava, and other fitness platforms
- Secure JWT-based authentication
