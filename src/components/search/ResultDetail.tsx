/**
 * ResultDetail Component
 * Detail panel for selected result with full excerpt and GitHub link
 */

import { ExternalLink, FileText, GitPullRequest } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card.tsx';
import { Button } from '../ui/button.tsx';
import type { SearchResult } from '../../types/kb.types.ts';
import {
  formatCitation,
  getGitHubUrl,
  formatDocumentTitle,
  getLanguageDisplayName,
} from '../../lib/search/citation-utils.ts';
import { MarkdownContent } from './MarkdownContent.tsx';

interface ResultDetailProps {
  result: SearchResult | null;
}

export function ResultDetail({ result }: ResultDetailProps) {
  if (!result || !result.doc) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          <FileText className="size-12 mx-auto mb-4 opacity-50" />
          <p>Select a result to view details</p>
        </CardContent>
      </Card>
    );
  }

  const { doc } = result;

  // Validate doc has required fields
  if (!doc.title || !doc.contentExcerpt) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          <FileText className="size-12 mx-auto mb-4 opacity-50" />
          <p>Invalid result data</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1">
            <CardTitle>{doc.title}</CardTitle>
            <CardDescription className="mt-1">{formatDocumentTitle(doc)}</CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.open(getGitHubUrl(doc), '_blank')}
          >
            <ExternalLink className="size-4 mr-2" />
            Open in GitHub
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <h4 className="text-sm font-medium mb-2">Content</h4>
          <div className="p-4 bg-muted rounded-md max-h-96 overflow-y-auto">
            <MarkdownContent content={doc.contentExcerpt} language={doc.lang} />
          </div>
        </div>

        <div>
          <h4 className="text-sm font-medium mb-2">Metadata</h4>
          <dl className="grid grid-cols-2 gap-2 text-sm">
            <div>
              <dt className="text-muted-foreground">Citation</dt>
              <dd className="font-mono">{formatCitation(doc)}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Language</dt>
              <dd>{getLanguageDisplayName(doc.lang)}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Lines</dt>
              <dd>
                {doc.loc.startLine}–{doc.loc.endLine}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Repository</dt>
              <dd>{doc.repo}</dd>
            </div>
          </dl>
        </div>

        {doc.pullRequest && (
          <div>
            <h4 className="text-sm font-medium mb-2">Pull Request</h4>
            <div className="p-3 bg-muted rounded-md space-y-2">
              <div className="flex items-center gap-2">
                <GitPullRequest className="size-4 text-muted-foreground" />
                <a
                  href={doc.pullRequest.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm font-medium hover:underline"
                >
                  #{doc.pullRequest.number}: {doc.pullRequest.title}
                </a>
              </div>
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <span>
                  {doc.pullRequest.changedFilesCount} file
                  {doc.pullRequest.changedFilesCount !== 1 ? 's' : ''} changed
                </span>
                <span className="capitalize">{doc.pullRequest.state}</span>
                <span>Updated {new Date(doc.pullRequest.updatedAt).toLocaleDateString()}</span>
              </div>
            </div>
          </div>
        )}

        {doc.tags.length > 0 && (
          <div>
            <h4 className="text-sm font-medium mb-2">Tags</h4>
            <div className="flex flex-wrap gap-2">
              {doc.tags.map((tag) => (
                <span
                  key={tag}
                  className="px-2 py-1 text-xs bg-secondary text-secondary-foreground rounded-md"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
