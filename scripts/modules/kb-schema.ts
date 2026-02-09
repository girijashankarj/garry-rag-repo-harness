/**
 * KB Schema Module
 * Defines TypeScript types for kb.json structure and validation
 */

import type { KnowledgeBase } from '../../src/types/kb.types.ts';
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

const MAX_KB_SIZE = 20 * 1024 * 1024; // 20MB

export function validateKB(kb: KnowledgeBase): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Validate meta
  if (!kb.meta.generatedAt) {
    errors.push('Missing meta.generatedAt');
  }
  if (!['public-only', 'private-local'].includes(kb.meta.sourceScope)) {
    errors.push('Invalid meta.sourceScope');
  }
  if (kb.meta.repoCount < 0) {
    errors.push('Invalid meta.repoCount');
  }
  if (kb.meta.docCount !== kb.docs.length) {
    errors.push(
      `meta.docCount (${kb.meta.docCount}) doesn't match docs.length (${kb.docs.length})`
    );
  }

  // Validate docs
  kb.docs.forEach((doc, idx) => {
    if (!doc.id) errors.push(`Doc ${idx}: missing id`);
    if (!doc.repo) errors.push(`Doc ${idx}: missing repo`);
    if (!doc.path) errors.push(`Doc ${idx}: missing path`);
    if (!doc.lang) errors.push(`Doc ${idx}: missing lang`);
    if (!doc.loc || typeof doc.loc.startLine !== 'number' || typeof doc.loc.endLine !== 'number') {
      errors.push(`Doc ${idx}: invalid loc`);
    }
    if (!doc.contentExcerpt) errors.push(`Doc ${idx}: missing contentExcerpt`);
    if (!doc.hash) errors.push(`Doc ${idx}: missing hash`);
  });

  // Validate index
  if (!kb.index.lunrIndex) {
    errors.push('Missing index.lunrIndex');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

export function ensureSizeConstraint(kb: KnowledgeBase): boolean {
  const jsonString = JSON.stringify(kb);
  const size = Buffer.byteLength(jsonString, 'utf8');

  if (size > MAX_KB_SIZE) {
    console.warn(
      `⚠️  KB size (${(size / 1024 / 1024).toFixed(2)}MB) exceeds limit (${MAX_KB_SIZE / 1024 / 1024}MB)`
    );
    return false;
  }

  console.log(`✓ KB size: ${(size / 1024 / 1024).toFixed(2)}MB`);
  return true;
}

export function writeKB(kb: KnowledgeBase, outputDir: string): void {
  const validation = validateKB(kb);
  if (!validation.valid) {
    throw new Error(`KB validation failed:\n${validation.errors.join('\n')}`);
  }

  if (!ensureSizeConstraint(kb)) {
    throw new Error('KB size exceeds limit');
  }

  const outputPath = join(outputDir, 'kb.json');
  const minOutputPath = join(outputDir, 'kb.min.json');

  // Write pretty-printed version
  writeFileSync(outputPath, JSON.stringify(kb, null, 2), 'utf8');
  console.log(`✓ Written ${outputPath}`);

  // Write minified version
  writeFileSync(minOutputPath, JSON.stringify(kb), 'utf8');
  console.log(`✓ Written ${minOutputPath}`);
}

export function readKB(path: string): KnowledgeBase {
  const content = readFileSync(path, 'utf8');
  return JSON.parse(content) as KnowledgeBase;
}
