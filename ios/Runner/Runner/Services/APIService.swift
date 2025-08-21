import Foundation

class APIService {
    private let baseURL = "http://localhost:3000/api" // Update this with your backend URL
    private let session = URLSession.shared
    
    enum APIError: Error, LocalizedError {
        case invalidURL
        case noData
        case decodingError
        case serverError(String)
        
        var errorDescription: String? {
            switch self {
            case .invalidURL:
                return "Invalid URL"
            case .noData:
                return "No data received"
            case .decodingError:
                return "Failed to decode response"
            case .serverError(let message):
                return message
            }
        }
    }
    
    // MARK: - Authentication
    
    func register(_ registration: UserRegistration) async throws -> AuthResponse {
        guard let url = URL(string: "\(baseURL)/auth/register") else {
            throw APIError.invalidURL
        }
        
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.httpBody = try JSONEncoder().encode(registration)
        
        let (data, response) = try await session.data(for: request)
        
        if let httpResponse = response as? HTTPURLResponse, httpResponse.statusCode != 200 {
            if let errorData = try? JSONDecoder().decode([String: String].self, from: data),
               let message = errorData["message"] {
                throw APIError.serverError(message)
            }
            throw APIError.serverError("Registration failed")
        }
        
        guard !data.isEmpty else { throw APIError.noData }
        
        do {
            return try JSONDecoder().decode(AuthResponse.self, from: data)
        } catch {
            throw APIError.decodingError
        }
    }
    
    func login(_ login: UserLogin) async throws -> AuthResponse {
        guard let url = URL(string: "\(baseURL)/auth/login") else {
            throw APIError.invalidURL
        }
        
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.httpBody = try JSONEncoder().encode(login)
        
        let (data, response) = try await session.data(for: request)
        
        if let httpResponse = response as? HTTPURLResponse, httpResponse.statusCode != 200 {
            if let errorData = try? JSONDecoder().decode([String: String].self, from: data),
               let message = errorData["message"] {
                throw APIError.serverError(message)
            }
            throw APIError.serverError("Login failed")
        }
        
        guard !data.isEmpty else { throw APIError.noData }
        
        do {
            return try JSONDecoder().decode(AuthResponse.self, from: data)
        } catch {
            throw APIError.decodingError
        }
    }
    
    // MARK: - Training Plans
    
    func generatePlan(runningData: RunningData) async throws -> TrainingPlan {
        guard let url = URL(string: "\(baseURL)/plans/generate") else {
            throw APIError.invalidURL
        }
        
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue("Bearer \(getAuthToken())", forHTTPHeaderField: "Authorization")
        request.httpBody = try JSONEncoder().encode(runningData)
        
        let (data, response) = try await session.data(for: request)
        
        if let httpResponse = response as? HTTPURLResponse, httpResponse.statusCode != 200 {
            if let errorData = try? JSONDecoder().decode([String: String].self, from: data),
               let message = errorData["message"] {
                throw APIError.serverError(message)
            }
            throw APIError.serverError("Plan generation failed")
        }
        
        guard !data.isEmpty else { throw APIError.noData }
        
        do {
            return try JSONDecoder().decode(TrainingPlan.self, from: data)
        } catch {
            throw APIError.decodingError
        }
    }
    
    func getUserPlan() async throws -> TrainingPlan? {
        guard let url = URL(string: "\(baseURL)/plans/user") else {
            throw APIError.invalidURL
        }
        
        var request = URLRequest(url: url)
        request.setValue("Bearer \(getAuthToken())", forHTTPHeaderField: "Authorization")
        
        let (data, response) = try await session.data(for: request)
        
        if let httpResponse = response as? HTTPURLResponse {
            if httpResponse.statusCode == 404 {
                return nil // No plan found
            } else if httpResponse.statusCode != 200 {
                throw APIError.serverError("Failed to fetch plan")
            }
        }
        
        guard !data.isEmpty else { return nil }
        
        do {
            return try JSONDecoder().decode(TrainingPlan.self, from: data)
        } catch {
            throw APIError.decodingError
        }
    }
    
    // MARK: - Workouts
    
    func getUserWorkouts() async throws -> [Workout] {
        guard let url = URL(string: "\(baseURL)/workouts/user") else {
            throw APIError.invalidURL
        }
        
        var request = URLRequest(url: url)
        request.setValue("Bearer \(getAuthToken())", forHTTPHeaderField: "Authorization")
        
        let (data, response) = try await session.data(for: request)
        
        if let httpResponse = response as? HTTPURLResponse, httpResponse.statusCode != 200 {
            throw APIError.serverError("Failed to fetch workouts")
        }
        
        guard !data.isEmpty else { return [] }
        
        do {
            return try JSONDecoder().decode([Workout].self, from: data)
        } catch {
            throw APIError.decodingError
        }
    }
    
    func downloadFitFile(workoutId: String) async throws -> Data {
        guard let url = URL(string: "\(baseURL)/fit/\(workoutId)") else {
            throw APIError.invalidURL
        }
        
        var request = URLRequest(url: url)
        request.setValue("Bearer \(getAuthToken())", forHTTPHeaderField: "Authorization")
        
        let (data, response) = try await session.data(for: request)
        
        if let httpResponse = response as? HTTPURLResponse, httpResponse.statusCode != 200 {
            throw APIError.serverError("Failed to download FIT file")
        }
        
        return data
    }
    
    // MARK: - Helper Methods
    
    private func getAuthToken() -> String {
        return UserDefaults.standard.string(forKey: "auth_token") ?? ""
    }
}
