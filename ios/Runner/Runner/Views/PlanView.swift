import SwiftUI

struct PlanView: View {
    @State private var trainingPlan: TrainingPlan?
    @State private var isLoading = false
    @State private var errorMessage: String?
    
    var body: some View {
        NavigationView {
            Group {
                if isLoading {
                    VStack {
                        ProgressView()
                        Text("Loading your training plan...")
                            .foregroundColor(.secondary)
                            .padding(.top)
                    }
                } else if let plan = trainingPlan {
                    ScrollView {
                        VStack(alignment: .leading, spacing: 20) {
                            // Plan Header
                            VStack(alignment: .leading, spacing: 8) {
                                Text(plan.title)
                                    .font(.title)
                                    .fontWeight(.bold)
                                
                                Text(plan.description)
                                    .font(.body)
                                    .foregroundColor(.secondary)
                                
                                HStack {
                                    Label("\(plan.duration) weeks", systemImage: "calendar")
                                    Spacer()
                                    Label(plan.difficulty.displayName, systemImage: "star.fill")
                                        .foregroundColor(.orange)
                                }
                                .font(.caption)
                                .foregroundColor(.secondary)
                            }
                            .padding()
                            .background(Color(.systemGray6))
                            .cornerRadius(12)
                            
                            // Goals Section
                            if !plan.goals.isEmpty {
                                VStack(alignment: .leading, spacing: 8) {
                                    Text("Training Goals")
                                        .font(.headline)
                                    
                                    ForEach(plan.goals, id: \.self) { goal in
                                        HStack {
                                            Image(systemName: "target")
                                                .foregroundColor(.blue)
                                            Text(goal)
                                                .font(.body)
                                        }
                                    }
                                }
                                .padding()
                                .background(Color(.systemGray6))
                                .cornerRadius(12)
                            }
                            
                            // Weekly Overview
                            VStack(alignment: .leading, spacing: 12) {
                                Text("Weekly Overview")
                                    .font(.headline)
                                
                                let groupedWorkouts = Dictionary(grouping: plan.workouts) { workout in
                                    Calendar.current.component(.weekOfYear, from: workout.scheduledDate ?? Date())
                                }
                                
                                ForEach(groupedWorkouts.keys.sorted(), id: \.self) { week in
                                    WeeklyWorkoutCard(
                                        weekNumber: week,
                                        workouts: groupedWorkouts[week] ?? []
                                    )
                                }
                            }
                        }
                        .padding()
                    }
                } else {
                    VStack(spacing: 20) {
                        Image(systemName: "doc.text")
                            .font(.system(size: 60))
                            .foregroundColor(.gray)
                        
                        Text("No Training Plan Yet")
                            .font(.title2)
                            .fontWeight(.semibold)
                        
                        Text("Generate your personalized training plan in the Input tab")
                            .font(.body)
                            .foregroundColor(.secondary)
                            .multilineTextAlignment(.center)
                        
                        if let error = errorMessage {
                            Text("Error: \(error)")
                                .foregroundColor(.red)
                                .font(.caption)
                        }
                    }
                    .padding()
                }
            }
            .navigationTitle("Training Plan")
            .onAppear {
                loadTrainingPlan()
            }
            .refreshable {
                loadTrainingPlan()
            }
        }
    }
    
    private func loadTrainingPlan() {
        isLoading = true
        errorMessage = nil
        
        Task {
            do {
                let apiService = APIService()
                let plan = try await apiService.getUserPlan()
                
                await MainActor.run {
                    self.trainingPlan = plan
                    self.isLoading = false
                }
            } catch {
                await MainActor.run {
                    self.errorMessage = error.localizedDescription
                    self.isLoading = false
                }
            }
        }
    }
}

struct WeeklyWorkoutCard: View {
    let weekNumber: Int
    let workouts: [Workout]
    
    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("Week \(weekNumber)")
                .font(.subheadline)
                .fontWeight(.semibold)
                .foregroundColor(.blue)
            
            LazyVGrid(columns: [
                GridItem(.flexible()),
                GridItem(.flexible())
            ], spacing: 8) {
                ForEach(workouts) { workout in
                    WorkoutMiniCard(workout: workout)
                }
            }
        }
        .padding()
        .background(Color(.systemGray6))
        .cornerRadius(12)
    }
}

struct WorkoutMiniCard: View {
    let workout: Workout
    
    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            HStack {
                Image(systemName: workout.type.icon)
                    .foregroundColor(.blue)
                Text(workout.type.displayName)
                    .font(.caption)
                    .fontWeight(.medium)
                Spacer()
            }
            
            if let distance = workout.distance {
                Text("\(String(format: "%.1f", distance)) km")
                    .font(.caption2)
                    .foregroundColor(.secondary)
            }
            
            Text("\(workout.duration) min")
                .font(.caption2)
                .foregroundColor(.secondary)
        }
        .padding(8)
        .background(Color.white)
        .cornerRadius(8)
        .overlay(
            RoundedRectangle(cornerRadius: 8)
                .stroke(workout.completed ? Color.green : Color.clear, lineWidth: 2)
        )
    }
}

#Preview {
    PlanView()
}
