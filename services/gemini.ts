import { GoogleGenAI, Type } from "@google/genai";
import { GeneratedPlan, Step, ChatMessage } from "../types";

// Helper to ensure we don't have undefined API key
const getAiClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    console.error("API_KEY is missing from environment variables");
  }
  return new GoogleGenAI({ apiKey: apiKey || 'dummy-key-for-dev' });
};

export const generatePlan = async (
  repoContext: { name: string; readme: string; structure: string },
  userGoal: string,
  userProblems: string
): Promise<GeneratedPlan> => {
  const ai = getAiClient();
  
  const prompt = `
    CONTEXT:
    Repository: ${repoContext.name}
    File Structure (Top Level):
    ${repoContext.structure}
    
    README Summary/Content:
    ${repoContext.readme.slice(0, 30000)}... (truncated if too long)

    USER GOAL:
    ${userGoal}

    CURRENT PROBLEMS/PAIN POINTS:
    ${userProblems}

    TASK:
    Analyze the repository context, the goal, and the problems. 
    Create a detailed, step-by-step developer implementation plan (TODO.md style).
    Return the response as a valid JSON object matching the requested schema.
    
    The steps should be actionable, specific, and logical. 
    Include file paths if you can infer them from the structure or standard conventions.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        systemInstruction: "You are an expert Senior Technical Architect and Developer. You specialize in analyzing codebases and creating clear, actionable implementation plans.",
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING, description: "Title of the implementation plan" },
            summary: { type: Type.STRING, description: "High level executive summary of the approach" },
            steps: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.INTEGER },
                  title: { type: Type.STRING },
                  description: { type: Type.STRING, description: "What needs to be done" },
                  rationale: { type: Type.STRING, description: "Why this step is necessary" },
                  technicalDetails: { type: Type.STRING, description: "Specific code changes, libraries, or logic" },
                  affectedFiles: { 
                    type: Type.ARRAY, 
                    items: { type: Type.STRING },
                    description: "List of files likely to be modified or created"
                  },
                  complexity: { type: Type.STRING, enum: ["Low", "Medium", "High"] }
                },
                required: ["id", "title", "description", "rationale", "technicalDetails", "affectedFiles", "complexity"]
              }
            }
          },
          required: ["title", "summary", "steps"]
        }
      }
    });

    const text = response.text;
    if (!text) throw new Error("No response from AI");
    
    return JSON.parse(text) as GeneratedPlan;

  } catch (error) {
    console.error("Gemini Plan Generation Error:", error);
    throw new Error("Failed to generate plan. Please try again.");
  }
};

export const askStepQuestion = async (
  step: Step,
  chatHistory: ChatMessage[],
  repoName: string
): Promise<string> => {
  const ai = getAiClient();
  
  // Construct history for context
  const historyText = chatHistory.map(m => `${m.role.toUpperCase()}: ${m.content}`).join('\n');
  const lastMsg = chatHistory[chatHistory.length - 1].content;

  const prompt = `
    CURRENT STEP:
    Title: ${step.title}
    Description: ${step.description}
    Technical Details: ${step.technicalDetails}
    
    CHAT HISTORY:
    ${historyText}
    
    USER QUESTION:
    ${lastMsg}
    
    Provide a clear, helpful, developer-focused answer. You can provide code snippets if asked. Keep it concise but complete.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        systemInstruction: `You are a helpful coding assistant discussing a specific step in a development plan for the repo '${repoName}'.`
      }
    });
    return response.text || "I couldn't generate an answer.";
  } catch (error) {
    console.error("Gemini Chat Error:", error);
    return "Sorry, I encountered an error answering that.";
  }
};