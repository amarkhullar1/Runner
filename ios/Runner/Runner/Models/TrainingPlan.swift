import Foundation

struct TrainingPlan: Codable, Identifiable {
    let id: String
    let userId: String
    let title: String
    let description: String
    let duration: Int // weeks
    let difficulty: DifficultyLevel
    let goals: [String]
    let workouts: [Workout]
    let createdAt: Date
    let updatedAt: Date
}

struct Workout: Codable, Identifiable {
    let id: String
    let planId: String
    let title: String
    let description: String
    let type: WorkoutType
    let duration: Int // minutes
    let distance: Double? // km
    let intensity: IntensityLevel
    let scheduledDate: Date?
    let completed: Bool
    let instructions: [String]
    let fitFileUrl: String?
}

enum DifficultyLevel: String, CaseIterable, Codable {
    case beginner = "beginner"
    case intermediate = "intermediate"
    case advanced = "advanced"
    
    var displayName: String {
        switch self {
        case .beginner:
            return "Beginner"
        case .intermediate:
            return "Intermediate"
        case .advanced:
            return "Advanced"
        }
    }
}

enum WorkoutType: String, CaseIterable, Codable {
    case easy = "easy"
    case tempo = "tempo"
    case interval = "interval"
    case longRun = "long_run"
    case recovery = "recovery"
    case race = "race"
    case crossTraining = "cross_training"
    
    var displayName: String {
        switch self {
        case .easy:
            return "Easy Run"
        case .tempo:
            return "Tempo Run"
        case .interval:
            return "Interval Training"
        case .longRun:
            return "Long Run"
        case .recovery:
            return "Recovery Run"
        case .race:
            return "Race"
        case .crossTraining:
            return "Cross Training"
        }
    }
    
    var icon: String {
        switch self {
        case .easy:
            return "figure.walk"
        case .tempo:
            return "figure.run"
        case .interval:
            return "timer"
        case .longRun:
            return "figure.run.circle"
        case .recovery:
            return "heart.fill"
        case .race:
            return "flag.fill"
        case .crossTraining:
            return "dumbbell.fill"
        }
    }
}

enum IntensityLevel: String, CaseIterable, Codable {
    case low = "low"
    case moderate = "moderate"
    case high = "high"
    case maximum = "maximum"
    
    var displayName: String {
        switch self {
        case .low:
            return "Low"
        case .moderate:
            return "Moderate"
        case .high:
            return "High"
        case .maximum:
            return "Maximum"
        }
    }
    
    var color: String {
        switch self {
        case .low:
            return "green"
        case .moderate:
            return "yellow"
        case .high:
            return "orange"
        case .maximum:
            return "red"
        }
    }
}
