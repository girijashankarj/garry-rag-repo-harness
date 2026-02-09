/**
 * SearchBar Component
 * Main search input with filters
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { Search } from 'lucide-react';
import { Input } from '../ui/input.tsx';
import { Button } from '../ui/button.tsx';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select.tsx';
import { Filters } from './Filters.tsx';
import type { SearchFilters, SearchMode } from '../../types/kb.types.ts';

interface SearchBarProps {
  onSearch: (query: string, filters?: SearchFilters, mode?: SearchMode) => void;
  isLoading?: boolean;
  isModelLoading?: boolean;
  filters: SearchFilters;
  onFiltersChange: (filters: SearchFilters) => void;
  repos?: string[];
  languages?: string[];
  tags?: string[];
  fileTypes?: string[];
  searchMode: SearchMode;
  onSearchModeChange: (mode: SearchMode) => void;
  embeddingsAvailable?: boolean;
}

export function SearchBar({
  onSearch,
  isLoading,
  isModelLoading,
  filters,
  onFiltersChange,
  repos,
  languages,
  tags,
  fileTypes,
  searchMode,
  onSearchModeChange,
  embeddingsAvailable = false,
}: SearchBarProps) {
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // Check if query has minimum 2 words
  const getWordCount = (text: string): number => {
    return text
      .trim()
      .split(/\s+/)
      .filter((word) => word.length > 0).length;
  };

  const wordCount = getWordCount(query);
  const hasMinimumWords = wordCount >= 2;

  // Store cursor position to restore it after re-render
  const cursorPositionRef = useRef<{ start: number; end: number } | null>(null);

  const saveCursorPosition = useCallback(() => {
    if (inputRef.current) {
      const start = inputRef.current.selectionStart || 0;
      const end = inputRef.current.selectionEnd || 0;
      cursorPositionRef.current = { start, end };
    }
  }, []);

  const restoreCursorPosition = useCallback(() => {
    if (inputRef.current && cursorPositionRef.current) {
      const { start, end } = cursorPositionRef.current;
      inputRef.current.setSelectionRange(start, end);
    }
  }, []);

  // Restore cursor position after value changes
  useEffect(() => {
    if (inputRef.current && document.activeElement === inputRef.current) {
      restoreCursorPosition();
    }
  }, [query, restoreCursorPosition]);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (hasMinimumWords) {
        onSearch(query, filters, searchMode);
      }
    },
    [query, filters, searchMode, onSearch, hasMinimumWords]
  );

  // Handle Enter key press
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      saveCursorPosition();
      if (e.key === 'Enter' && hasMinimumWords && !isLoading) {
        e.preventDefault();
        onSearch(query, filters, searchMode);
      }
    },
    [query, filters, searchMode, onSearch, hasMinimumWords, isLoading, saveCursorPosition]
  );

  return (
    <div className="space-y-4">
      <form onSubmit={handleSubmit} className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            ref={inputRef}
            type="search"
            placeholder="Search repositories... (Press Enter to search)"
            value={query}
            onChange={(e) => {
              saveCursorPosition();
              setQuery(e.target.value);
            }}
            onSelect={saveCursorPosition}
            onKeyDown={handleKeyDown}
            className="pl-10"
            disabled={isLoading}
            autoComplete="off"
          />
        </div>
        <Select value={searchMode} onValueChange={onSearchModeChange} disabled={isLoading}>
          <SelectTrigger className="w-[140px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="keyword">Keyword</SelectItem>
            <SelectItem value="semantic" disabled={!embeddingsAvailable}>
              Semantic {!embeddingsAvailable && '(unavailable)'}
            </SelectItem>
            <SelectItem value="hybrid" disabled={!embeddingsAvailable}>
              Hybrid {!embeddingsAvailable && '(unavailable)'}
            </SelectItem>
          </SelectContent>
        </Select>
        <Button
          type="submit"
          disabled={isLoading || isModelLoading || !query.trim() || !hasMinimumWords}
        >
          {isModelLoading ? 'Loading model...' : isLoading ? 'Searching...' : 'Search'}
        </Button>
      </form>
      <Filters
        filters={filters}
        onFiltersChange={onFiltersChange}
        repos={repos}
        languages={languages}
        tags={tags}
        fileTypes={fileTypes}
      />
      {isLoading && (
        <div className="text-sm text-muted-foreground flex items-center gap-2">
          <div className="size-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <span>Searching...</span>
        </div>
      )}
      {!hasMinimumWords && query.trim() && !isLoading && (
        <div className="text-sm text-muted-foreground">
          ⚠️ Please enter at least 2 words to search ({wordCount}/2)
        </div>
      )}
      {isModelLoading && (
        <div className="text-sm text-muted-foreground flex items-center gap-2">
          <div className="size-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          Loading semantic search model (first time only)...
        </div>
      )}
    </div>
  );
}
