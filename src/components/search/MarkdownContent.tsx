/**
 * MarkdownContent Component
 * Renders markdown content with proper formatting
 */

import { useMemo } from 'react';

interface MarkdownContentProps {
  content: string;
  language?: string;
}

function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

export function MarkdownContent({ content, language }: MarkdownContentProps) {
  const renderedContent = useMemo(() => {
    // For markdown files, render markdown
    if (language === 'markdown' || language === 'md') {
      let html = escapeHtml(content);

      // Process code blocks first (before other markdown)
      // Mermaid diagrams
      html = html.replace(/```mermaid\n?([\s\S]*?)```/gi, (match, code) => {
        const trimmed = code.trim();
        return `<div class="my-4 p-4 bg-muted/50 border border-border rounded-md">
          <div class="flex items-center gap-2 mb-2">
            <span class="text-xs font-mono text-muted-foreground">mermaid</span>
          </div>
          <pre class="text-xs overflow-x-auto"><code>${escapeHtml(trimmed)}</code></pre>
          <p class="text-xs text-muted-foreground mt-2">💡 Mermaid diagram - view source file for full rendering</p>
        </div>`;
      });

      // Other code blocks
      html = html.replace(/```(\w+)?\n?([\s\S]*?)```/g, (match, lang, code) => {
        if (lang === 'mermaid') return match; // Already handled
        const trimmed = code.trim();
        const langLabel = lang
          ? `<span class="text-xs font-mono text-muted-foreground">${lang}</span>`
          : '';
        return `<div class="my-3">
          ${langLabel ? `<div class="mb-1">${langLabel}</div>` : ''}
          <pre class="bg-muted p-3 rounded-md overflow-x-auto text-sm"><code>${escapeHtml(trimmed)}</code></pre>
        </div>`;
      });

      // Horizontal rules
      html = html.replace(/^---$/gm, '<hr class="my-4 border-border" />');
      html = html.replace(/^\*\*\*$/gm, '<hr class="my-4 border-border" />');

      // Headers (process after code blocks)
      html = html.replace(/^#### (.*)$/gm, '<h4 class="text-base font-semibold mt-4 mb-2">$1</h4>');
      html = html.replace(/^### (.*)$/gm, '<h3 class="text-lg font-semibold mt-4 mb-2">$1</h3>');
      html = html.replace(/^## (.*)$/gm, '<h2 class="text-xl font-semibold mt-4 mb-3">$1</h2>');
      html = html.replace(/^# (.*)$/gm, '<h1 class="text-2xl font-bold mt-4 mb-3">$1</h1>');

      // Bold and italic (order matters)
      html = html.replace(/\*\*\*(.*?)\*\*\*/g, '<strong><em>$1</em></strong>');
      html = html.replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold">$1</strong>');
      html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');

      // Inline code (process after bold/italic)
      html = html.replace(
        /`([^`\n]+)`/g,
        '<code class="bg-muted px-1.5 py-0.5 rounded text-sm font-mono">$1</code>'
      );

      // Links
      html = html.replace(
        /\[([^\]]+)\]\(([^)]+)\)/g,
        '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-primary hover:underline">$1</a>'
      );

      // Unordered lists
      html = html.replace(/^\s*[-*+]\s+(.+)$/gm, '<li class="ml-6 list-disc">$1</li>');
      // Wrap consecutive list items
      html = html.replace(/(<li[^>]*>.*<\/li>\n?)+/g, (match) => {
        return `<ul class="my-2 space-y-1">${match}</ul>`;
      });

      // Ordered lists
      html = html.replace(/^\s*\d+\.\s+(.+)$/gm, '<li class="ml-6 list-decimal">$1</li>');
      html = html.replace(/(<li class="ml-6 list-decimal">.*<\/li>\n?)+/g, (match) => {
        return `<ol class="my-2 space-y-1">${match}</ol>`;
      });

      // Blockquotes
      html = html.replace(
        /^>\s+(.+)$/gm,
        '<blockquote class="border-l-4 border-muted-foreground/30 pl-4 my-2 italic text-muted-foreground">$1</blockquote>'
      );

      // Process paragraphs - split by double newlines
      const paragraphs = html.split(/\n\s*\n/);
      const processed = paragraphs
        .map((para) => {
          const trimmed = para.trim();
          if (!trimmed) return '';

          // If already HTML (contains tags), return as-is
          if (trimmed.includes('<') && trimmed.includes('>')) {
            return trimmed;
          }

          // Convert single newlines to <br> within paragraphs
          const withBreaks = trimmed.replace(/\n/g, '<br />');
          return `<p class="my-2 leading-relaxed">${withBreaks}</p>`;
        })
        .filter((p) => p.length > 0);

      return processed.join('\n');
    }

    // For code files, render as code block
    if (language && language !== 'text' && language !== 'markdown' && language !== 'md') {
      return `<pre class="bg-muted p-3 rounded-md overflow-x-auto text-sm"><code>${escapeHtml(content)}</code></pre>`;
    }

    // Plain text - preserve whitespace but allow wrapping
    return `<pre class="whitespace-pre-wrap font-sans text-sm break-words">${escapeHtml(content)}</pre>`;
  }, [content, language]);

  return (
    <div
      className="markdown-content text-sm"
      dangerouslySetInnerHTML={{ __html: renderedContent }}
    />
  );
}
