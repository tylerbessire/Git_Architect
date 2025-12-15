/**
 * Application Configuration
 * Centralizes environment variable access and validation.
 */

interface AppConfig {
  apiKey: string;
  githubApiBase: string;
}

const getEnvVar = (key: string): string => {
  // In a real build environment (Vite/Webpack), this would access process.env
  const value = process.env[key];
  return value || '';
};

export const config: AppConfig = {
  apiKey: getEnvVar('API_KEY'),
  githubApiBase: 'https://api.github.com',
};

export const validateConfig = (): { valid: boolean; missing: string[] } => {
  const missing: string[] = [];
  if (!config.apiKey) {
    missing.push('API_KEY');
  }
  return {
    valid: missing.length === 0,
    missing
  };
};