import { GoogleGenAI, Type } from "@google/genai";
import { GeneratedPlan, Step, ChatMessage, RepoFile } from "../types";
import { config, AiSettings } from "../config";
import { generateTreeString, filterImportantFiles, estimateTreeTokens } from "./treeUtils";
import { sanitizeForAI } from "./security";
import { getFileContent } from "./github";

// --- Local LLM Helpers ---

const callLocalLLM = async (
  settings: AiSettings,
  messages: { role: string; content: string }[],
  jsonMode: boolean = false
): Promise<string> => {
  if (!settings.baseUrl) throw new Error("Local Base URL not configured");

  try {
    const response = await fetch(`${settings.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: settings.model || 'llama3',
        messages: messages,
        temperature: 0.7,
        stream: false,
        // Ollama specific: enforce JSON mode if requested
        format: jsonMode ? "json" : undefined 
      }),
    });

    if (!response.ok) {
      throw new Error(`Local LLM Error: ${response.statusText}`);
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || "";
  } catch (error: any) {
    console.error("Local LLM Fetch Error:", error);
    throw new Error(`Failed to connect to Local LLM at ${settings.baseUrl}. Is it running?`);
  }
};

// --- Gemini Helpers ---

const getGeminiClient = (apiKey: string) => {
  return new GoogleGenAI({ apiKey });
};

// --- Main Exported Functions ---

// Phase 1: Deep Research
export const performDeepResearch = async (
  repoName: string,
  userGoal: string,
  userProblems: string
): Promise<string> => {
  const settings = config.settings;
  const prompt = `
    I am planning a modification to the GitHub repository: ${repoName}.
    
    GOAL: ${userGoal}
    PROBLEMS: ${userProblems}

    Please research the following on the internet:
    1. Best practices for this specific tech stack and goal.
    2. Common pitfalls, breaking changes, or deprecations I should be aware of.
    3. Safety considerations for this type of refactor/feature.

    Provide a concise, bulleted summary of your findings to guide a developer plan. Avoid broad generalizations; focus on technical specifics.
  `;

  // Branch based on provider
  if (settings.provider === 'local') {
    // Local models usually don't have internet access enabled by default in this setup
    console.warn("Deep research skipped: Local mode active.");
    return "NOTE: Deep Internet Research is disabled in Local LLM mode. Using model's internal knowledge base only.";
  }

  // Gemini Path
  try {
    const ai = getGeminiClient(settings.apiKey!);
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
      }
    });
    return response.text || "Research completed but no summary generated.";
  } catch (error) {
    console.warn("Research phase failed:", error);
    return "Internet research unavailable. Proceeding with internal knowledge.";
  }
};

// --- Two-Stage Analysis Functions ---

/**
 * Stage 1: Identify relevant files based on user goal and repository tree
 * This prevents sending all files to the AI, saving tokens and reducing costs
 */
export const identifyRelevantFiles = async (
  userGoal: string,
  userProblems: string,
  repoTree: RepoFile[],
  repoName: string
): Promise<string[]> => {
  const settings = config.settings;

  // Filter to important files first
  const importantFiles = filterImportantFiles(repoTree);
  const treeString = generateTreeString(importantFiles);

  const systemInstruction = "You are a code analysis assistant. Your job is to identify which files in a repository are most relevant to a user's goal. Be selective - choose only files that are directly relevant.";

  const prompt = `
    REPOSITORY: ${repoName}

    FILE STRUCTURE:
    ${treeString}

    USER'S GOAL:
    ${userGoal}

    USER'S PROBLEMS/CONTEXT:
    ${userProblems}

    TASK:
    Analyze the file structure and identify which files are most relevant to achieve the user's goal.
    Consider:
    1. Main source files that would need modification
    2. Configuration files that might be affected
    3. Test files if testing is relevant
    4. Documentation files if they provide necessary context

    CONSTRAINTS:
    - Select a MAXIMUM of 10 files (prefer fewer if possible)
    - Only choose files that actually exist in the tree above
    - Prioritize source code over configuration
    - Avoid binary files, images, or generated files

    OUTPUT FORMAT:
    Return a JSON array of file paths only, nothing else.
    Example: ["src/main.ts", "package.json", "README.md"]
  `;

  let text = "";

  if (settings.provider === 'local') {
    text = await callLocalLLM(settings, [
      { role: "system", content: systemInstruction },
      { role: "user", content: prompt }
    ], true);
  } else {
    const ai = getGeminiClient(settings.apiKey!);
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: prompt,
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
      }
    });
    text = response.text || "[]";
  }

  try {
    const jsonStr = text.replace(/```json/g, '').replace(/```/g, '').trim();
    const files = JSON.parse(jsonStr) as string[];

    // Validate that files exist in the tree
    const validFiles = files.filter(filePath =>
      repoTree.some(f => f.path === filePath)
    );

    console.log(`Stage 1: Identified ${validFiles.length} relevant files:`, validFiles);
    return validFiles.slice(0, 10); // Hard limit to 10 files
  } catch (error) {
    console.error("Failed to parse relevant files:", error);
    console.error("Raw response:", text);
    // Fallback: return important config files
    return repoTree
      .filter(f =>
        f.path === 'package.json' ||
        f.path === 'README.md' ||
        f.path.startsWith('src/')
      )
      .slice(0, 5)
      .map(f => f.path);
  }
};

/**
 * Stage 2: Fetch and sanitize file contents
 * Applies security redaction before sending to AI
 */
export const fetchAndSanitizeFiles = async (
  filePaths: string[],
  repoName: string,
  branch: string
): Promise<{ path: string; content: string; warnings: string[] }[]> => {
  const results = await Promise.all(
    filePaths.map(async (path) => {
      try {
        const rawContent = await getFileContent(repoName, path, branch);
        const { content, warnings } = sanitizeForAI(rawContent, path);

        return {
          path,
          content,
          warnings
        };
      } catch (error: any) {
        console.error(`Failed to fetch file ${path}:`, error);
        return {
          path,
          content: `[Error: Could not fetch file - ${error.message}]`,
          warnings: []
        };
      }
    })
  );

  // Log security warnings
  const allWarnings = results.flatMap(r => r.warnings);
  if (allWarnings.length > 0) {
    console.warn('SECURITY: Redacted secrets before sending to AI:', allWarnings);
  }

  return results;
};

// Shared Schema used for structure prompting
const PLAN_SCHEMA_JSON = JSON.stringify({
  type: "object",
  properties: {
    title: { type: "string" },
    summary: { type: "string" },
    steps: {
      type: "array",
      items: {
        type: "object",
        properties: {
          id: { type: "integer" },
          title: { type: "string" },
          description: { type: "string" },
          rationale: { type: "string" },
          technicalDetails: { type: "string" },
          affectedFiles: { type: "array", items: { type: "string" } },
          complexity: { type: "string", enum: ["Low", "Medium", "High"] },
          safetyChecks: { type: "array", items: { type: "string" } }
        },
        required: ["id", "title", "description", "rationale", "technicalDetails", "affectedFiles", "complexity", "safetyChecks"]
      }
    }
  },
  required: ["title", "summary", "steps"]
});

/**
 * Enhanced Plan Generation with Two-Stage Analysis
 * This version uses the tree-first approach with targeted file reading
 */
export const generatePlanEnhanced = async (
  repoName: string,
  repoTree: RepoFile[],
  userGoal: string,
  userProblems: string,
  researchNotes: string,
  branch: string = 'main'
): Promise<GeneratedPlan> => {
  const settings = config.settings;

  // Stage 1: Identify relevant files
  const relevantFilePaths = await identifyRelevantFiles(
    userGoal,
    userProblems,
    repoTree,
    repoName
  );

  // Stage 2: Fetch and sanitize file contents
  const fileContents = await fetchAndSanitizeFiles(
    relevantFilePaths,
    repoName,
    branch
  );

  // Build context from tree and file contents
  const treeString = generateTreeString(repoTree);
  const fileContexts = fileContents
    .map(f => `\n--- FILE: ${f.path} ---\n${f.content.substring(0, 5000)}`)
    .join('\n');

  const systemInstruction = "You are a pragmatic Senior Software Architect. You hate fluff. You prioritize working code, correct file paths, and safety. You generate plans that look like engineering specs, not blog posts. All file paths you mention MUST exist in the provided repository structure.";

  const prompt = `
    REPOSITORY: ${repoName}

    REPOSITORY STRUCTURE:
    ${treeString.substring(0, 10000)}

    ANALYZED FILES:
    ${fileContexts}

    USER GOAL: ${userGoal}
    PAIN POINTS: ${userProblems}

    RESEARCH FINDINGS & SAFETY CONTEXT:
    ${researchNotes}

    TASK:
    Create a detailed, step-by-step developer implementation plan.

    STRICT GUIDELINES:
    1. **Conciseness**: Avoid long narrative or dense explanations. Use bullet points and imperative verbs.
    2. **Structure**: Organize steps into clear logical phases (e.g., "Phase 1: Setup", "Phase 2: Core Logic").
    3. **File Path Verification**: You MUST cross-reference the provided 'Repository Structure'.
       - If you reference a file, it MUST exist in the structure list.
       - If you are creating a new file, explicitly state "Create [filename]".
       - Do NOT hallucinate libraries or routes that are not implied by the analyzed files.

    CRITICAL SAFETY RULES:
    1. Prioritize backward compatibility.
    2. Suggest rollback strategies where applicable.
    3. Ensure no step leaves the application in a broken state.
    4. Explicitly list safety checks for every step.
    5. NEVER suggest including secrets or API keys in code.

    OUTPUT FORMAT:
    Return VALID JSON matching this schema:
    ${PLAN_SCHEMA_JSON}
  `;

  let text = "";

  if (settings.provider === 'local') {
    text = await callLocalLLM(settings, [
      { role: "system", content: systemInstruction + " Respond ONLY with raw JSON." },
      { role: "user", content: prompt }
    ], true);
  } else {
    const ai = getGeminiClient(settings.apiKey!);
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: prompt,
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
      }
    });
    text = response.text || "";
  }

  try {
    const jsonStr = text.replace(/```json/g, '').replace(/```/g, '').trim();
    const plan = JSON.parse(jsonStr) as GeneratedPlan;
    plan.researchNotes = researchNotes;
    return plan;
  } catch (error) {
    console.error("JSON Parse Error:", error);
    console.error("Raw Text:", text);
    throw new Error("AI generated an invalid plan format. Please try again.");
  }
};

// Phase 2: Generate Structured Plan (Legacy - kept for backwards compatibility)
export const generatePlan = async (
  repoContext: { name: string; readme: string; structure: string },
  userGoal: string,
  userProblems: string,
  researchNotes: string
): Promise<GeneratedPlan> => {
  const settings = config.settings;

  const systemInstruction = "You are a pragmatic Senior Software Architect. You hate fluff. You prioritize working code, correct file paths, and safety. You generate plans that look like engineering specs, not blog posts.";
  
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
    
    STRICT GUIDELINES:
    1. **Conciseness**: Avoid long narrative or dense explanations. Use bullet points and imperative verbs.
    2. **Structure**: Organize steps into clear logical phases (e.g., "Phase 1: Setup", "Phase 2: Core Logic"). Use the Step Title to indicate the phase.
    3. **File Path Verification**: You MUST cross-reference the provided 'File Structure'. 
       - If you reference a file, it MUST exist in the structure list.
       - If you are creating a new file, explicitly state "Create [filename]".
       - Do NOT hallucinate libraries or routes that are not implied by the package.json or file structure.
    
    CRITICAL SAFETY RULES:
    1. Prioritize backward compatibility.
    2. Suggest rollback strategies where applicable.
    3. Ensure no step leaves the application in a broken state.
    4. Explicitly list safety checks for every step.

    OUTPUT FORMAT:
    Return VALID JSON matching this schema:
    ${PLAN_SCHEMA_JSON}
  `;

  let text = "";

  if (settings.provider === 'local') {
    // Local Path
    text = await callLocalLLM(settings, [
      { role: "system", content: systemInstruction + " Respond ONLY with raw JSON." },
      { role: "user", content: prompt }
    ], true);
  } else {
    // Gemini Path
    const ai = getGeminiClient(settings.apiKey!);
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: prompt,
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
        // We use loose schema enforcement in prompt for broader compatibility, 
        // but could use responseSchema object here for Gemini.
        // For simplicity with the dual-path code, we rely on the prompt+schema string 
        // but explicitly telling Gemini it's JSON mimeType ensures valid parsing.
      }
    });
    text = response.text || "";
  }

  try {
    // Clean markdown code blocks if present (common in Local LLM outputs)
    const jsonStr = text.replace(/```json/g, '').replace(/```/g, '').trim();
    const plan = JSON.parse(jsonStr) as GeneratedPlan;
    plan.researchNotes = researchNotes;
    return plan;
  } catch (error) {
    console.error("JSON Parse Error:", error);
    console.error("Raw Text:", text);
    throw new Error("AI generated an invalid plan format. Please try again.");
  }
};

