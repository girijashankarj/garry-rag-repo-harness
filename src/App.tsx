import { useState, useCallback, useEffect, useRef } from 'react';
import { Info } from 'lucide-react';
import { SearchBar } from './components/search/SearchBar.tsx';
import { ResultsList } from './components/search/ResultsList.tsx';
import { ResultDetail } from './components/search/ResultDetail.tsx';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from './components/ui/card.tsx';
import { Tooltip } from './components/ui/tooltip.tsx';
import { useSearch } from './hooks/use-search.ts';
import { useFilters } from './hooks/use-filters.ts';
import type { SearchResult, SearchFilters, SearchMode } from './types/kb.types.ts';

export default function App() {
  const {
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
  } = useSearch();
  const { filters, setRepo, setLanguage, setTag, clearFilters, hasFilters } = useFilters();
  const [selectedResult, setSelectedResult] = useState<SearchResult | null>(null);
  const [searchMode, setSearchMode] = useState<SearchMode>('keyword');

  const handleSearch = useCallback(
    (query: string, searchFilters?: SearchFilters, mode?: SearchMode) => {
      searchQuery(query, searchFilters || filters, mode || searchMode);
      setSelectedResult(null); // Will be set to first result when results arrive
    },
    [searchQuery, filters, searchMode]
  );

  // Auto-select first result when results change (using ref to avoid setState in effect warning)
  const prevResultsLengthRef = useRef(0);
  useEffect(() => {
    if (results.length > 0 && !selectedResult && results.length !== prevResultsLengthRef.current) {
      // Use setTimeout to avoid setState in effect warning
      setTimeout(() => {
        setSelectedResult(results[0]);
      }, 0);
      prevResultsLengthRef.current = results.length;
    }
  }, [results, selectedResult]);

  const handleFiltersChange = useCallback(
    (newFilters: SearchFilters) => {
      if (newFilters.repo !== filters.repo) {
        setRepo(newFilters.repo);
      }
      if (newFilters.language !== filters.language) {
        setLanguage(newFilters.language);
      }
      if (newFilters.tag !== filters.tag) {
        setTag(newFilters.tag);
      }
    },
    [filters, setRepo, setLanguage, setTag]
  );

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <header className="border-b border-border">
        <div className="mx-auto w-full max-w-7xl px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">Garry RAG Repo Harness</h1>
              <p className="text-sm text-muted-foreground">
                Search and explore your GitHub repositories with citations
              </p>
            </div>
            {kbMeta && (
              <div className="text-right text-sm text-muted-foreground">
                <div>{kbMeta.repoCount} repositories</div>
                <div>{kbMeta.docCount.toLocaleString()} documents</div>
                {kbMeta.prStats && kbMeta.prStats.length > 0 && (
                  <div>
                    {kbMeta.prStats.reduce((sum, s) => sum + s.totalPRs, 0).toLocaleString()} pull
                    requests
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1 mx-auto w-full max-w-7xl px-4 py-6">
        <div className="space-y-6">
          <SearchBar
            onSearch={handleSearch}
            isLoading={isLoading}
            isModelLoading={isModelLoading}
            filters={filters}
            onFiltersChange={handleFiltersChange}
            repos={repos}
            languages={languages}
            tags={tags}
            fileTypes={fileTypes}
            searchMode={searchMode}
            onSearchModeChange={setSearchMode}
            embeddingsAvailable={embeddingsAvailable}
          />

          {error && (
            <Card className="border-destructive">
              <CardContent className="py-4">
                <p className="text-sm text-destructive">{error}</p>
              </CardContent>
            </Card>
          )}

          {isLoading && (
            <Card>
              <CardContent className="py-12">
                <div className="flex flex-col items-center justify-center gap-4">
                  <div className="size-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                  <div className="text-center">
                    <p className="text-sm font-medium">Searching...</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Please wait while we search through your repositories
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {results.length > 0 && !isLoading && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold">Results ({results.length})</h2>
                  {hasFilters && (
                    <button
                      onClick={clearFilters}
                      className="text-sm text-muted-foreground hover:text-foreground"
                    >
                      Clear filters
                    </button>
                  )}
                </div>
                <ResultsList
                  results={results}
                  onSelectResult={setSelectedResult}
                  selectedResult={selectedResult}
                />
              </div>

              <div>
                <h2 className="text-lg font-semibold mb-4">Details</h2>
                <ResultDetail result={selectedResult} />
              </div>
            </div>
          )}

          {results.length === 0 && !isLoading && !error && (
            <Card>
              <CardHeader>
                <CardTitle>Welcome</CardTitle>
                <CardDescription>Start searching to explore your repositories</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Enter a search query above to find relevant code and documentation from your
                  indexed repositories. Use filters to narrow down results by repository, language,
                  or tags.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </main>

      <footer className="border-t border-border mt-auto">
        <div className="mx-auto w-full max-w-7xl px-4 py-4">
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <span>Garry RAG Repo Harness — Search your GitHub repositories with citations</span>
            <Tooltip
              content="This knowledge base indexes your GitHub repositories and provides semantic and keyword search capabilities. Use filters to narrow down results by repository, language, file type, or pull request status. Minimum 2 words required for search queries."
              side="top"
            >
              <Info className="size-4 cursor-help hover:text-foreground transition-colors" />
            </Tooltip>
          </div>
          {kbMeta && (
            <p className="mt-2 text-center text-xs text-muted-foreground">
              Last updated: {new Date(kbMeta.generatedAt).toLocaleDateString()} • {kbMeta.repoCount}{' '}
              repositories • {kbMeta.docCount.toLocaleString()} documents indexed
            </p>
          )}
        </div>
      </footer>
    </div>
  );
}
