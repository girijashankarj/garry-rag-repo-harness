/**
 * Search Engine
 * Performs searches using lunr.js index and optional semantic search
 * Optimized for large KBs with efficient filtering
 */

import lunr from 'lunr';
import type {
  KnowledgeBase,
  SearchResult,
  SearchFilters,
  SearchMode,
} from '../../types/kb.types.ts';
import { loadKB } from './kb-loader.ts';
import { semanticSearch } from './semantic-search.ts';

let searchIndex: lunr.Index | null = null;
let kbData: KnowledgeBase | null = null;

/**
 * Initialize search index from KB
 */
async function initializeIndex(): Promise<void> {
  if (searchIndex && kbData) {
    return;
  }

  kbData = await loadKB();

  // Reconstruct lunr index from serialized data
  const indexData = JSON.parse(kbData.index.lunrIndex);
  searchIndex = lunr.Index.load(indexData);
}

/**
 * Search the knowledge base
 * Optimized for large KBs with efficient filtering and result limiting
 */
export async function search(
  query: string,
  filters?: SearchFilters,
  limit: number = 20,
  mode: SearchMode = 'keyword'
): Promise<SearchResult[]> {
  await initializeIndex();

  if (!searchIndex || !kbData) {
    throw new Error('Search index not initialized');
  }

  const trimmedQuery = query.trim();
  if (!trimmedQuery) {
    return [];
  }

  // Minimum word count validation (2 words minimum)
  const words = trimmedQuery.split(/\s+/).filter((word) => word.length > 0);
  if (words.length < 2) {
    throw new Error('Search query must contain at least 2 words');
  }

  // Keyword search (lunr.js)
  const keywordResults = searchIndex.search(trimmedQuery);

  // Apply filters efficiently
  const mappedResults: (SearchResult | null)[] = keywordResults
    .slice(0, limit * 3) // Limit early for performance on large result sets
    .map((result): SearchResult | null => {
      const doc = kbData!.docs.find((d) => d.id === result.ref);
      if (!doc) {
        return null;
      }

      // Apply filters
      if (filters) {
        if (filters.repo && doc.repo !== filters.repo) {
          return null;
        }
        if (filters.language && doc.lang !== filters.language) {
          return null;
        }
        if (filters.tag && !doc.tags.includes(filters.tag)) {
          return null;
        }
        if (filters.prStatus && filters.prStatus !== 'all') {
          if (!doc.pullRequest || doc.pullRequest.state !== filters.prStatus) {
            return null;
          }
        }
        if (filters.fileType) {
          const fileExt = doc.path.split('.').pop()?.toLowerCase();
          if (fileExt !== filters.fileType.toLowerCase()) {
            return null;
          }
        }
      }

      return {
        doc,
        score: result.score,
        matchData: result.matchData ? {
          metadata: result.matchData.metadata as Record<string, Record<string, { position: number[][] }>>,
        } : undefined,
      };
    });

  const keywordSearchResults: SearchResult[] = mappedResults
    .filter((r): r is SearchResult => r !== null)
    .slice(0, limit * 2); // Final limit

  // Semantic search (if embeddings available)
  let semanticResults: SearchResult[] = [];
  let semanticError: string | null = null;
  if (mode === 'semantic' || mode === 'hybrid') {
    if (!kbData.index.embeddingsLite || Object.keys(kbData.index.embeddingsLite).length === 0) {
      semanticError =
        'Semantic search requires embeddings. Please rebuild with generateEmbeddings: true';
      if (mode === 'semantic') {
        throw new Error(semanticError);
      }
    } else {
      try {
        semanticResults = await semanticSearch(trimmedQuery, kbData, filters, limit);
      } catch (error) {
        semanticError = error instanceof Error ? error.message : 'Semantic search failed';
        if (mode === 'semantic') {
          throw error;
        }
        // In hybrid mode, continue with keyword results only
      }
    }
  }

  // Combine results based on mode
  if (mode === 'keyword') {
    return keywordSearchResults.slice(0, limit);
  } else if (mode === 'semantic') {
    return semanticResults.slice(0, limit);
  } else {
    // Hybrid: combine and deduplicate
    const combined = new Map<string, SearchResult>();

    // Add keyword results with weight
    keywordSearchResults.forEach((result) => {
      const existing = combined.get(result.doc.id);
      if (existing) {
        // Average scores for hybrid
        existing.score = (existing.score + result.score * 0.6) / 1.6;
      } else {
        combined.set(result.doc.id, { ...result, score: result.score * 0.6 });
      }
    });

    // Add semantic results with weight
    semanticResults.forEach((result) => {
      const existing = combined.get(result.doc.id);
      if (existing) {
        // Average scores for hybrid
        existing.score = (existing.score + result.score * 0.4) / 1.4;
      } else {
        combined.set(result.doc.id, { ...result, score: result.score * 0.4 });
      }
    });

    // Sort by combined score and return
    return Array.from(combined.values())
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }
}

/**
 * Get all unique repos from KB
 */
export async function getRepos(): Promise<string[]> {
  await initializeIndex();
  if (!kbData) {
    return [];
  }
  return [...new Set(kbData.docs.map((d) => d.repo))].sort();
}

/**
 * Get all unique languages from KB
 */
export async function getLanguages(): Promise<string[]> {
  await initializeIndex();
  if (!kbData) {
    return [];
  }
  return [...new Set(kbData.docs.map((d) => d.lang))].sort();
}

/**
 * Get all unique tags from KB
 */
export async function getTags(): Promise<string[]> {
  await initializeIndex();
  if (!kbData) {
    return [];
  }
  const allTags = kbData.docs.flatMap((d) => d.tags);
  return [...new Set(allTags)].sort();
}

/**
 * Get all unique file types from KB
 */
export async function getFileTypes(): Promise<string[]> {
  await initializeIndex();
  if (!kbData) {
    return [];
  }
  const fileTypes = kbData.docs
    .map((d) => {
      const ext = d.path.split('.').pop()?.toLowerCase();
      return ext || 'no-ext';
    })
    .filter((ext) => ext !== 'no-ext');
  return [...new Set(fileTypes)].sort();
}

/**
 * Check if embeddings are available
 */
export async function hasEmbeddings(): Promise<boolean> {
  await initializeIndex();
  if (!kbData) {
    return false;
  }
  return !!kbData.index.embeddingsLite && Object.keys(kbData.index.embeddingsLite).length > 0;
}

/**
 * Get KB metadata
 */
export async function getKBMeta() {
  await initializeIndex();
  if (!kbData) {
    return null;
  }
  return kbData.meta;
}
