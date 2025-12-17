/**
 * Security utilities for detecting and redacting secrets in code
 * Prevents accidental leakage of API keys and credentials to AI providers
 */

interface SecretPattern {
  name: string;
  pattern: RegExp;
  description: string;
}

// Common secret patterns to detect
const SECRET_PATTERNS: SecretPattern[] = [
  {
    name: 'Generic API Key',
    pattern: /(?:api[_-]?key|apikey|api[_-]?secret)[\s]*[=:]["']?([a-zA-Z0-9_\-]{20,})["']?/gi,
    description: 'Generic API key pattern'
  },
  {
    name: 'AWS Access Key',
    pattern: /AKIA[0-9A-Z]{16}/g,
    description: 'AWS Access Key ID'
  },
  {
    name: 'AWS Secret Key',
    pattern: /aws[_-]?secret[_-]?access[_-]?key[\s]*[=:]["']?([a-zA-Z0-9/+=]{40})["']?/gi,
    description: 'AWS Secret Access Key'
  },
  {
    name: 'Google API Key',
    pattern: /AIza[0-9A-Za-z\-_]{35}/g,
    description: 'Google API Key'
  },
  {
    name: 'GitHub Token',
    pattern: /gh[pousr]_[A-Za-z0-9_]{36,}/g,
    description: 'GitHub Personal Access Token'
  },
  {
    name: 'Generic Secret',
    pattern: /(?:secret|password|passwd|pwd|token)[\s]*[=:]["']([^"'\s]{8,})["']/gi,
    description: 'Generic secret/password pattern'
  },
  {
    name: 'Private Key',
    pattern: /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/g,
    description: 'Private Key Header'
  },
  {
    name: 'OAuth Token',
    pattern: /(?:oauth|bearer)[\s]+([a-zA-Z0-9\-._~+/]+=*)/gi,
    description: 'OAuth Bearer Token'
  },
  {
    name: 'Stripe Key',
    pattern: /(?:sk|pk)_(test|live)_[0-9a-zA-Z]{24,}/g,
    description: 'Stripe API Key'
  },
  {
    name: 'OpenAI API Key',
    pattern: /sk-[a-zA-Z0-9]{48}/g,
    description: 'OpenAI API Key'
  },
  {
    name: 'Anthropic API Key',
    pattern: /sk-ant-[a-zA-Z0-9\-]{95,}/g,
    description: 'Anthropic/Claude API Key'
  },
  {
    name: 'High Entropy String',
    pattern: /["']([a-zA-Z0-9+/]{32,}={0,2})["']/g,
    description: 'High entropy base64-like string'
  },
  {
    name: 'Database Connection String',
    pattern: /(?:mongodb|mysql|postgresql|postgres):\/\/[^\s"']+/gi,
    description: 'Database connection string'
  },
  {
    name: 'JWT Token',
    pattern: /eyJ[a-zA-Z0-9_-]*\.eyJ[a-zA-Z0-9_-]*\.[a-zA-Z0-9_-]*/g,
    description: 'JWT Token'
  }
];

// Environment variable patterns (should not be sent with values)
const ENV_VAR_PATTERN = /^[A-Z_][A-Z0-9_]*\s*=\s*.+$/gm;

export interface SecretDetectionResult {
  found: boolean;
  redactedContent: string;
  detectedSecrets: {
    type: string;
    line: number;
    context: string;
  }[];
}

/**
 * Calculate entropy of a string (helps detect random API keys)
 */
const calculateEntropy = (str: string): number => {
  const len = str.length;
  const frequencies = new Map<string, number>();

  for (const char of str) {
    frequencies.set(char, (frequencies.get(char) || 0) + 1);
  }

  let entropy = 0;
  for (const count of frequencies.values()) {
    const probability = count / len;
    entropy -= probability * Math.log2(probability);
  }

  return entropy;
};

/**
 * Check if a string looks like a secret based on entropy
 */
const isHighEntropyString = (str: string): boolean => {
  if (str.length < 20 || str.length > 200) return false;
  const entropy = calculateEntropy(str);
  // High entropy threshold (random-looking strings)
  return entropy > 4.5;
};

/**
 * Redact secrets from file content
 * @param content The file content to scan
 * @param filePath Optional file path for context
 * @returns Detection result with redacted content
 */
export const redactSecrets = (content: string, filePath?: string): SecretDetectionResult => {
  let redactedContent = content;
  const detectedSecrets: { type: string; line: number; context: string }[] = [];

  // Track line numbers
  const lines = content.split('\n');

  // Skip if file is too large (likely binary or minified)
  if (content.length > 500000) {
    return {
      found: false,
      redactedContent: '[FILE TOO LARGE - SKIPPED FOR SECURITY]',
      detectedSecrets: []
    };
  }

  // Apply each pattern
  SECRET_PATTERNS.forEach(({ name, pattern, description }) => {
    const matches = content.matchAll(pattern);

    for (const match of matches) {
      if (!match[0]) continue;

      // Find which line this match is on
      const beforeMatch = content.substring(0, match.index || 0);
      const lineNumber = beforeMatch.split('\n').length;

      // Get context (the line where secret was found)
      const contextLine = lines[lineNumber - 1]?.substring(0, 80) || '';

      detectedSecrets.push({
        type: name,
        line: lineNumber,
        context: contextLine
      });

      // Redact the secret
      redactedContent = redactedContent.replace(
        match[0],
        `[REDACTED_${name.toUpperCase().replace(/\s/g, '_')}]`
      );
    }
  });

  // Additional check for .env files
  if (filePath?.includes('.env') || filePath?.endsWith('.env.example')) {
    redactedContent = redactedContent.replace(
      ENV_VAR_PATTERN,
      (match) => {
        const [key] = match.split('=');
        return `${key}=[REDACTED]`;
      }
    );
  }

  return {
    found: detectedSecrets.length > 0,
    redactedContent,
    detectedSecrets
  };
};

/**
 * Scan multiple files and return a security report
 */
export const scanFiles = (
  files: Map<string, string>
): {
  totalScanned: number;
  filesWithSecrets: number;
  totalSecretsFound: number;
  details: Map<string, SecretDetectionResult>;
} => {
  const details = new Map<string, SecretDetectionResult>();
  let totalSecretsFound = 0;
  let filesWithSecrets = 0;

  for (const [filePath, content] of files.entries()) {
    const result = redactSecrets(content, filePath);
    details.set(filePath, result);

    if (result.found) {
      filesWithSecrets++;
      totalSecretsFound += result.detectedSecrets.length;
    }
  }

  return {
    totalScanned: files.size,
    filesWithSecrets,
    totalSecretsFound,
    details
  };
};

/**
 * Check if a filename is likely to contain secrets
 */
export const isSensitiveFile = (filePath: string): boolean => {
  const sensitivePatterns = [
    '.env',
    '.env.local',
    '.env.production',
    'credentials',
    'secrets',
    'config.json',
    'config.yaml',
    'config.yml',
    '.aws/credentials',
    '.ssh/id_rsa',
    'key.pem',
    'certificate.pem'
  ];

  const lowerPath = filePath.toLowerCase();
  return sensitivePatterns.some(pattern => lowerPath.includes(pattern));
};

/**
 * Sanitize content before sending to AI provider
 * This is the main function to use before any API calls
 */
export const sanitizeForAI = (
  content: string,
  filePath?: string
): { content: string; warnings: string[] } => {
  const result = redactSecrets(content, filePath);
  const warnings: string[] = [];

  if (result.found) {
    warnings.push(
      `⚠️ Detected ${result.detectedSecrets.length} potential secret(s) in ${filePath || 'content'} - redacted before sending to AI`
    );

    // Log details to console for debugging
    console.warn(`Security: Redacted secrets in ${filePath}:`, result.detectedSecrets);
  }

  return {
    content: result.redactedContent,
    warnings
  };
};
