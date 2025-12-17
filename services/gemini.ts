import { GoogleGenAI, Type } from "@google/genai";
import { GeneratedPlan, Step, ChatMessage } from "../types";
import { config } from "../config";

const getAiClient = () => {
  const key = config.apiKey;
  if (!key) {
    throw new Error("API Key is not configured. Please add your key in the settings.");
  }
  return new GoogleGenAI({ apiKey: key });
};

// Phase 1: Deep Research with Google Search
export const performDeepResearch = async (
  repoName: string,
  userGoal: string,
  userProblems: string
): Promise<string> => {
  const ai = getAiClient();
  const prompt = `
    I am planning a modification to the GitHub repository: ${repoName}.
    
    GOAL: ${userGoal}
    PROBLEMS: ${userProblems}

    Please research the following on the internet:
    1. Best practices for this specific tech stack and goal.
    2. Common pitfalls, breaking changes, or deprecations I should be aware of.
    3. Safety considerations for this type of refactor/feature.

    Provide a concise summary of your findings to guide a developer plan.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview', // Using Pro for complex reasoning
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }], // Enable internet access
      }
    });

    // Extract text from response (handling potential grounding chunks implicitly via text generation)
    return response.text || "Research completed but no summary generated.";
  } catch (error) {
    console.warn("Research phase failed, proceeding without external research:", error);
    return "Internet research unavailable. Proceeding with internal knowledge.";
  }
};

// Shared Schema for Plan Generation
const PLAN_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    title: { type: Type.STRING, description: "Title of the implementation plan" },
    summary: { type: Type.STRING, description: "High level executive summary" },
    steps: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.INTEGER },
          title: { type: Type.STRING },
          description: { type: Type.STRING },
          rationale: { type: Type.STRING },
          technicalDetails: { type: Type.STRING },
          affectedFiles: { 
            type: Type.ARRAY, 
            items: { type: Type.STRING }
          },
          complexity: { type: Type.STRING, enum: ["Low", "Medium", "High"] },
          safetyChecks: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: "List of specific checks to ensure this step doesn't break the app (e.g. backward compat, tests)"
          }
        },
        required: ["id", "title", "description", "rationale", "technicalDetails", "affectedFiles", "complexity", "safetyChecks"]
      }
    }
  },
  required: ["title", "summary", "steps"]
};

// Phase 2: Generate Structured Plan
export const generatePlan = async (
  repoContext: { name: string; readme: string; structure: string },
  userGoal: string,
  userProblems: string,
  researchNotes: string
): Promise<GeneratedPlan> => {
  const ai = getAiClient();
  
  const prompt = `
    CONTEXT:
    Repository: ${repoContext.name}
    File Structure: ${repoContext.structure}
    README: ${repoContext.readme.slice(0, 20000)}...

    USER GOAL: ${userGoal}
    PAIN POINTS: ${userProblems}
    
    RESEARCH FINDINGS & SAFETY CONTEXT:
    ${researchNotes}

    TASK:
    Create a detailed, step-by-step developer implementation plan.
    
    CRITICAL SAFETY RULES:
    1. Prioritize backward compatibility.
    2. Suggest rollback strategies where applicable.
    3. Ensure no step leaves the application in a broken state.
    4. Explicitly list safety checks for every step.

    Return valid JSON.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: prompt,
      config: {
        systemInstruction: "You are a cautious, expert Senior Software Architect. You prioritize system stability and safety above speed.",
        responseMimeType: 'application/json',
        responseSchema: PLAN_SCHEMA
      }
    });

    const text = response.text;
    if (!text) throw new Error("No response from AI");
    
    const plan = JSON.parse(text) as GeneratedPlan;
    // Attach research notes to the plan object for display
    plan.researchNotes = researchNotes;
    return plan;

  } catch (error) {
    console.error("Gemini Plan Generation Error:", error);
    throw error;
  }
};

// Phase 3: Iterative Refactoring (Chat to Edit Plan)
export const refactorPlan = async (
  currentPlan: GeneratedPlan,
  userFeedback: string,
  repoContext: { name: string; structure: string }
): Promise<GeneratedPlan> => {
  const ai = getAiClient();

  const prompt = `
    CURRENT PLAN:
    ${JSON.stringify(currentPlan, null, 2)}

    CONTEXT:
    Repo: ${repoContext.name}
    Structure: ${repoContext.structure}

    USER REQUEST FOR CHANGES:
    "${userFeedback}"

    TASK:
    Modify the JSON plan above to satisfy the user's request.
    - If they ask to split a step, create multiple steps.
    - If they ask for more safety, add detailed safetyChecks.
    - Keep the JSON structure valid.
    - Only change what is necessary.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: prompt,
      config: {
        systemInstruction: "You are an intelligent code planner assistant. You modify existing architectural plans based on user feedback while maintaining strict JSON structure.",
        responseMimeType: 'application/json',
        responseSchema: PLAN_SCHEMA
      }
    });

    const text = response.text;
    if (!text) throw new Error("No response from AI");
    
    const newPlan = JSON.parse(text) as GeneratedPlan;
    // Preserve research notes if lost
    if (!newPlan.researchNotes) newPlan.researchNotes = currentPlan.researchNotes;
    
    return newPlan;
  } catch (error) {
    console.error("Plan Refactoring Error:", error);
    throw error;
  }
};

export const askStepQuestion = async (
  step: Step,
  chatHistory: ChatMessage[],
  repoName: string
): Promise<string> => {
  const ai = getAiClient();
  
  const historyText = chatHistory.map(m => `${m.role.toUpperCase()}: ${m.content}`).join('\n');
  const lastMsg = chatHistory[chatHistory.length - 1].content;

  const prompt = `
    CURRENT STEP:
    Title: ${step.title}
    Tech Details: ${step.technicalDetails}
    Safety Checks: ${step.safetyChecks.join(', ')}
    
    HISTORY:
    ${historyText}
    
    QUESTION:
    ${lastMsg}
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview', // Upgrade to Pro for better chat responses
      contents: prompt,
      config: {
        systemInstruction: `You are a helpful coding assistant for repo '${repoName}'. Provide code snippets and safety warnings.`
      }
    });
    return response.text || "I couldn't generate an answer.";
  } catch (error) {
    console.error("Gemini Chat Error:", error);
    return "Sorry, I encountered an error answering that.";
  }
};