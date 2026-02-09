#!/usr/bin/env tsx
/**
 * Security Verification Script
 * Checks for potential token leaks in code and output files
 */

import { readFileSync, existsSync, readdirSync, statSync } from 'fs';
import { join } from 'path';
import chalk from 'chalk';

const TOKEN_PATTERNS = [
  /ghp_[a-zA-Z0-9]{36}/g,
  /github_pat_[a-zA-Z0-9_]{82}/g,
  /gho_[a-zA-Z0-9]{36}/g,
  /ghu_[a-zA-Z0-9]{36}/g,
];

const EXCLUDE_DIRS = ['node_modules', '.git', 'dist', '.repos', 'coverage'];
const EXCLUDE_FILES = ['verify-security.ts', 'SECURITY.md', 'docs/SECURITY.md'];

function checkFile(filePath: string): { found: boolean; matches: string[] } {
  if (!existsSync(filePath)) {
    return { found: false, matches: [] };
  }

  try {
    const content = readFileSync(filePath, 'utf8');
    const matches: string[] = [];

    for (const pattern of TOKEN_PATTERNS) {
      const found = content.match(pattern);
      if (found) {
        matches.push(...found);
      }
    }

    // Check for ACTION_TOKEN with actual token value (not just pattern definitions)
    // Only flag if we find an actual token pattern match AND ACTION_TOKEN string
    const hasTokenPattern = matches.length > 0;
    const hasActionToken = content.includes('ACTION_TOKEN');

    // Only flag if both conditions are true AND it's not just pattern definitions
    if (hasActionToken && hasTokenPattern) {
      // Check if it's just pattern definitions (like /ghp_/ in regex)
      const isPatternDefinition =
        /\/ghp_|\/github_pat_|TOKEN_PATTERNS|pattern.*ghp_|pattern.*github_pat_/i.test(content);
      if (!isPatternDefinition) {
        matches.push('ACTION_TOKEN with token value detected');
      }
    }

    return {
      found: matches.length > 0,
      matches: [...new Set(matches)],
    };
  } catch {
    return { found: false, matches: [] };
  }
}

function scanDirectory(dir: string, depth = 0): Array<{ path: string; matches: string[] }> {
  if (depth > 10) return []; // Prevent infinite recursion

  const results: Array<{ path: string; matches: string[] }> = [];

  try {
    const entries = readdirSync(dir);

    for (const entry of entries) {
      // Skip excluded directories
      if (EXCLUDE_DIRS.includes(entry)) {
        continue;
      }

      const fullPath = join(dir, entry);
      const stat = statSync(fullPath);

      if (stat.isDirectory()) {
        results.push(...scanDirectory(fullPath, depth + 1));
      } else if (stat.isFile()) {
        // Skip excluded files
        if (EXCLUDE_FILES.includes(entry)) {
          continue;
        }

        // Only check text files
        if (
          entry.endsWith('.ts') ||
          entry.endsWith('.tsx') ||
          entry.endsWith('.js') ||
          entry.endsWith('.jsx') ||
          entry.endsWith('.json') ||
          entry.endsWith('.md') ||
          entry.endsWith('.yml') ||
          entry.endsWith('.yaml')
        ) {
          const result = checkFile(fullPath);
          if (result.found) {
            results.push({ path: fullPath, matches: result.matches });
          }
        }
      }
    }
  } catch {
    // Skip directories we can't read
  }

  return results;
}

function main() {
  console.log(chalk.blue.bold('\n🔒 Security Verification\n'));

  const issues: Array<{ path: string; matches: string[] }> = [];

  // Check source code
  console.log(chalk.cyan('Checking source code...'));
  const sourceIssues = scanDirectory('./src');
  const scriptIssues = scanDirectory('./scripts');
  issues.push(...sourceIssues, ...scriptIssues);

  // Check config files (exclude SECURITY.md)
  console.log(chalk.cyan('Checking config files...'));
  const configFiles = ['rag.config.json', '.env', '.env.local'];
  for (const file of configFiles) {
    if (!EXCLUDE_FILES.includes(file)) {
      const result = checkFile(file);
      if (result.found) {
        issues.push({ path: file, matches: result.matches });
      }
    }
  }

  // Check output files
  console.log(chalk.cyan('Checking output files...'));
  const outputFiles = ['dist/kb.json', 'dist/kb.min.json', 'public/kb.json'];
  for (const file of outputFiles) {
    const result = checkFile(file);
    if (result.found) {
      issues.push({ path: file, matches: result.matches });
    }
  }

  // Report results
  if (issues.length === 0) {
    console.log(chalk.green('✅ No security issues found!'));
    console.log(chalk.green('   - No tokens detected in code'));
    console.log(chalk.green('   - No tokens detected in output files'));
    console.log(chalk.green('   - Configuration is secure\n'));
    process.exit(0);
  } else {
    console.log(chalk.red(`\n⚠️  Found ${issues.length} potential security issue(s):\n`));
    for (const issue of issues) {
      console.log(chalk.yellow(`  File: ${issue.path}`));
      console.log(chalk.red(`  Issues: ${issue.matches.join(', ')}\n`));
    }
    console.log(chalk.red('❌ Security check failed! Please review the issues above.\n'));
    process.exit(1);
  }
}

main();
