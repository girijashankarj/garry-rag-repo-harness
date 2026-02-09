/**
 * Chunking Module
 * Chunks documents by logical structure (headings for markdown, functions/classes for code)
 */

import { readFileSync } from 'fs';
import { createHash } from 'crypto';
import type { KBDocument } from '../../src/types/kb.types.ts';

const MAX_CHUNK_SIZE = 3000; // characters
const MIN_CHUNK_SIZE = 100; // characters

export interface ChunkingOptions {
  maxChunkSize?: number;
  minChunkSize?: number;
}

/**
 * Extract title from content (first heading or first line)
 */
function extractTitle(content: string, lang: string): string {
  // Markdown: use first heading
  if (lang === 'markdown' || lang === 'md') {
    const headingMatch = content.match(/^#+\s+(.+)$/m);
    if (headingMatch) {
      return headingMatch[1].trim();
    }
  }

  // Code: use first function/class name or file name
  if (['typescript', 'javascript', 'ts', 'js', 'tsx', 'jsx'].includes(lang)) {
    const funcMatch = content.match(/(?:export\s+)?(?:async\s+)?function\s+(\w+)/);
    if (funcMatch) {
      return funcMatch[1];
    }
    const classMatch = content.match(/(?:export\s+)?class\s+(\w+)/);
    if (classMatch) {
      return classMatch[1];
    }
  }

  // Fallback: first non-empty line
  const firstLine = content.split('\n').find((line) => line.trim());
  if (firstLine) {
    return firstLine.trim().substring(0, 80);
  }

  return 'Untitled';
}

/**
 * Generate content hash
 */
function generateHash(content: string): string {
  return createHash('sha256').update(content).digest('hex').substring(0, 16);
}

/**
 * Chunk markdown by headings
 */
function chunkMarkdown(content: string, options: ChunkingOptions): string[] {
  const chunks: string[] = [];
  const lines = content.split('\n');
  let currentChunk: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const headingMatch = line.match(/^(#+)\s+(.+)$/);

    if (headingMatch) {
      // If we have content and hit a new heading, save current chunk
      if (currentChunk.length > 0) {
        const chunkText = currentChunk.join('\n');
        if (chunkText.length >= (options.minChunkSize || MIN_CHUNK_SIZE)) {
          chunks.push(chunkText);
        }
        currentChunk = [];
      }

      // Start new chunk with heading
      currentChunk.push(line);
    } else {
      currentChunk.push(line);

      // If chunk gets too large, split it
      const chunkText = currentChunk.join('\n');
      if (chunkText.length > (options.maxChunkSize || MAX_CHUNK_SIZE)) {
        // Split at last paragraph or sentence
        const lastPara = currentChunk.lastIndexOf('');
        if (lastPara > 0) {
          const firstPart = currentChunk.slice(0, lastPara).join('\n');
          chunks.push(firstPart);
          currentChunk = currentChunk.slice(lastPara);
        } else {
          // Force split
          chunks.push(chunkText.substring(0, options.maxChunkSize || MAX_CHUNK_SIZE));
          currentChunk = [chunkText.substring(options.maxChunkSize || MAX_CHUNK_SIZE)];
        }
      }
    }
  }

  // Add remaining chunk
  if (currentChunk.length > 0) {
    const chunkText = currentChunk.join('\n');
    if (chunkText.length >= (options.minChunkSize || MIN_CHUNK_SIZE)) {
      chunks.push(chunkText);
    }
  }

  return chunks.length > 0 ? chunks : [content];
}

/**
 * Chunk code by functions/classes
 */
function chunkCode(content: string, lang: string, options: ChunkingOptions): string[] {
  const chunks: string[] = [];
  const lines = content.split('\n');

  // Try to find function/class boundaries
  const boundaries: number[] = [0];
  let braceDepth = 0;
  let inFunction = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Track brace depth
    braceDepth += (line.match(/{/g) || []).length;
    braceDepth -= (line.match(/}/g) || []).length;

    // Detect function/class start
    if (
      /^(export\s+)?(async\s+)?function\s+\w+/.test(trimmed) ||
      /^(export\s+)?class\s+\w+/.test(trimmed) ||
      /^(export\s+)?const\s+\w+\s*=\s*(async\s+)?\(/.test(trimmed)
    ) {
      if (boundaries.length > 0 && boundaries[boundaries.length - 1] !== i) {
        boundaries.push(i);
      }
      inFunction = true;
    }

    // End of function/class (brace depth returns to previous level)
    if (inFunction && braceDepth === 0 && trimmed.includes('}')) {
      boundaries.push(i + 1);
      inFunction = false;
    }
  }

  boundaries.push(lines.length);

  // Create chunks from boundaries
  for (let i = 0; i < boundaries.length - 1; i++) {
    const start = boundaries[i];
    const end = boundaries[i + 1];
    const chunkLines = lines.slice(start, end);
    const chunkText = chunkLines.join('\n');

    if (chunkText.length > (options.maxChunkSize || MAX_CHUNK_SIZE)) {
      // Split large chunks
      const subChunks = chunkText.match(
        new RegExp(`.{1,${options.maxChunkSize || MAX_CHUNK_SIZE}}`, 'g')
      );
      if (subChunks) {
        chunks.push(...subChunks);
      }
    } else if (chunkText.length >= (options.minChunkSize || MIN_CHUNK_SIZE)) {
      chunks.push(chunkText);
    }
  }

  return chunks.length > 0 ? chunks : [content];
}

/**
 * Chunk a file into documents
 */
export function chunkFile(
  filePath: string,
  repo: string,
  relativePath: string,
  options: ChunkingOptions = {}
): KBDocument[] {
  const content = readFileSync(filePath, 'utf8');
  const lang = getLanguageFromPath(relativePath);
  const chunks: string[] = [];

  // Choose chunking strategy based on file type
  if (lang === 'markdown' || lang === 'md') {
    chunks.push(...chunkMarkdown(content, options));
  } else if (['typescript', 'javascript', 'ts', 'js', 'tsx', 'jsx'].includes(lang)) {
    chunks.push(...chunkCode(content, lang, options));
  } else {
    // Fallback: split by size
    const maxSize = options.maxChunkSize || MAX_CHUNK_SIZE;
    for (let i = 0; i < content.length; i += maxSize) {
      chunks.push(content.substring(i, i + maxSize));
    }
  }

  // Convert chunks to documents
  const documents: KBDocument[] = [];
  let lineOffset = 0;

  for (let i = 0; i < chunks.length; i++) {
    const chunkContent = chunks[i];

    // Skip empty chunks
    if (!chunkContent || chunkContent.trim().length === 0) {
      continue;
    }

    const lines = content.substring(0, content.indexOf(chunkContent)).split('\n').length;
    const chunkLines = chunkContent.split('\n');
    const startLine = lineOffset + lines;
    const endLine = startLine + chunkLines.length - 1;

    // Ensure contentExcerpt is not empty
    const excerpt = chunkContent.substring(0, options.maxChunkSize || MAX_CHUNK_SIZE).trim();
    if (!excerpt || excerpt.length === 0) {
      continue; // Skip chunks with no content
    }

    const doc: KBDocument = {
      id: `${repo}:${relativePath}:${i}`,
      repo,
      path: relativePath,
      lang,
      loc: {
        startLine,
        endLine,
      },
      title: extractTitle(chunkContent, lang),
      contentExcerpt: excerpt,
      tags: [],
      hash: generateHash(chunkContent),
    };

    documents.push(doc);
    lineOffset = endLine;
  }

  return documents;
}

/**
 * Get language from file path
 */
function getLanguageFromPath(path: string): string {
  const ext = path.substring(path.lastIndexOf('.'));
  const langMap: Record<string, string> = {
    '.md': 'markdown',
    '.txt': 'text',
    '.ts': 'typescript',
    '.tsx': 'typescript',
    '.js': 'javascript',
    '.jsx': 'javascript',
    '.json': 'json',
    '.yml': 'yaml',
    '.yaml': 'yaml',
    '.sql': 'sql',
  };
  return langMap[ext] || 'text';
}
