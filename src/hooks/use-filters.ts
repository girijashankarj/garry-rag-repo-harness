/**
 * use-filters Hook
 * Manages filter state for search
 */

import { useState, useCallback } from 'react';
import type { SearchFilters } from '../types/kb.types.ts';

export function useFilters() {
  const [filters, setFilters] = useState<SearchFilters>({});

  const setRepo = useCallback((repo: string | undefined) => {
    setFilters((prev) => ({ ...prev, repo }));
  }, []);

  const setLanguage = useCallback((language: string | undefined) => {
    setFilters((prev) => ({ ...prev, language }));
  }, []);

  const setTag = useCallback((tag: string | undefined) => {
    setFilters((prev) => ({ ...prev, tag }));
  }, []);

  const clearFilters = useCallback(() => {
    setFilters({});
  }, []);

  const hasFilters = Object.keys(filters).length > 0;

  return {
    filters,
    setRepo,
    setLanguage,
    setTag,
    clearFilters,
    hasFilters,
  };
}
