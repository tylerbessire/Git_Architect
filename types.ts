export interface Repo {
  id: number;
  name: string;
  full_name: string;
  description: string;
  html_url: string;
  stargazers_count: number;
  language: string;
  owner: {
    login: string;
    avatar_url: string;
  };
  default_branch: string;
}

export interface Step {
  id: number;
  title: string;
  description: string;
  rationale: string;
  technicalDetails: string;
  filesUnknown: boolean; 
  affectedFiles: string[];
  complexity: 'Low' | 'Medium' | 'High';
  safetyChecks: string[]; // New field for safety
}

export interface GeneratedPlan {
  title: string;
  summary: string;
  researchNotes?: string; // New field for research context
  steps: Step[];
}

export interface ChatMessage {
  role: 'user' | 'model';
  content: string;
  timestamp: number;
}

export type StepChatHistory = Record<number, ChatMessage[]>;