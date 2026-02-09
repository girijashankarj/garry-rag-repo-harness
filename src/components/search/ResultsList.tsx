/**
 * ResultsList Component
 * Displays search results with citations
 */

import { FileText, ExternalLink, GitPullRequest, Folder, File } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card.tsx';
import { Button } from '../ui/button.tsx';
import type { SearchResult } from '../../types/kb.types.ts';
import {
  formatCitation,
  getGitHubUrl,
  getLanguageDisplayName,
  getFileType,
  getFileName,
} from '../../lib/search/citation-utils.ts';

interface ResultsListProps {
  results: SearchResult[];
  onSelectResult: (result: SearchResult) => void;
  selectedResult?: SearchResult | null;
}

export function ResultsList({ results, onSelectResult, selectedResult }: ResultsListProps) {
  if (results.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          <FileText className="size-12 mx-auto mb-4 opacity-50" />
          <p>No results found. Try a different search query.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {results.map((result) => {
        const isSelected = selectedResult?.doc.id === result.doc.id;
        const fileName = getFileName(result.doc.path);
        const fileType = getFileType(result.doc.path);
        const repoName = result.doc.repo.split('/')[1] || result.doc.repo;

        return (
          <Card
            key={result.doc.id}
            className={`cursor-pointer transition-colors hover:bg-accent ${
              isSelected ? 'border-primary bg-accent' : ''
            }`}
            onClick={() => onSelectResult(result)}
          >
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <CardTitle className="text-base font-medium line-clamp-1 mb-1">
                    {result.doc.title}
                  </CardTitle>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                    <div className="flex items-center gap-1">
                      <Folder className="size-3" />
                      <span className="font-medium text-foreground">{repoName}</span>
                    </div>
                    <span>•</span>
                    <div className="flex items-center gap-1">
                      <File className="size-3" />
                      <span className="font-medium text-foreground">{fileName}</span>
                    </div>
                    {fileType !== 'no-ext' && (
                      <>
                        <span>•</span>
                        <span className="px-1.5 py-0.5 bg-muted rounded text-xs font-mono">
                          .{fileType}
                        </span>
                      </>
                    )}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="shrink-0"
                  onClick={(e) => {
                    e.stopPropagation();
                    window.open(getGitHubUrl(result.doc), '_blank');
                  }}
                >
                  <ExternalLink className="size-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground line-clamp-2 break-words">
                  {result.doc.contentExcerpt}
                </p>
                <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
                  <span className="font-mono">{formatCitation(result.doc)}</span>
                  <span>•</span>
                  <span>{getLanguageDisplayName(result.doc.lang)}</span>
                  {result.doc.pullRequest && (
                    <>
                      <span>•</span>
                      <a
                        href={result.doc.pullRequest.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 hover:text-foreground"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <GitPullRequest className="size-3" />
                        <span>PR #{result.doc.pullRequest.number}</span>
                        <span>({result.doc.pullRequest.changedFilesCount} files)</span>
                      </a>
                    </>
                  )}
                  {result.score && (
                    <>
                      <span>•</span>
                      <span>Score: {result.score.toFixed(2)}</span>
                    </>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
