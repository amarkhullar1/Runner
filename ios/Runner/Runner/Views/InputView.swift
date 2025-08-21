import SwiftUI

struct InputView: View {
    @State private var distance: String = ""
    @State private var distanceUnit: DistanceUnit = .kilometers
    @State private var hours: Int = 0
    @State private var minutes: Int = 0
    @State private var maxDistance: String = ""
    @State private var maxDistanceUnit: DistanceUnit = .kilometers
    @State private var isLoading = false
    @State private var showingAlert = false
    @State private var alertMessage = ""
    
    var body: some View {
        NavigationView {
            ScrollView {
                VStack(spacing: 24) {
                    // Header
                    VStack(spacing: 8) {
                        Image(systemName: "figure.run")
                            .font(.system(size: 50))
                            .foregroundColor(.blue)
                        
                        Text("Tell us about your running")
                            .font(.title2)
                            .fontWeight(.semibold)
                        
                        Text("Help us create your personalized training plan")
                            .font(.subheadline)
                            .foregroundColor(.secondary)
                            .multilineTextAlignment(.center)
                    }
                    .padding(.top)
                    
                    VStack(spacing: 20) {
                        // Distance Input (Optional)
                        VStack(alignment: .leading, spacing: 8) {
                            HStack {
                                Text("Recent Running Distance")
                                    .font(.headline)
                                Text("(Optional)")
                                    .font(.caption)
                                    .foregroundColor(.secondary)
                                Spacer()
                            }
                            
                            HStack {
                                TextField("Enter distance", text: $distance)
                                    .textFieldStyle(RoundedBorderTextFieldStyle())
                                    .keyboardType(.decimalPad)
                                
                                Picker("Unit", selection: $distanceUnit) {
                                    ForEach(DistanceUnit.allCases, id: \.self) { unit in
                                        Text(unit.rawValue).tag(unit)
                                    }
                                }
                                .pickerStyle(SegmentedPickerStyle())
                                .frame(width: 120)
                            }
                            
                            Text("Distance range: 1-43 \(distanceUnit.rawValue)")
                                .font(.caption)
                                .foregroundColor(.secondary)
                        }
                        
                        // Time Input (Optional)
                        VStack(alignment: .leading, spacing: 8) {
                            HStack {
                                Text("Time for that Distance")
                                    .font(.headline)
                                Text("(Optional)")
                                    .font(.caption)
                                    .foregroundColor(.secondary)
                                Spacer()
                            }
                            
                            HStack(spacing: 16) {
                                VStack {
                                    Text("Hours")
                                        .font(.caption)
                                        .foregroundColor(.secondary)
                                    Picker("Hours", selection: $hours) {
                                        ForEach(0..<10) { hour in
                                            Text("\(hour)").tag(hour)
                                        }
                                    }
                                    .pickerStyle(WheelPickerStyle())
                                    .frame(height: 100)
                                }
                                
                                VStack {
                                    Text("Minutes")
                                        .font(.caption)
                                        .foregroundColor(.secondary)
                                    Picker("Minutes", selection: $minutes) {
                                        ForEach(0..<60) { minute in
                                            Text("\(minute)").tag(minute)
                                        }
                                    }
                                    .pickerStyle(WheelPickerStyle())
                                    .frame(height: 100)
                                }
                            }
                        }
                        
                        // Max Distance (Required)
                        VStack(alignment: .leading, spacing: 8) {
                            HStack {
                                Text("Maximum Distance Ever Run")
                                    .font(.headline)
                                Text("*")
                                    .foregroundColor(.red)
                                Spacer()
                            }
                            
                            HStack {
                                TextField("Enter max distance", text: $maxDistance)
                                    .textFieldStyle(RoundedBorderTextFieldStyle())
                                    .keyboardType(.decimalPad)
                                
                                Picker("Unit", selection: $maxDistanceUnit) {
                                    ForEach(DistanceUnit.allCases, id: \.self) { unit in
                                        Text(unit.rawValue).tag(unit)
                                    }
                                }
                                .pickerStyle(SegmentedPickerStyle())
                                .frame(width: 120)
                            }
                            
                            Text("This helps us understand your current fitness level")
                                .font(.caption)
                                .foregroundColor(.secondary)
                        }
                    }
                    .padding(.horizontal)
                    
                    // Generate Plan Button
                    Button(action: generatePlan) {
                        if isLoading {
                            HStack {
                                ProgressView()
                                    .progressViewStyle(CircularProgressViewStyle(tint: .white))
                                Text("Generating Plan...")
                                    .fontWeight(.semibold)
                            }
                        } else {
                            Text("Generate My Training Plan")
                                .fontWeight(.semibold)
                        }
                    }
                    .frame(maxWidth: .infinity)
                    .frame(height: 50)
                    .background(isFormValid ? Color.blue : Color.gray)
                    .foregroundColor(.white)
                    .cornerRadius(10)
                    .padding(.horizontal)
                    .disabled(!isFormValid || isLoading)
                    
                    Spacer(minLength: 20)
                }
            }
            .navigationTitle("Running Input")
            .alert("Plan Generation", isPresented: $showingAlert) {
                Button("OK") { }
            } message: {
                Text(alertMessage)
            }
        }
    }
    
    private var isFormValid: Bool {
        !maxDistance.isEmpty && Double(maxDistance) != nil
    }
    
    private func generatePlan() {
        isLoading = true
        
        let runningData = RunningData(
            distance: distance.isEmpty ? nil : Double(distance),
            distanceUnit: distanceUnit,
            time: (hours == 0 && minutes == 0) ? nil : TimeComponents(hours: hours, minutes: minutes),
            maxDistance: Double(maxDistance) ?? 0,
            maxDistanceUnit: maxDistanceUnit
        )
        
        Task {
            do {
                let apiService = APIService()
                let plan = try await apiService.generatePlan(runningData: runningData)
                
                await MainActor.run {
                    isLoading = false
                    alertMessage = "Training plan generated successfully! Check the Plan tab to view it."
                    showingAlert = true
                }
            } catch {
                await MainActor.run {
                    isLoading = false
                    alertMessage = "Failed to generate plan: \(error.localizedDescription)"
                    showingAlert = true
                }
            }
        }
    }
}

#Preview {
    InputView()
}
