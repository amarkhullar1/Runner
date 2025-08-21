import Foundation

struct User: Codable, Identifiable {
    let id: String
    let email: String
    let name: String
    let createdAt: Date
}

struct UserRegistration: Codable {
    let name: String
    let email: String
    let password: String
}

struct UserLogin: Codable {
    let email: String
    let password: String
}

struct AuthResponse: Codable {
    let user: User
    let token: String
}

struct RunningData: Codable {
    let distance: Double?
    let distanceUnit: DistanceUnit
    let time: TimeComponents?
    let maxDistance: Double
    let maxDistanceUnit: DistanceUnit
}

struct TimeComponents: Codable {
    let hours: Int
    let minutes: Int
}

enum DistanceUnit: String, CaseIterable, Codable {
    case kilometers = "km"
    case miles = "miles"
    
    var displayName: String {
        switch self {
        case .kilometers:
            return "Kilometers"
        case .miles:
            return "Miles"
        }
    }
}
