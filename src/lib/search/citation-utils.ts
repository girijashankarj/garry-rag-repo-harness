/**
 * Citation Utils
 * Formats citations and generates GitHub links
 */

import type { KBDocument } from '../../types/kb.types.ts';

/**
 * Format citation string
 */
export function formatCitation(doc: KBDocument): string {
  return `${doc.repo}/${doc.path}:${doc.loc.startLine}-${doc.loc.endLine}`;
}

/**
 * Generate GitHub URL for a document
 */
export function getGitHubUrl(doc: KBDocument, branch: string = 'main'): string {
  return `https://github.com/${doc.repo}/blob/${branch}/${doc.path}#L${doc.loc.startLine}-L${doc.loc.endLine}`;
}

/**
 * Format document title with context
 */
export function formatDocumentTitle(doc: KBDocument): string {
  const pathParts = doc.path.split('/');
  const fileName = pathParts[pathParts.length - 1];
  return `${doc.repo} › ${fileName}`;
}

/**
 * Get language display name
 */
export function getLanguageDisplayName(lang: string): string {
  const langMap: Record<string, string> = {
    typescript: 'TypeScript',
    javascript: 'JavaScript',
    markdown: 'Markdown',
    json: 'JSON',
    yaml: 'YAML',
    sql: 'SQL',
    text: 'Text',
  };
  return langMap[lang] || lang;
}

/**
 * Get file type from path
 */
export function getFileType(path: string): string {
  const parts = path.split('.');
  if (parts.length > 1) {
    return parts[parts.length - 1].toLowerCase();
  }
  return 'no-ext';
}

/**
 * Get file name from path
 */
export function getFileName(path: string): string {
  const parts = path.split('/');
  return parts[parts.length - 1];
}
