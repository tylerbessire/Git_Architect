# GitArchitect Core Analysis Engine Implementation
    
## Executive Summary
Implementation of the core analysis logic for GitArchitect, focusing on optimizing context management for browser-based LLM interactions. The plan introduces a two-stage analysis pipeline (Tree Scan -> targeted File Read) to respect token limits, implements client-side secret redaction, and enforces structured Markdown output for 'battle plan' generation.

## Safety & Research Context
This plan outlines the technical strategy for refactoring **tylerbessire/Git_Architect** to analyze repositories and generate actionable Markdown checklists.

### 1. Best Practices for this Tech Stack & Goal
*Assumption: The tool is built in **Python** (most common for AI/LLM CLI tools) or **Node.js**.*

*   **Repository Traversal & Context Management**
    *   **Respect `.gitignore`:** Strictly filter files using libraries like `pathspec` (Python) or `ignore` (Node.js). **Pitfall:** Failing to do this will mistakenly send `node_modules`, `venv`, or sensitive config files to the LLM, burning tokens and crashing the context window.
    *   **Context Optimization (Token Budgeting):**
        *   **File Tree First:** Do not send all code immediately. First, generate a highly compressed visual tree of the repo structure. Feed this to the LLM so it "sees" the architecture.
        *   **Two-Pass Analysis:** (1) Send file tree + user problem → Ask LLM which specific files are relevant. (2) Read only those files → Send for detailed analysis.
        *   **Compress Code:** Strip whitespace/comments or use a "skeletonizer" (extracting only class/function signatures) if the file count exceeds the context window.

*   **LLM Interaction & Prompt Engineering**
    *   **System Prompt:** Define a persona: *"You are a Senior Software Architect. Your output must be a strict Markdown checklist. Do not provide conversational filler."*
    *   **Structured Output:** Enforce a specific Markdown schema.
        ```markdown
        # Implementation Plan
        - [ ] **Step 1:** [Action] (File: `src/main.py`)
        - [ ] **Step 2:** [Action] (File: `utils/helpers.py`)
        ```
    *   **Chain of Thought:** Ask the model to "think silently" or "plan" before generating the final list to improve logical step ordering.

*   **Output Format**
    *   Use **GitHub Flavored Markdown (GFM)** standard.
    *   Ensure file paths in the checklist are relative to the repo root (e.g., `src/components/Button.tsx`) so they are copy-paste friendly for developers or other agents.

### 2. Common Pitfalls & Breaking Changes
*   **Token Limit Explosions:**
    *   *Pitfall:* A user runs the tool on a monorepo or a repo with large assets (JSON dumps, images, lockfiles).
    *   *Fix:* Hard-limit file reads (e.g., "Skip files > 100KB") and exclude non-text extensions (`.png`, `.exe`, `.lock`) by default.
*   **"Lazy" Git Analysis:**
    *   *Pitfall:* Relying on `os.walk` without checking `.gitignore` usually leads to analyzing build artifacts, resulting in hallucinated "fixes" for compiled code instead of source code.
*   **Hallucinated Files:**
    *   *Pitfall:* The LLM might suggest editing files that don't exist.
    *   *Fix:* Validate the LLM's generated checklist against the actual file system. If a file is mentioned that doesn't exist, flag it in the output as "Create new file: X".

### 3. Safety Considerations
*   **Secret Leaks (Critical):**
    *   **Risk:** Sending code containing API keys, database passwords, or `.env` contents to an external LLM provider (OpenAI/Anthropic).
    *   **Mitigation:** Integrate a secrets detection library (e.g., `detect-secrets` for Python or `trufflehog`) to scan file content *before* sending it to the API. Redact any findings with `[REDACTED_SECRET]`.
*   **Data Privacy:**
    *   Clearly inform the user (via CLI warning) that their code snippets are being sent to a third-party API.
*   **Destructive Suggestions:**
    *   While the tool analyzes, the *checklist* might contain destructive commands (e.g., `rm -rf`). If you plan to feed this output to a "Coding Assistant" agent that executes code, ensure there is a **human-in-the-loop confirmation step** before actions are applied.

### Summary Checklist for Developer Plan
*   [ ] **Dependency:** Add `pathspec` (Python) or `ignore` (Node) for `.gitignore` handling.
*   [ ] **Dependency:** Add `detect-secrets` or similar to scrub API keys from the payload.
*   [ ] **Feature:** Implement "File Tree" generator to provide low-cost context to LLM.
*   [ ] **Feature:** Add a "Dry Run" flag that shows exactly what text/files will be sent to the LLM.
*   [ ] **Prompt:** Refine system prompt to demand exclusively Markdown Task List format (`- [ ]`).

