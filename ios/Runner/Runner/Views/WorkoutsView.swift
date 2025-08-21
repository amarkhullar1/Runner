import SwiftUI

struct WorkoutsView: View {
    @State private var workouts: [Workout] = []
    @State private var isLoading = false
    @State private var errorMessage: String?
    @State private var selectedWorkout: Workout?
    @State private var showingWorkoutDetail = false
    
    var body: some View {
        NavigationView {
            Group {
                if isLoading {
                    VStack {
                        ProgressView()
                        Text("Loading workouts...")
                            .foregroundColor(.secondary)
                            .padding(.top)
                    }
                } else if workouts.isEmpty {
                    VStack(spacing: 20) {
                        Image(systemName: "calendar.badge.exclamationmark")
                            .font(.system(size: 60))
                            .foregroundColor(.gray)
                        
                        Text("No Workouts Scheduled")
                            .font(.title2)
                            .fontWeight(.semibold)
                        
                        Text("Generate a training plan first to see your scheduled workouts")
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
                } else {
                    List {
                        ForEach(groupedWorkouts.keys.sorted(), id: \.self) { date in
                            Section(header: Text(formatDate(date))) {
                                ForEach(groupedWorkouts[date] ?? []) { workout in
                                    WorkoutRow(workout: workout) {
                                        selectedWorkout = workout
                                        showingWorkoutDetail = true
                                    }
                                }
                            }
                        }
                    }
                    .listStyle(InsetGroupedListStyle())
                }
            }
            .navigationTitle("Workouts")
            .onAppear {
                loadWorkouts()
            }
            .refreshable {
                loadWorkouts()
            }
            .sheet(isPresented: $showingWorkoutDetail) {
                if let workout = selectedWorkout {
                    WorkoutDetailView(workout: workout)
                }
            }
        }
    }
    
    private var groupedWorkouts: [String: [Workout]] {
        Dictionary(grouping: workouts) { workout in
            let date = workout.scheduledDate ?? Date()
            return DateFormatter.dayFormatter.string(from: date)
        }
    }
    
    private func formatDate(_ dateString: String) -> String {
        let formatter = DateFormatter.dayFormatter
        if let date = formatter.date(from: dateString) {
            let displayFormatter = DateFormatter()
            displayFormatter.dateStyle = .full
            return displayFormatter.string(from: date)
        }
        return dateString
    }
    
    private func loadWorkouts() {
        isLoading = true
        errorMessage = nil
        
        Task {
            do {
                let apiService = APIService()
                let fetchedWorkouts = try await apiService.getUserWorkouts()
                
                await MainActor.run {
                    self.workouts = fetchedWorkouts.sorted { 
                        ($0.scheduledDate ?? Date.distantPast) < ($1.scheduledDate ?? Date.distantPast)
                    }
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

struct WorkoutRow: View {
    let workout: Workout
    let onTap: () -> Void
    
    var body: some View {
        Button(action: onTap) {
            HStack {
                VStack(alignment: .leading, spacing: 4) {
                    HStack {
                        Image(systemName: workout.type.icon)
                            .foregroundColor(.blue)
                        Text(workout.title)
                            .font(.headline)
                            .foregroundColor(.primary)
                    }
                    
                    Text(workout.description)
                        .font(.subheadline)
                        .foregroundColor(.secondary)
                        .lineLimit(2)
                    
                    HStack {
                        if let distance = workout.distance {
                            Label("\(String(format: "%.1f", distance)) km", systemImage: "location")
                        }
                        Label("\(workout.duration) min", systemImage: "clock")
                        Label(workout.intensity.displayName, systemImage: "heart.fill")
                            .foregroundColor(colorForIntensity(workout.intensity))
                    }
                    .font(.caption)
                    .foregroundColor(.secondary)
                }
                
                Spacer()
                
                VStack {
                    if workout.completed {
                        Image(systemName: "checkmark.circle.fill")
                            .foregroundColor(.green)
                            .font(.title2)
                    } else {
                        Image(systemName: "circle")
                            .foregroundColor(.gray)
                            .font(.title2)
                    }
                    
                    if workout.fitFileUrl != nil {
                        Image(systemName: "doc.badge.arrow.up")
                            .foregroundColor(.blue)
                            .font(.caption)
                    }
                }
            }
            .padding(.vertical, 4)
        }
        .buttonStyle(PlainButtonStyle())
    }
    
    private func colorForIntensity(_ intensity: IntensityLevel) -> Color {
        switch intensity {
        case .low: return .green
        case .moderate: return .yellow
        case .high: return .orange
        case .maximum: return .red
        }
    }
}

extension DateFormatter {
    static let dayFormatter: DateFormatter = {
        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy-MM-dd"
        return formatter
    }()
}

#Preview {
    WorkoutsView()
}
