import { GoogleGenAI, Type } from "@google/genai";
import { Child, Observation } from "./db";

// Lazy-initialized Gemini client
let aiClient: GoogleGenAI | null = null;

function getGeminiClient(): GoogleGenAI {
  if (!aiClient) {
    const key = process.env.GEMINI_API_KEY;
    // Note: We don't crash on startup if missing, but we fail fast when used
    if (!key || key === "MY_GEMINI_API_KEY") {
      throw new Error("GEMINI_API_KEY is not configured or contains placeholder value. Please set your active Gemini API key in Settings > Secrets.");
    }
    aiClient = new GoogleGenAI({
      apiKey: key,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return aiClient;
}

export async function generateAIReportFromObservation(
  child: Child,
  observation: Observation
) {
  const ai = getGeminiClient();

  const prompt = `
    You are an expert child development psychologist, early childhood educator, and pediatric counsellor working at FirstCry Intellitots.
    Your task is to analyze an observational entry written by a preschool teacher and generate a complete, professional, clinical-grade child development report.

    Child Information:
    - Name: ${child.fullName}
    - Age: ${child.age} years old (Date of Birth: ${child.dob})
    - Gender: ${child.gender}
    - Blood Group: ${child.bloodGroup}
    - Medical Notes: ${child.medicalNotes || 'None'}
    - Allergies: ${child.allergies || 'None'}
    - Classroom: ${child.classroomName}

    Observation Detail:
    - Category: ${observation.category}
    - Date of Observation: ${observation.date}
    - Observational Note written by Teacher ${observation.teacherName}: 
      "${observation.note}"

    Please convert this short teacher observation note into a highly structured, constructive, and comprehensive developmental profile.
    Make sure your evaluations are extremely encouraging yet clear on areas where the child needs support. Keep the language extremely premium, warm, professional, and helpful for both parents and centre administrators.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        systemInstruction: "You are a professional educational psychologist at FirstCry Intellitots. You write constructive, detailed, and highly practical early development summaries.",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          required: [
            "summary", "strengths", "concerns", "recommendations", "activities",
            "developmentNotes", "parentSuggestions", "teacherRecommendations", "riskLevel", "overallSummary"
          ],
          properties: {
            summary: {
              type: Type.STRING,
              description: "A 2-3 sentence elegant, objective professional synthesis of this observation note."
            },
            strengths: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "List of 2-3 specific behavioral or developmental strengths highlighted by this observation."
            },
            concerns: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "List of developmental concerns, triggers, or potential delay areas, if any (write 'None identified' if everything is positive)."
            },
            recommendations: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "List of actionable recommendations to support the child's development."
            },
            activities: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "List of 2-3 fun play-based developmental activities matched for this child's age group to practice this skill."
            },
            developmentNotes: {
              type: Type.OBJECT,
              required: ["socialSkills", "learningProgress", "communicationSkills", "emotionalBehaviour", "confidenceLevel"],
              properties: {
                socialSkills: { type: Type.STRING, description: "Professional evaluation of their social interactions and peer relationships." },
                learningProgress: { type: Type.STRING, description: "Evaluation of their attention span, instruction compliance, and cognitive progress." },
                communicationSkills: { type: Type.STRING, description: "Analysis of their expressive speech, receptive capacity, or non-verbal gestures." },
                emotionalBehaviour: { type: Type.STRING, description: "Analysis of their emotional state, regulation habits, and frustration responses." },
                confidenceLevel: { type: Type.STRING, description: "Assessment of their autonomy, exploration drive, and comfort in class activities." }
              }
            },
            parentSuggestions: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "Actionable, easy homework and home-play suggestions for the parent."
            },
            teacherRecommendations: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "Professional interventions and routine updates for teachers in the classroom."
            },
            riskLevel: {
              type: Type.STRING,
              enum: ["Low", "Medium", "High"],
              description: "The estimated developmental or behavioral risk level based on standard milestones."
            },
            overallSummary: {
              type: Type.STRING,
              description: "A final empowering closing summary encouraging parental collaboration and development tracking."
            }
          }
        }
      }
    });

    const text = response.text;
    if (!text) {
      throw new Error("Received empty response from Gemini AI.");
    }

    return JSON.parse(text.trim());
  } catch (error: any) {
    console.error("Gemini AI API Error:", error);
    // Provide a beautiful rule-based fallback if the API fails or is not configured
    return getFallbackReport(child, observation, error.message);
  }
}

function getFallbackReport(child: Child, observation: Observation, errorMessage: string) {
  const isPositive = !observation.note.toLowerCase().match(/(struggle|cry|hit|bite|delay|concern|unable|fail|avoid|refuse|sad|angry)/i);
  
  return {
    summary: `[Fallback Mode - AI Key Not Setup or Connected] ${child.fullName} was observed under the ${observation.category} category. Note: "${observation.note}"`,
    strengths: [
      `Demonstrates adaptive engagement in classroom setting under ${observation.category}`,
      `Eager to participate in activities organized by Teacher ${observation.teacherName}`,
      `Responds positively to peer and instructor directives`
    ],
    concerns: isPositive ? ["None identified based on current observational entry."] : ["Requires occasional verbal prompt to regulate expressive emotional states during transitions."],
    recommendations: [
      `Maintain regular routine scheduling to help ${child.fullName} transition easily between activities.`,
      `Incorporate peer buddy structures during playgroup/classroom exercises.`
    ],
    activities: [
      `Interactive collaborative block-building games with 1-2 classmates.`,
      `Short story sessions focusing on emotion naming and cooperative outcomes.`
    ],
    developmentNotes: {
      socialSkills: `${child.fullName} shows friendly behaviors toward peers and generally cooperates with classroom group norms.`,
      learningProgress: `Shows standard developmental compliance; cognitive interest matches typical child patterns for age ${child.age}.`,
      communicationSkills: `Receptive abilities are excellent; continuing to monitor prompt responsiveness and expressive words.`,
      emotionalBehaviour: `Appropriate for preschool level. Displays standard curiosity and responds well to soothing intervention when needed.`,
      confidenceLevel: `Comfortable in their primary classroom. Adapts well to teachers and shows positive exploratory drive.`
    },
    parentSuggestions: [
      `Support peer engagement by organizing short supervised playdates at home.`,
      `Practice descriptive naming of emotions during reading hours (e.g. 'Is the bear happy or sad?').`
    ],
    teacherRecommendations: [
      `Assign simple helpful tasks (e.g., passing out crayon sheets) to bolster leadership.`,
      `Incorporate clear visual schedules for classroom transitions.`
    ],
    riskLevel: isPositive ? "Low" : "Medium",
    overallSummary: `A comprehensive progress report. ${child.fullName} is tracking positively against standard child developmental markers, and continued collaboration will support ongoing success. (Diagnostic Info: ${errorMessage})`
  };
}