## Implementation Steps


### Step 1: Phase 1: Define Data Structures
**Complexity:** Low
**Files:** types.ts

Define TypeScript interfaces for Repository Trees, File Content, and Analysis Responses.

**Rationale:**
Strong typing is essential for managing the complex state of a file system tree and ensuring the LLM response parses correctly into the UI.

**Safety Checks:**
- [ ] Ensure types accommodate potential API failures (optional fields).

**Technical Details:**
Update `types.ts` to include interfaces: `RepoFile` (path, content, size), `AnalysisContext` (tree structure string), and `PlanStep` (id, action, file, rationale). Define a Zod schema or JSON schema if structured output validation is required later.

---


### Step 2: Phase 2: GitHub Tree Fetching Service
**Complexity:** Medium
**Files:** services/github.ts

Implement a service to fetch the repository file tree via GitHub API, adhering to `.gitignore` principles.

**Rationale:**
The browser cannot run `git`. We must use the GitHub REST API to fetch the tree recursively. Filtering irrelevant files (images, lockfiles) at this stage prevents wasted API calls and context usage.

**Safety Checks:**
- [ ] Check for GitHub API rate limits.
- [ ] Handle repo not found or private repo errors gracefully.

**Technical Details:**
Create `services/github.ts`. Implement `fetchRepoTree(owner, repo)` using the Git Database API (GET /repos/{owner}/{repo}/git/trees/{sha}?recursive=1). Implement client-side filtering to exclude common non-code paths (e.g., `node_modules`, `.png`, `package-lock.json`).

---


### Step 3: Phase 2: Context Compression Utility
**Complexity:** Low
**Files:** services/treeUtils.ts

Develop a utility to convert the raw JSON file tree into a token-optimized string representation.

**Rationale:**
Sending raw JSON trees consumes excessive tokens. A visual tree format (like the `tree` command output) provides structural context to the LLM with minimal overhead.

**Safety Checks:**
- [ ] Ensure very deep directory structures do not cause recursion stack overflows.
- [ ] Truncate output if the tree exceeds a safe token count (e.g., 500 lines).

**Technical Details:**
Create `services/treeUtils.ts`. Implement a function `generateTreeString(files: RepoFile[]): string`. This function should generate an indented text representation of the directory structure to be injected into the System Prompt.

---


### Step 4: Phase 3: Client-Side Security Layer
**Complexity:** Medium
**Files:** services/security.ts

Implement a content scrubber to detect and redact secrets before sending code to the AI provider.

**Rationale:**
Prevent accidental leakage of API keys or credentials found in the user's fetched code to the third-party AI service.

**Safety Checks:**
- [ ] Verify redaction does not corrupt code structure (only redact values, not keys).
- [ ] Add unit tests for known secret patterns.

**Technical Details:**
Create `services/security.ts`. Implement `redactSecrets(content: string): string`. Use regex patterns to identify high-entropy strings, specific headers (e.g., `BEGIN RSA PRIVATE KEY`), or known patterns (AWS keys). Replace matches with `[REDACTED]`.

---


### Step 5: Phase 4: Two-Stage AI Analysis Service
**Complexity:** High
**Files:** services/gemini.ts

Refactor the Gemini service to support a 'Plan -> Read -> Analyze' workflow.

**Rationale:**
Reading the entire repo is impossible due to context windows. The AI must first see the tree to decide which files are relevant, then analyze only those files.

**Safety Checks:**
- [ ] Hard limit the number of files fetched in stage 2 (e.g., max 10 files) to prevent browser crashing.
- [ ] Handle case where AI requests non-existent files.

**Technical Details:**
Update `services/gemini.ts`. 
1. create `identifyRelevantFiles(userGoal, fileTree)`: Returns list of paths.
2. create `generateImplementationPlan(userGoal, fileContents)`: Returns the detailed Markdown checklist.
Ensure the System Prompt enforces the specific Markdown checkbox syntax.

---


### Step 6: Phase 5: Markdown Export Integration
**Complexity:** Low
**Files:** App.tsx, components/PlanView.tsx

Update the UI to display the generated plan and allow exporting as `TODO.md`.

**Rationale:**
The goal is to provide a file that can be passed to a Coding Agent or saved to the repo.

**Safety Checks:**
- [ ] Sanitize filenames before download.
- [ ] Ensure fallback if plan generation fails or is empty.

**Technical Details:**
Update `App.tsx` or create `components/PlanView.tsx`. Render the markdown. Add a 'Download TODO.md' button that creates a Blob from the markdown string and triggers a file download.

---


Generated by GitArchitect
