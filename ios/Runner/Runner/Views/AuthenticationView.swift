import SwiftUI

struct AuthenticationView: View {
    @EnvironmentObject var authManager: AuthenticationManager
    @State private var isLoginMode = true
    @State private var name = ""
    @State private var email = ""
    @State private var password = ""
    @State private var confirmPassword = ""
    
    var body: some View {
        VStack(spacing: 20) {
            // Logo and Title
            VStack(spacing: 10) {
                Image(systemName: "figure.run.circle.fill")
                    .font(.system(size: 80))
                    .foregroundColor(.blue)
                
                Text("Runner")
                    .font(.largeTitle)
                    .fontWeight(.bold)
                
                Text("AI-Powered Running Training")
                    .font(.subheadline)
                    .foregroundColor(.secondary)
            }
            .padding(.bottom, 30)
            
            // Form
            VStack(spacing: 16) {
                if !isLoginMode {
                    TextField("Full Name", text: $name)
                        .textFieldStyle(RoundedBorderTextFieldStyle())
                        .autocapitalization(.words)
                }
                
                TextField("Email", text: $email)
                    .textFieldStyle(RoundedBorderTextFieldStyle())
                    .autocapitalization(.none)
                    .keyboardType(.emailAddress)
                
                SecureField("Password", text: $password)
                    .textFieldStyle(RoundedBorderTextFieldStyle())
                
                if !isLoginMode {
                    SecureField("Confirm Password", text: $confirmPassword)
                        .textFieldStyle(RoundedBorderTextFieldStyle())
                }
            }
            .padding(.horizontal)
            
            // Error Message
            if let errorMessage = authManager.errorMessage {
                Text(errorMessage)
                    .foregroundColor(.red)
                    .font(.caption)
                    .multilineTextAlignment(.center)
                    .padding(.horizontal)
            }
            
            // Action Button
            Button(action: {
                Task {
                    if isLoginMode {
                        await authManager.login(email: email, password: password)
                    } else {
                        await authManager.register(name: name, email: email, password: password)
                    }
                }
            }) {
                if authManager.isLoading {
                    ProgressView()
                        .progressViewStyle(CircularProgressViewStyle(tint: .white))
                } else {
                    Text(isLoginMode ? "Sign In" : "Sign Up")
                        .fontWeight(.semibold)
                }
            }
            .frame(maxWidth: .infinity)
            .frame(height: 50)
            .background(Color.blue)
            .foregroundColor(.white)
            .cornerRadius(10)
            .padding(.horizontal)
            .disabled(authManager.isLoading || !isFormValid)
            
            // Toggle Mode
            Button(action: {
                isLoginMode.toggle()
                authManager.errorMessage = nil
            }) {
                Text(isLoginMode ? "Don't have an account? Sign Up" : "Already have an account? Sign In")
                    .font(.footnote)
                    .foregroundColor(.blue)
            }
            
            Spacer()
        }
        .padding()
    }
    
    private var isFormValid: Bool {
        if isLoginMode {
            return !email.isEmpty && !password.isEmpty
        } else {
            return !name.isEmpty && !email.isEmpty && !password.isEmpty && password == confirmPassword
        }
    }
}

#Preview {
    AuthenticationView()
        .environmentObject(AuthenticationManager())
}
