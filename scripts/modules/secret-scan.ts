/**
 * Secret Scan Module
 * Scans content for secrets and redacts them
 */

// createHash not used in this module

// Common secret patterns
const SECRET_PATTERNS = [
  // GitHub tokens
  { pattern: /ghp_[a-zA-Z0-9]{36}/g, name: 'GitHub Personal Access Token' },
  { pattern: /github_pat_[a-zA-Z0-9_]{82}/g, name: 'GitHub Fine-grained Token' },
  // AWS keys
  { pattern: /AKIA[0-9A-Z]{16}/g, name: 'AWS Access Key ID' },
  { pattern: /aws_access_key_id\s*=\s*[A-Z0-9]{20}/gi, name: 'AWS Access Key' },
  { pattern: /aws_secret_access_key\s*=\s*[a-zA-Z0-9/+=]{40}/gi, name: 'AWS Secret Key' },
  // JWT tokens
  { pattern: /eyJ[a-zA-Z0-9_-]+\.eyJ[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+/g, name: 'JWT Token' },
  // Private keys
  {
    pattern: /-----BEGIN\s+(RSA\s+)?PRIVATE KEY-----[\s\S]*?-----END\s+(RSA\s+)?PRIVATE KEY-----/g,
    name: 'Private Key',
  },
  // Passwords in config
  { pattern: /password\s*[:=]\s*["']?[^\s"']{8,}["']?/gi, name: 'Password' },
  // API keys
  { pattern: /api[_-]?key\s*[:=]\s*["']?[a-zA-Z0-9_-]{20,}["']?/gi, name: 'API Key' },
];

const REDACTION_MARKER = '[REDACTED]';

export interface SecretScanResult {
  hasSecrets: boolean;
  redactedContent: string;
  secretsFound: Array<{ type: string; count: number }>;
}

/**
 * Calculate entropy of a string (simple heuristic)
 */
function calculateEntropy(str: string): number {
  const len = str.length;
  const freq: Record<string, number> = {};
  for (const char of str) {
    freq[char] = (freq[char] || 0) + 1;
  }
  let entropy = 0;
  for (const count of Object.values(freq)) {
    const p = count / len;
    entropy -= p * Math.log2(p);
  }
  return entropy;
}

/**
 * Check if a string looks like a high-entropy secret
 */
function isHighEntropySecret(str: string): boolean {
  if (str.length < 16) return false;
  const entropy = calculateEntropy(str);
  // High entropy threshold (random strings have ~4-5 bits per character)
  return entropy > 3.5;
}

export function scanAndRedact(content: string): SecretScanResult {
  let redactedContent = content;
  const secretsFound: Array<{ type: string; count: number }> = [];
  let hasSecrets = false;

  // Check against known patterns
  for (const { pattern, name } of SECRET_PATTERNS) {
    const matches = content.match(pattern);
    if (matches && matches.length > 0) {
      hasSecrets = true;
      secretsFound.push({ type: name, count: matches.length });
      redactedContent = redactedContent.replace(pattern, REDACTION_MARKER);
    }
  }

  // Check for high-entropy strings (potential secrets)
  const words = content.split(/\s+/);
  for (const word of words) {
    const cleaned = word.replace(/[^a-zA-Z0-9]/g, '');
    if (isHighEntropySecret(cleaned) && cleaned.length >= 16) {
      hasSecrets = true;
      if (!secretsFound.find((s) => s.type === 'High-entropy string')) {
        secretsFound.push({ type: 'High-entropy string', count: 0 });
      }
      const idx = secretsFound.findIndex((s) => s.type === 'High-entropy string');
      if (idx >= 0) {
        secretsFound[idx].count++;
      }
      redactedContent = redactedContent.replace(new RegExp(cleaned, 'g'), REDACTION_MARKER);
    }
  }

  return {
    hasSecrets,
    redactedContent,
    secretsFound,
  };
}

export function generateScanReport(results: SecretScanResult[]): string {
  const totalSecrets = results.filter((r) => r.hasSecrets).length;
  if (totalSecrets === 0) {
    return '✓ No secrets detected';
  }

  const report: string[] = [`⚠️  Secrets detected in ${totalSecrets} chunks:`];
  const secretTypes: Record<string, number> = {};

  for (const result of results) {
    for (const secret of result.secretsFound) {
      secretTypes[secret.type] = (secretTypes[secret.type] || 0) + secret.count;
    }
  }

  for (const [type, count] of Object.entries(secretTypes)) {
    report.push(`  - ${type}: ${count} occurrence(s)`);
  }

  return report.join('\n');
}
