/**
 * Filters Component
 * Filter UI for repo, language, and tag
 */

import { X } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select.tsx';
import { Button } from '../ui/button.tsx';
import type { SearchFilters } from '../../types/kb.types.ts';

interface FiltersProps {
  filters: SearchFilters;
  onFiltersChange: (filters: SearchFilters) => void;
  repos?: string[];
  languages?: string[];
  tags?: string[];
  fileTypes?: string[];
}

export function Filters({
  filters,
  onFiltersChange,
  repos = [],
  languages = [],
  tags = [],
  fileTypes = [],
}: FiltersProps) {
  const hasFilters =
    Object.keys(filters).filter(
      (key) =>
        filters[key as keyof SearchFilters] !== undefined &&
        filters[key as keyof SearchFilters] !== 'all'
    ).length > 0;

  const handleRepoChange = (value: string) => {
    onFiltersChange({ ...filters, repo: value === 'all' ? undefined : value });
  };

  const handleLanguageChange = (value: string) => {
    onFiltersChange({ ...filters, language: value === 'all' ? undefined : value });
  };

  const handleTagChange = (value: string) => {
    onFiltersChange({ ...filters, tag: value === 'all' ? undefined : value });
  };

  const handlePRStatusChange = (value: string) => {
    onFiltersChange({
      ...filters,
      prStatus: value === 'all' ? undefined : (value as 'open' | 'closed' | 'merged'),
    });
  };

  const handleFileTypeChange = (value: string) => {
    onFiltersChange({ ...filters, fileType: value === 'all' ? undefined : value });
  };

  const clearFilters = () => {
    onFiltersChange({});
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      {repos.length > 0 && (
        <Select value={filters.repo || 'all'} onValueChange={handleRepoChange}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="All repos" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All repos</SelectItem>
            {repos.map((repo) => (
              <SelectItem key={repo} value={repo}>
                {repo}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {languages.length > 0 && (
        <Select value={filters.language || 'all'} onValueChange={handleLanguageChange}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="All languages" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All languages</SelectItem>
            {languages.map((lang) => (
              <SelectItem key={lang} value={lang}>
                {lang}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {tags.length > 0 && (
        <Select value={filters.tag || 'all'} onValueChange={handleTagChange}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="All tags" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All tags</SelectItem>
            {tags.map((tag) => (
              <SelectItem key={tag} value={tag}>
                {tag}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      <Select value={filters.prStatus || 'all'} onValueChange={handlePRStatusChange}>
        <SelectTrigger className="w-[140px]">
          <SelectValue placeholder="PR Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All PRs</SelectItem>
          <SelectItem value="open">Open PRs</SelectItem>
          <SelectItem value="closed">Closed PRs</SelectItem>
          <SelectItem value="merged">Merged PRs</SelectItem>
        </SelectContent>
      </Select>

      {fileTypes.length > 0 && (
        <Select value={filters.fileType || 'all'} onValueChange={handleFileTypeChange}>
          <SelectTrigger className="w-[130px]">
            <SelectValue placeholder="File type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All files</SelectItem>
            {fileTypes.slice(0, 20).map((type) => (
              <SelectItem key={type} value={type}>
                .{type}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {hasFilters && (
        <Button variant="ghost" size="sm" onClick={clearFilters}>
          <X className="size-4 mr-1" />
          Clear filters
        </Button>
      )}
    </div>
  );
}
