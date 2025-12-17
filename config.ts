/**
 * Application Configuration
 * Centralizes environment variable access and validation.
 */

const STORAGE_KEY = 'git_architect_api_key';

export const getApiKey = (): string => {
  // 1. Check Environment Variable (Build time / Server injected)
  // Note: verify strictly against undefined/null strings to avoid false positives
  if (process.env.API_KEY && process.env.API_KEY !== 'undefined') {
    return process.env.API_KEY;
  }
  
  // 2. Check Local Storage (User entered)
  return localStorage.getItem(STORAGE_KEY) || '';
};

export const storeApiKey = (key: string) => {
  localStorage.setItem(STORAGE_KEY, key);
};

export const clearApiKey = () => {
  localStorage.removeItem(STORAGE_KEY);
};

export const hasValidKey = (): boolean => {
  return !!getApiKey();
};

export const config = {
  // Getter to ensure we always get the latest value
  get apiKey() {
    return getApiKey();
  },
  githubApiBase: 'https://api.github.com',
};