// Phase 3: Iterative Refactoring
export const refactorPlan = async (
  currentPlan: GeneratedPlan,
  userFeedback: string,
  repoContext: { name: string; structure: string }
): Promise<GeneratedPlan> => {
  const settings = config.settings;
  const systemInstruction = "You are an intelligent code planner assistant. You modify existing architectural plans based on user feedback while maintaining strict JSON structure and preventing hallucinations of file paths.";

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
    - Maintain strict file path verification against the Context Structure.
    - Keep descriptions concise and actionable.
    
    OUTPUT: Valid JSON only.
  `;

  let text = "";
  if (settings.provider === 'local') {
    text = await callLocalLLM(settings, [
      { role: "system", content: systemInstruction },
      { role: "user", content: prompt }
    ], true);
  } else {
    const ai = getGeminiClient(settings.apiKey!);
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: prompt,
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
      }
    });
    text = response.text || "";
  }

  try {
    const jsonStr = text.replace(/```json/g, '').replace(/```/g, '').trim();
    const newPlan = JSON.parse(jsonStr) as GeneratedPlan;
    if (!newPlan.researchNotes) newPlan.researchNotes = currentPlan.researchNotes;
    return newPlan;
  } catch (error) {
    console.error("Refactor Parse Error:", error);
    throw error;
  }
};

export const askStepQuestion = async (
  step: Step,
  chatHistory: ChatMessage[],
  repoName: string
): Promise<string> => {
  const settings = config.settings;
  const systemInstruction = `You are a helpful coding assistant for repo '${repoName}'. Provide code snippets and safety warnings. Be concise.`;
  
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

  if (settings.provider === 'local') {
     return await callLocalLLM(settings, [
        { role: "system", content: systemInstruction },
        ...chatHistory.map(m => ({ role: m.role, content: m.content }))
     ]);
  } else {
     try {
        const ai = getGeminiClient(settings.apiKey!);
        const response = await ai.models.generateContent({
          model: 'gemini-3-pro-preview',
          contents: prompt,
          config: { systemInstruction }
        });
        return response.text || "No response.";
     } catch (error: any) {
        console.error(error);
        return "Error calling Gemini.";
     }
  }
};