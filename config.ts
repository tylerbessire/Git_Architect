/**
 * Application Configuration
 * Centralizes environment variable access and validation.
 */

export type AiProvider = 'gemini' | 'local';

export interface AiSettings {
  provider: AiProvider;
  apiKey?: string; // For Gemini
  baseUrl?: string; // For Local (e.g., http://localhost:11434/v1)
  model?: string;   // For Local (e.g., llama3)
}

const STORAGE_KEY = 'git_architect_settings';

const DEFAULT_SETTINGS: AiSettings = {
  provider: 'gemini',
  apiKey: '',
  baseUrl: 'http://localhost:11434/v1',
  model: 'llama3'
};

export const getSettings = (): AiSettings => {
  // 1. Check Environment Variable (Pre-configured Gemini)
  if (process.env.API_KEY && process.env.API_KEY !== 'undefined') {
    return {
        ...DEFAULT_SETTINGS,
        provider: 'gemini',
        apiKey: process.env.API_KEY
    };
  }
  
  // 2. Check Local Storage
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) {
    try {
        return { ...DEFAULT_SETTINGS, ...JSON.parse(stored) };
    } catch (e) {
        return DEFAULT_SETTINGS;
    }
  }

  return DEFAULT_SETTINGS;
};

export const saveSettings = (settings: AiSettings) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
};

export const clearSettings = () => {
  localStorage.removeItem(STORAGE_KEY);
};

export const hasValidConfig = (): boolean => {
  const settings = getSettings();
  if (settings.provider === 'gemini') {
    return !!settings.apiKey;
  }
  // For local, we assume if they selected it, it's configured (defaults exist)
  return !!settings.baseUrl;
};

export const config = {
  get settings() {
    return getSettings();
  },
  githubApiBase: 'https://api.github.com',
};