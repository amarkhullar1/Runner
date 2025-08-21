import SwiftUI

struct ContentView: View {
    @StateObject private var authManager = AuthenticationManager()
    
    var body: some View {
        NavigationView {
            if authManager.isAuthenticated {
                MainTabView()
                    .environmentObject(authManager)
            } else {
                AuthenticationView()
                    .environmentObject(authManager)
            }
        }
    }
}

struct MainTabView: View {
    @EnvironmentObject var authManager: AuthenticationManager
    
    var body: some View {
        TabView {
            InputView()
                .tabItem {
                    Image(systemName: "figure.run")
                    Text("Input")
                }
            
            PlanView()
                .tabItem {
                    Image(systemName: "calendar")
                    Text("Plan")
                }
            
            WorkoutsView()
                .tabItem {
                    Image(systemName: "list.bullet")
                    Text("Workouts")
                }
            
            ProfileView()
                .tabItem {
                    Image(systemName: "person")
                    Text("Profile")
                }
        }
        .environmentObject(authManager)
    }
}

#Preview {
    ContentView()
}
