import SwiftUI

struct WorkoutDetailView: View {
    let workout: Workout
    @Environment(\.presentationMode) var presentationMode
    @State private var isDownloadingFit = false
    @State private var showingShareSheet = false
    @State private var fitFileData: Data?
    
    var body: some View {
        NavigationView {
            ScrollView {
                VStack(alignment: .leading, spacing: 20) {
                    // Header
                    VStack(alignment: .leading, spacing: 8) {
                        HStack {
                            Image(systemName: workout.type.icon)
                                .font(.title)
                                .foregroundColor(.blue)
                            
                            VStack(alignment: .leading) {
                                Text(workout.title)
                                    .font(.title2)
                                    .fontWeight(.bold)
                                
                                Text(workout.type.displayName)
                                    .font(.subheadline)
                                    .foregroundColor(.secondary)
                            }
                            
                            Spacer()
                            
                            if workout.completed {
                                Image(systemName: "checkmark.circle.fill")
                                    .font(.title)
                                    .foregroundColor(.green)
                            }
                        }
                        
                        Text(workout.description)
                            .font(.body)
                            .foregroundColor(.secondary)
                    }
                    
                    // Workout Stats
                    LazyVGrid(columns: [
                        GridItem(.flexible()),
                        GridItem(.flexible()),
                        GridItem(.flexible())
                    ], spacing: 16) {
                        StatCard(title: "Duration", value: "\(workout.duration) min", icon: "clock")
                        
                        if let distance = workout.distance {
                            StatCard(title: "Distance", value: "\(String(format: "%.1f", distance)) km", icon: "location")
                        }
                        
                        StatCard(title: "Intensity", value: workout.intensity.displayName, icon: "heart.fill")
                    }
                    
                    // Instructions
                    if !workout.instructions.isEmpty {
                        VStack(alignment: .leading, spacing: 12) {
                            Text("Instructions")
                                .font(.headline)
                            
                            ForEach(Array(workout.instructions.enumerated()), id: \.offset) { index, instruction in
                                HStack(alignment: .top) {
                                    Text("\(index + 1).")
                                        .fontWeight(.semibold)
                                        .foregroundColor(.blue)
                                    Text(instruction)
                                        .font(.body)
                                }
                            }
                        }
                        .padding()
                        .background(Color(.systemGray6))
                        .cornerRadius(12)
                    }
                    
                    // FIT File Download
                    if workout.fitFileUrl != nil {
                        Button(action: downloadFitFile) {
                            HStack {
                                if isDownloadingFit {
                                    ProgressView()
                                        .progressViewStyle(CircularProgressViewStyle(tint: .white))
                                } else {
                                    Image(systemName: "arrow.down.doc")
                                    Text("Download .FIT File")
                                        .fontWeight(.semibold)
                                }
                            }
                        }
                        .frame(maxWidth: .infinity)
                        .frame(height: 50)
                        .background(Color.blue)
                        .foregroundColor(.white)
                        .cornerRadius(10)
                        .disabled(isDownloadingFit)
                    }
                }
                .padding()
            }
            .navigationTitle("Workout Details")
            .navigationBarTitleDisplayMode(.inline)
            .navigationBarItems(trailing: Button("Done") {
                presentationMode.wrappedValue.dismiss()
            })
            .sheet(isPresented: $showingShareSheet) {
                if let data = fitFileData {
                    ShareSheet(items: [data])
                }
            }
        }
    }
    
    private func downloadFitFile() {
        isDownloadingFit = true
        
        Task {
            do {
                let apiService = APIService()
                let data = try await apiService.downloadFitFile(workoutId: workout.id)
                
                await MainActor.run {
                    self.fitFileData = data
                    self.isDownloadingFit = false
                    self.showingShareSheet = true
                }
            } catch {
                await MainActor.run {
                    self.isDownloadingFit = false
                    // Handle error - could show alert
                }
            }
        }
    }
}

struct StatCard: View {
    let title: String
    let value: String
    let icon: String
    
    var body: some View {
        VStack(spacing: 8) {
            Image(systemName: icon)
                .font(.title2)
                .foregroundColor(.blue)
            
            Text(value)
                .font(.headline)
                .fontWeight(.semibold)
            
            Text(title)
                .font(.caption)
                .foregroundColor(.secondary)
        }
        .padding()
        .background(Color(.systemGray6))
        .cornerRadius(12)
    }
}

struct ShareSheet: UIViewControllerRepresentable {
    let items: [Any]
    
    func makeUIViewController(context: Context) -> UIActivityViewController {
        UIActivityViewController(activityItems: items, applicationActivities: nil)
    }
    
    func updateUIViewController(_ uiViewController: UIActivityViewController, context: Context) {}
}

#Preview {
    WorkoutDetailView(workout: Workout(
        id: "1",
        planId: "plan1",
        title: "Easy Run",
        description: "Comfortable pace run to build aerobic base",
        type: .easy,
        duration: 30,
        distance: 5.0,
        intensity: .low,
        scheduledDate: Date(),
        completed: false,
        instructions: ["Warm up with 5 minutes of walking", "Run at conversational pace", "Cool down with 5 minutes of walking"],
        fitFileUrl: "https://example.com/fit/1"
    ))
}
