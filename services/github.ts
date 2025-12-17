import { Repo, RepoTreeResponse, RepoFile } from '../types';

const GITHUB_API_BASE = 'https://api.github.com';

// Files and directories to exclude from analysis
const EXCLUDED_PATHS = [
  'node_modules',
  '.git',
  'dist',
  'build',
  'out',
  'coverage',
  '.next',
  '.nuxt',
  'vendor',
  '__pycache__',
  '.venv',
  'venv',
  'target',
  '.idea',
  '.vscode'
];

const EXCLUDED_EXTENSIONS = [
  '.png', '.jpg', '.jpeg', '.gif', '.svg', '.ico', '.webp',
  '.mp4', '.mov', '.avi', '.mkv',
  '.mp3', '.wav', '.flac',
  '.zip', '.tar', '.gz', '.rar', '.7z',
  '.exe', '.dll', '.so', '.dylib',
  '.lock', '.log',
  '.min.js', '.min.css',
  '.map',
  '.woff', '.woff2', '.ttf', '.eot',
  '.pdf', '.doc', '.docx'
];

const MAX_FILE_SIZE = 100 * 1024; // 100KB limit for individual files

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

// Helper function to check if a file should be excluded
const shouldExcludeFile = (path: string, size?: number): boolean => {
  // Check if path contains any excluded directories
  const pathParts = path.split('/');
  if (pathParts.some(part => EXCLUDED_PATHS.includes(part))) {
    return true;
  }

  // Check file extension
  if (EXCLUDED_EXTENSIONS.some(ext => path.toLowerCase().endsWith(ext))) {
    return true;
  }

  // Check file size
  if (size && size > MAX_FILE_SIZE) {
    return true;
  }

  return false;
};

// Fetch full repository tree recursively using Git Database API
export const getRepoTree = async (fullName: string, branch: string = 'main'): Promise<RepoTreeResponse> => {
  try {
    const [owner, repo] = fullName.split('/');

    // First get the commit SHA for the branch
    const branchResponse = await fetch(`${GITHUB_API_BASE}/repos/${fullName}/git/ref/heads/${branch}`);

    if (!branchResponse.ok) {
      throw new Error(`Failed to fetch branch ${branch}. Status: ${branchResponse.statusText}`);
    }

    const branchData = await branchResponse.json();
    const commitSha = branchData.object.sha;

    // Get the tree for this commit with recursive=1 to get all files
    const treeResponse = await fetch(
      `${GITHUB_API_BASE}/repos/${fullName}/git/trees/${commitSha}?recursive=1`
    );

    if (treeResponse.status === 403) {
      throw new Error("GitHub API rate limit exceeded. Please try again later.");
    }

    if (!treeResponse.ok) {
      throw new Error(`Failed to fetch repository tree. Status: ${treeResponse.statusText}`);
    }

    const treeData: RepoTreeResponse = await treeResponse.json();

    // Filter out excluded files and directories
    const filteredTree = treeData.tree.filter(item =>
      !shouldExcludeFile(item.path, item.size)
    );

    return {
      ...treeData,
      tree: filteredTree
    };
  } catch (error: any) {
    console.error("Failed to fetch repository tree:", error);
    throw error;
  }
};

// Fetch raw file content from GitHub
export const getFileContent = async (
  fullName: string,
  filePath: string,
  branch: string = 'main'
): Promise<string> => {
  try {
    const url = `https://raw.githubusercontent.com/${fullName}/${branch}/${filePath}`;
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Failed to fetch file ${filePath}: ${response.statusText}`);
    }

    return await response.text();
  } catch (error: any) {
    console.warn(`Could not fetch file ${filePath}:`, error);
    return `[Error fetching file: ${error.message}]`;
  }
};