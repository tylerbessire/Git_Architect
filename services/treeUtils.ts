import { RepoFile } from '../types';

const MAX_TREE_LINES = 500;
const INDENT = '  ';

interface TreeNode {
  name: string;
  type: 'file' | 'dir';
  children: Map<string, TreeNode>;
}

/**
 * Builds a hierarchical tree structure from a flat list of files
 */
const buildTree = (files: RepoFile[]): TreeNode => {
  const root: TreeNode = {
    name: '',
    type: 'dir',
    children: new Map()
  };

  for (const file of files) {
    const parts = file.path.split('/');
    let currentNode = root;

    parts.forEach((part, index) => {
      const isLastPart = index === parts.length - 1;
      const isFile = isLastPart && file.type === 'blob';

      if (!currentNode.children.has(part)) {
        currentNode.children.set(part, {
          name: part,
          type: isFile ? 'file' : 'dir',
          children: new Map()
        });
      }

      currentNode = currentNode.children.get(part)!;
    });
  }

  return root;
};

/**
 * Converts tree structure to a visual string representation
 */
const treeToString = (
  node: TreeNode,
  prefix: string = '',
  isLast: boolean = true,
  lines: string[] = []
): string[] => {
  if (lines.length >= MAX_TREE_LINES) {
    if (lines.length === MAX_TREE_LINES) {
      lines.push('[... truncated for token limit ...]');
    }
    return lines;
  }

  if (node.name) {
    const connector = isLast ? '└── ' : '├── ';
    const marker = node.type === 'dir' ? '📁 ' : '📄 ';
    lines.push(prefix + connector + marker + node.name);
  }

  const children = Array.from(node.children.values());
  const sortedChildren = children.sort((a, b) => {
    // Directories first, then files
    if (a.type !== b.type) {
      return a.type === 'dir' ? -1 : 1;
    }
    return a.name.localeCompare(b.name);
  });

  sortedChildren.forEach((child, index) => {
    const isLastChild = index === sortedChildren.length - 1;
    const extension = isLast ? '    ' : '│   ';
    const newPrefix = node.name ? prefix + extension : '';
    treeToString(child, newPrefix, isLastChild, lines);
  });

  return lines;
};

/**
 * Generates a token-optimized string representation of the repository tree
 * @param files Array of repository files
 * @returns Formatted tree structure string
 */
export const generateTreeString = (files: RepoFile[]): string => {
  if (files.length === 0) {
    return 'Empty repository';
  }

  // Build hierarchical structure
  const tree = buildTree(files);

  // Convert to string with visual tree structure
  const lines = treeToString(tree);

  // Add header
  const header = `Repository Structure (${files.length} files):\n`;
  return header + lines.join('\n');
};

/**
 * Generates a simplified list for very large repositories
 */
export const generateSimplifiedTree = (files: RepoFile[]): string => {
  const groupedByDirectory = new Map<string, number>();

  files.forEach(file => {
    const dir = file.path.includes('/')
      ? file.path.substring(0, file.path.lastIndexOf('/'))
      : '/';
    groupedByDirectory.set(dir, (groupedByDirectory.get(dir) || 0) + 1);
  });

  const lines: string[] = [`Repository Summary (${files.length} files):\n`];

  Array.from(groupedByDirectory.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 50)
    .forEach(([dir, count]) => {
      lines.push(`  ${dir}: ${count} file${count > 1 ? 's' : ''}`);
    });

  if (groupedByDirectory.size > 50) {
    lines.push(`  ... and ${groupedByDirectory.size - 50} more directories`);
  }

  return lines.join('\n');
};

/**
 * Counts estimated tokens for the tree string
 * Simple heuristic: ~4 characters per token
 */
export const estimateTreeTokens = (treeString: string): number => {
  return Math.ceil(treeString.length / 4);
};

/**
 * Get important files by extensions (useful for targeted analysis)
 */
export const filterImportantFiles = (files: RepoFile[]): RepoFile[] => {
  const importantExtensions = [
    '.ts', '.tsx', '.js', '.jsx',
    '.py', '.java', '.go', '.rs', '.cpp', '.c', '.h',
    '.vue', '.svelte',
    '.json', '.yml', '.yaml', '.toml',
    'Dockerfile', 'Makefile',
    '.md', '.txt'
  ];

  return files.filter(file => {
    const fileName = file.path.toLowerCase();
    return importantExtensions.some(ext => fileName.endsWith(ext)) ||
           fileName === 'package.json' ||
           fileName === 'requirements.txt' ||
           fileName === 'go.mod' ||
           fileName === 'cargo.toml' ||
           fileName.includes('readme');
  });
};
