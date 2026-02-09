/**
 * use-search Hook
 * Manages search state and performs searches
 */

import { useState, useEffect, useCallback } from 'react';
import {
  search,
  getKBMeta,
  getRepos,
  getLanguages,
  getTags,
  getFileTypes,
  hasEmbeddings,
} from '../lib/search/search-engine.ts';
import { isModelLoadingState } from '../lib/search/semantic-search.ts';
import type { SearchResult, SearchFilters, SearchMode } from '../types/kb.types.ts';

interface UseSearchReturn {
  results: SearchResult[];
  isLoading: boolean;
  isModelLoading: boolean;
  error: string | null;
  searchQuery: (query: string, filters?: SearchFilters, mode?: SearchMode) => Promise<void>;
  kbMeta: Awaited<ReturnType<typeof getKBMeta>>;
  repos: string[];
  languages: string[];
  tags: string[];
  fileTypes: string[];
  embeddingsAvailable: boolean;
}

export function useSearch(): UseSearchReturn {
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isModelLoading, setIsModelLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [kbMeta, setKBMeta] = useState<Awaited<ReturnType<typeof getKBMeta>>>(null);
  const [repos, setRepos] = useState<string[]>([]);
  const [languages, setLanguages] = useState<string[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [fileTypes, setFileTypes] = useState<string[]>([]);
  const [embeddingsAvailable, setEmbeddingsAvailable] = useState(false);

  // Load KB metadata and filter options on mount
  useEffect(() => {
    async function loadMetadata() {
      try {
        const [meta, repoList, langList, tagList, fileTypeList, hasEmbeddingsData] =
          await Promise.all([
            getKBMeta(),
            getRepos(),
            getLanguages(),
            getTags(),
            getFileTypes(),
            hasEmbeddings(),
          ]);
        setKBMeta(meta);
        setRepos(repoList);
        setLanguages(langList);
        setTags(tagList);
        setFileTypes(fileTypeList);
        setEmbeddingsAvailable(hasEmbeddingsData);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load metadata');
      }
    }
    loadMetadata();
  }, []);

  // Monitor model loading state
  useEffect(() => {
    const interval = setInterval(() => {
      setIsModelLoading(isModelLoadingState());
    }, 100);
    return () => clearInterval(interval);
  }, []);

  const searchQuery = useCallback(
    async (query: string, filters?: SearchFilters, mode: SearchMode = 'keyword') => {
      const trimmedQuery = query.trim();

      if (!trimmedQuery) {
        setResults([]);
        setError(null);
        return;
      }

      // Check minimum word count (2 words)
      const words = trimmedQuery.split(/\s+/).filter((word) => word.length > 0);
      if (words.length < 2) {
        setError('Search query must contain at least 2 words');
        setResults([]);
        return;
      }

      // Check if semantic search is requested but embeddings unavailable
      if ((mode === 'semantic' || mode === 'hybrid') && !embeddingsAvailable) {
        setError(
          'Semantic search requires embeddings. Please rebuild the knowledge base with generateEmbeddings: true in rag.config.json'
        );
        setResults([]);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const searchResults = await search(trimmedQuery, filters, 20, mode);
        setResults(searchResults);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Search failed';
        setError(errorMessage);
        setResults([]);
      } finally {
        setIsLoading(false);
      }
    },
    [embeddingsAvailable]
  );

  return {
    results,
    isLoading,
    isModelLoading,
    error,
    searchQuery,
    kbMeta,
    repos,
    languages,
    tags,
    fileTypes,
    embeddingsAvailable,
  };
}
