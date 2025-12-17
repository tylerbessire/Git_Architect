import { Repo } from '../types';

const GITHUB_API_BASE = 'https://api.github.com';

export const getRepoDetails = async (fullName: string): Promise<Repo> => {
  try {
    const response = await fetch(`${GITHUB_API_BASE}/repos/${fullName}`);
    
    if (response.status === 404) throw new Error("Repository not found.");
    if (response.status === 403) throw new Error("Rate limit exceeded.");
    if (!response.ok) throw new Error(`Error: ${response.statusText}`);

    return await response.json();
  } catch (error) {
    // We re-throw specifically so the caller knows the direct fetch failed
    throw error;
  }
};

export const searchRepos = async (query: string): Promise<Repo[]> => {
  if (!query) return [];
  try {
    const response = await fetch(`${GITHUB_API_BASE}/search/repositories?q=${encodeURIComponent(query)}&per_page=5&sort=stars`);
    
    if (response.status === 403) {
      throw new Error("GitHub API rate limit exceeded. Please try again in a few minutes.");
    }
    
    if (!response.ok) {
        throw new Error(`GitHub Search Failed: ${response.statusText}`);
    }
    
    const data = await response.json();
    return data.items || [];
  } catch (error: any) {
    console.error("GitHub search error:", error);
    throw error; // Re-throw to handle in UI
  }
};

export const getRepoReadme = async (fullName: string, defaultBranch: string): Promise<string> => {
  try {
    // Try standard README.md locations
    const possiblePaths = ['README.md', 'readme.md', 'README.txt', 'Readme.md'];
    
    for (const path of possiblePaths) {
      const url = `https://raw.githubusercontent.com/${fullName}/${defaultBranch}/${path}`;
      const response = await fetch(url);
      if (response.ok) {
        return await response.text();
      }
    }
    return "No README found.";
  } catch (error) {
    console.warn("Could not fetch README:", error);
    return "Could not fetch README (Network Error).";
  }
};

export const getRepoStructure = async (fullName: string): Promise<string> => {
  try {
    // We limit to top level to save bandwidth, but could use recursive tree for deeper context if needed
    const response = await fetch(`${GITHUB_API_BASE}/repos/${fullName}/contents`);
    
    if (response.status === 403) return "Structure hidden (Rate Limit)";
    if (!response.ok) return "Could not fetch file structure.";
    
    const data = await response.json();
    if (Array.isArray(data)) {
        const files = data.map((item: any) => `- ${item.path} (${item.type})`).join('\n');
        return files;
    }
    return "Unknown structure (Root is not a directory)";
  } catch (error) {
    console.warn("Could not fetch structure:", error);
    return "Could not fetch structure (Network Error).";
  }
};