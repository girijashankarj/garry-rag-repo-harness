/**
 * Ignore Filters Module
 * Implements .ragignore support and file filtering
 */

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { minimatch } from 'minimatch';

const DEFAULT_DENYLIST = [
  '.env',
  '*.pem',
  '*.key',
  '**/credentials/**',
  '**/secrets/**',
  '**/node_modules/**',
  '**/dist/**',
  '**/build/**',
  '**/.git/**',
  '**/.next/**',
  '**/.cache/**',
  '**/coverage/**',
  '**/*.log',
  '**/package-lock.json',
  '**/yarn.lock',
  '**/pnpm-lock.yaml',
];

const ALLOWED_EXTENSIONS = [
  '.md',
  '.txt',
  '.ts',
  '.tsx',
  '.js',
  '.jsx',
  '.json',
  '.yml',
  '.yaml',
  '.sql',
];

export interface IgnoreConfig {
  denylist: string[];
  allowlist: string[];
}

export function loadRagIgnore(repoPath: string): IgnoreConfig {
  const ragIgnorePath = join(repoPath, '.ragignore');
  const gitIgnorePath = join(repoPath, '.gitignore');

  const denylist = [...DEFAULT_DENYLIST];
  const allowlist: string[] = [];

  // Load .ragignore if exists
  if (existsSync(ragIgnorePath)) {
    const content = readFileSync(ragIgnorePath, 'utf8');
    const lines = content
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith('#'));

    for (const line of lines) {
      if (line.startsWith('!')) {
        // Allowlist entry
        allowlist.push(line.slice(1));
      } else {
        // Denylist entry
        denylist.push(line);
      }
    }
  }

  // Also respect .gitignore patterns
  if (existsSync(gitIgnorePath)) {
    const content = readFileSync(gitIgnorePath, 'utf8');
    const lines = content
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith('#'));

    for (const line of lines) {
      if (line && !denylist.includes(line)) {
        denylist.push(line);
      }
    }
  }

  return { denylist, allowlist };
}

export function shouldIncludeFile(
  filePath: string,
  repoPath: string,
  config: IgnoreConfig
): boolean {
  const relativePath = filePath.replace(repoPath + '/', '');

  // Check allowlist first (takes precedence)
  for (const pattern of config.allowlist) {
    if (minimatch(relativePath, pattern)) {
      return true;
    }
  }

  // Check denylist
  for (const pattern of config.denylist) {
    if (minimatch(relativePath, pattern)) {
      return false;
    }
  }

  // Check file extension
  const ext = relativePath.substring(relativePath.lastIndexOf('.'));
  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    return false;
  }

  return true;
}
