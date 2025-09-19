const OpenAI = require('openai');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

class OpenAIService {
  async generateTrainingPlan(runningData) {
    try {
      const { distance, distanceUnit, time, maxDistance, maxDistanceUnit } = runningData;
      
      // Build the prompt based on user input
      let prompt = `Create a personalized running training plan for a runner with the following profile:

Maximum distance ever run: ${maxDistance} ${maxDistanceUnit}`;

      if (distance && time) {
        prompt += `
Recent performance: ${distance} ${distanceUnit} in ${time.hours} hours and ${time.minutes} minutes`;
      } else if (distance) {
        prompt += `
Recent distance: ${distance} ${distanceUnit}`;
      }

      prompt += `

Please create a comprehensive 12-week training plan that includes:
1. A descriptive title for the plan
2. A brief description of the plan's focus and goals
3. Difficulty level (beginner, intermediate, or advanced)
4. 3-5 specific training goals
5. A weekly schedule with varied workout types including:
   - Easy runs for aerobic base building
   - Tempo runs for lactate threshold
   - Interval training for speed
   - Long runs for endurance
   - Recovery runs for active recovery
   - Cross-training sessions

For each workout, provide:
- Title and description
- Workout type (easy, tempo, interval, long_run, recovery, cross_training)
- Duration in minutes
- Distance in kilometers (if applicable)
- Intensity level (low, moderate, high, maximum)
- 3-5 specific instructions
- Suggested scheduling (which week and day)

Format the response as a JSON object with this structure:
{
  "title": "Plan title",
  "description": "Plan description",
  "duration": 12,
  "difficulty": "beginner|intermediate|advanced",
  "goals": ["goal1", "goal2", "goal3"],
  "workouts": [
    {
      "title": "Workout title",
      "description": "Workout description",
      "type": "easy|tempo|interval|long_run|recovery|cross_training",
      "duration": 30,
      "distance": 5.0,
      "intensity": "low|moderate|high|maximum",
      "instructions": ["instruction1", "instruction2"],
      "weekNumber": 1,
      "dayOfWeek": 1
    }
  ]
}

Make sure the plan is progressive, realistic, and appropriate for the runner's current fitness level.`;

      const completion = await openai.chat.completions.create({
        model: "gpt-4.1",
        messages: [
          {
            role: "system",
            content: "You are an expert running coach with years of experience creating personalized training plans. Always respond with valid JSON only, no additional text."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        max_completion_tokens: 4000
      });

      const response = completion.choices[0].message.content;
      
      // Parse the JSON response
      let planData;
      try {
        planData = JSON.parse(response);
      } catch (parseError) {
        console.error('Failed to parse OpenAI response:', parseError);
        throw new Error('Invalid response format from AI service');
      }

      // Validate required fields
      if (!planData.title || !planData.description || !planData.workouts) {
        throw new Error('Incomplete training plan generated');
      }

      return {
        ...planData,
        aiGeneratedContent: response
      };

    } catch (error) {
      console.error('OpenAI service error:', error);

      if (error.message === 'Invalid response format from AI service' || error.message === 'Incomplete training plan generated') {
        throw error;
      }

      if (error.code === 'insufficient_quota') {
        throw new Error('AI service quota exceeded. Please try again later.');
      } else if (error.code === 'invalid_api_key') {
        throw new Error('AI service configuration error. Please contact support.');
      } else {
        throw new Error('Failed to generate training plan. Please try again.');
      }
    }
  }

  async generateWorkoutInstructions(workoutType, duration, distance) {
    try {
      const prompt = `Generate detailed instructions for a ${workoutType} workout that is ${duration} minutes long${distance ? ` and covers ${distance} km` : ''}. 

Provide 3-5 specific, actionable instructions that a runner can follow. Focus on:
- Warm-up and cool-down
- Pacing guidance
- Technique tips
- Safety considerations

Return only a JSON array of strings, no additional text.`;

      const completion = await openai.chat.completions.create({
        model: "gpt-4.1",
        messages: [
          {
            role: "system",
            content: "You are a running coach providing workout instructions. Always respond with valid JSON array only."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        max_completion_tokens: 500
      });

      return JSON.parse(completion.choices[0].message.content);
    } catch (error) {
      console.error('Failed to generate workout instructions:', error);
      // Return default instructions if AI fails
      return [
        "Start with a 5-10 minute warm-up walk or light jog",
        "Maintain steady effort throughout the main workout",
        "Focus on proper running form and breathing",
        "Cool down with 5-10 minutes of walking and stretching"
      ];
    }
  }
}

module.exports = new OpenAIService();
