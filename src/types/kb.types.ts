/**
 * TypeScript types for the knowledge base (kb.json) structure
 */

export interface RepoPRStats {
  repo: string;
  totalPRs: number;
  openPRs: number;
  closedPRs: number;
  mergedPRs: number;
}

export interface KBMeta {
  generatedAt: string;
  sourceScope: 'public-only' | 'private-local';
  repoCount: number;
  docCount: number;
  version: string; // commit hash
  prStats?: RepoPRStats[]; // PR statistics per repo
}

export interface DocLocation {
  startLine: number;
  endLine: number;
}

export interface PullRequestInfo {
  number: number;
  title: string;
  changedFilesCount: number;
  state: 'open' | 'closed' | 'merged';
  createdAt: string;
  updatedAt: string;
  url: string;
}

export interface KBDocument {
  id: string;
  repo: string;
  path: string;
  lang: string;
  loc: DocLocation;
  title: string;
  contentExcerpt: string;
  tags: string[];
  hash: string;
  pullRequest?: PullRequestInfo; // Optional PR info if this file was changed in a PR
}

export interface KBIndex {
  lunrIndex: string; // Serialized lunr.js index
  embeddingsLite?: Record<string, number[]>; // Optional lightweight embeddings
}

export interface KnowledgeBase {
  meta: KBMeta;
  docs: KBDocument[];
  index: KBIndex;
}

/**
 * Search result with relevance score
 */
export interface SearchResult {
  doc: KBDocument;
  score: number;
  matchData?: {
    metadata: Record<string, Record<string, { position: number[][] }>>;
  };
}

/**
 * Filter options for search
 */
export interface SearchFilters {
  repo?: string;
  language?: string;
  tag?: string;
  prStatus?: 'open' | 'closed' | 'merged' | 'all';
  fileType?: string; // e.g., 'md', 'ts', 'js', 'py'
}

/**
 * Search mode
 */
export type SearchMode = 'keyword' | 'semantic' | 'hybrid';
