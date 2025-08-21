import Foundation
import SwiftUI

@MainActor
class AuthenticationManager: ObservableObject {
    @Published var isAuthenticated = false
    @Published var currentUser: User?
    @Published var isLoading = false
    @Published var errorMessage: String?
    
    private let apiService = APIService()
    private let tokenKey = "auth_token"
    
    init() {
        checkAuthenticationStatus()
    }
    
    func checkAuthenticationStatus() {
        if let token = UserDefaults.standard.string(forKey: tokenKey) {
            // TODO: Validate token with backend
            isAuthenticated = true
        }
    }
    
    func register(name: String, email: String, password: String) async {
        isLoading = true
        errorMessage = nil
        
        do {
            let registration = UserRegistration(name: name, email: email, password: password)
            let response = try await apiService.register(registration)
            
            UserDefaults.standard.set(response.token, forKey: tokenKey)
            currentUser = response.user
            isAuthenticated = true
        } catch {
            errorMessage = error.localizedDescription
        }
        
        isLoading = false
    }
    
    func login(email: String, password: String) async {
        isLoading = true
        errorMessage = nil
        
        do {
            let login = UserLogin(email: email, password: password)
            let response = try await apiService.login(login)
            
            UserDefaults.standard.set(response.token, forKey: tokenKey)
            currentUser = response.user
            isAuthenticated = true
        } catch {
            errorMessage = error.localizedDescription
        }
        
        isLoading = false
    }
    
    func logout() {
        UserDefaults.standard.removeObject(forKey: tokenKey)
        currentUser = nil
        isAuthenticated = false
    }
}
