/**
 * PR Fetcher Module
 * Fetches pull request data from GitHub API
 */

import type { PullRequestInfo, RepoPRStats } from '../../src/types/kb.types.ts';
import { sanitizeErrorMessage } from './token-security.ts';

const GITHUB_API_BASE = 'https://api.github.com';

export interface PRFetcherConfig {
  githubToken?: string;
  perPage?: number;
  maxPRs?: number;
}

export interface PRFileChange {
  filename: string;
  status: 'added' | 'removed' | 'modified' | 'renamed';
  additions: number;
  deletions: number;
}

/**
 * Fetch pull requests for a repository
 */
export async function fetchPullRequests(
  repo: string,
  config: PRFetcherConfig = {}
): Promise<PullRequestInfo[]> {
  const { githubToken, perPage = 100, maxPRs = 1000 } = config;
  const [owner, repoName] = repo.split('/');

  if (!owner || !repoName) {
    throw new Error(`Invalid repo format: ${repo}. Expected format: owner/repo`);
  }

  const headers: Record<string, string> = {
    Accept: 'application/vnd.github.v3+json',
    'User-Agent': 'rag-repo-harness',
  };

  if (githubToken) {
    headers.Authorization = `token ${githubToken}`;
  }

  const prs: PullRequestInfo[] = [];
  let page = 1;
  let hasMore = true;

  while (hasMore && prs.length < maxPRs) {
    try {
      // Only fetch open PRs
      const url = `${GITHUB_API_BASE}/repos/${owner}/${repoName}/pulls?state=open&per_page=${perPage}&page=${page}&sort=updated&direction=desc`;
      const response = await fetch(url, { headers });

      if (!response.ok) {
        if (response.status === 404) {
          console.warn(`  ⚠️  Repository ${repo} not found or not accessible`);
          break;
        }
        if (response.status === 403) {
          console.warn(`  ⚠️  Rate limited or insufficient permissions for ${repo}`);
          break;
        }
        throw new Error(`GitHub API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();

      if (!Array.isArray(data) || data.length === 0) {
        hasMore = false;
        break;
      }

      // Fetch changed files count for each PR
      for (const pr of data) {
        if (prs.length >= maxPRs) {
          hasMore = false;
          break;
        }

        try {
          // Fetch PR files to get changed files count
          const filesUrl = `${GITHUB_API_BASE}/repos/${owner}/${repoName}/pulls/${pr.number}/files?per_page=100`;
          const filesResponse = await fetch(filesUrl, { headers });

          let changedFilesCount = 0;
          if (filesResponse.ok) {
            const filesData = await filesResponse.json();
            changedFilesCount = Array.isArray(filesData) ? filesData.length : 0;
          }

          // Only include PR number and changedFilesCount
          const prInfo: PullRequestInfo = {
            number: pr.number,
            title: pr.title,
            changedFilesCount,
            state: 'open', // Only open PRs are fetched
            createdAt: pr.created_at,
            updatedAt: pr.updated_at,
            url: pr.html_url,
          };

          prs.push(prInfo);
        } catch (error) {
          console.warn(`  ⚠️  Failed to fetch files for PR #${pr.number}: ${error}`);
          // Still add PR without file count
          prs.push({
            number: pr.number,
            title: pr.title,
            changedFilesCount: 0,
            state: 'open',
            createdAt: pr.created_at,
            updatedAt: pr.updated_at,
            url: pr.html_url,
          });
        }
      }

      // Check if there are more pages
      const linkHeader = response.headers.get('link');
      hasMore = linkHeader?.includes('rel="next"') ?? false;
      page++;

      // Rate limiting: wait a bit between requests
      if (hasMore) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    } catch (error) {
      const safeMessage = sanitizeErrorMessage(error, config.githubToken);
      console.error(`  ✗ Error fetching PRs for ${repo}:`, safeMessage);
      throw new Error(safeMessage);
    }
  }

  return prs;
}

/**
 * Get PR statistics for a repository
 * Only counts open PRs
 */
export async function getPRStats(repo: string, config: PRFetcherConfig = {}): Promise<RepoPRStats> {
  const prs = await fetchPullRequests(repo, config); // Only fetches open PRs

  const stats: RepoPRStats = {
    repo,
    totalPRs: prs.length, // All are open PRs
    openPRs: prs.length,
    closedPRs: 0,
    mergedPRs: 0,
  };

  return stats;
}

/**
 * Fetch changed files for a specific PR
 */
export async function fetchPRFiles(
  repo: string,
  prNumber: number,
  config: PRFetcherConfig = {}
): Promise<PRFileChange[]> {
  const { githubToken } = config;
  const [owner, repoName] = repo.split('/');

  const headers: Record<string, string> = {
    Accept: 'application/vnd.github.v3+json',
    'User-Agent': 'rag-repo-harness',
  };

  if (githubToken) {
    headers.Authorization = `token ${githubToken}`;
  }

  try {
    const url = `${GITHUB_API_BASE}/repos/${owner}/${repoName}/pulls/${prNumber}/files?per_page=100`;
    const response = await fetch(url, { headers });

    if (!response.ok) {
      throw new Error(`GitHub API error: ${response.status} ${response.statusText}`);
    }

    const files = await response.json();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return files.map((file: any) => ({
      filename: file.filename,
      status: file.status,
      additions: file.additions || 0,
      deletions: file.deletions || 0,
    }));
  } catch (error) {
    const safeMessage = sanitizeErrorMessage(error, config.githubToken);
    console.error(`  ✗ Error fetching files for PR #${prNumber}:`, safeMessage);
    return [];
  }
}

/**
 * Map files to their associated PRs
 * Only maps open PRs
 */
export async function mapFilesToPRs(
  repo: string,
  files: string[],
  config: PRFetcherConfig = {}
): Promise<Map<string, PullRequestInfo[]>> {
  const fileToPRs = new Map<string, PullRequestInfo[]>();
  const prs = await fetchPullRequests(repo, config); // Only fetches open PRs

  // For each PR, get its changed files and map them
  for (const pr of prs) {
    try {
      const changedFiles = await fetchPRFiles(repo, pr.number, config);

      for (const file of changedFiles) {
        // Normalize file path (remove leading slash if present)
        const normalizedPath = file.filename.startsWith('/')
          ? file.filename.slice(1)
          : file.filename;

        // Check if this file is in our list
        const matchingFile = files.find((f) => {
          const relativePath = f.includes(repo) ? f.split(repo + '/')[1] : f;
          return relativePath === normalizedPath || f.endsWith(normalizedPath);
        });

        if (matchingFile) {
          if (!fileToPRs.has(matchingFile)) {
            fileToPRs.set(matchingFile, []);
          }
          fileToPRs.get(matchingFile)!.push(pr);
        }
      }

      // Rate limiting
      await new Promise((resolve) => setTimeout(resolve, 500));
    } catch (error) {
      console.warn(`  ⚠️  Failed to map files for PR #${pr.number}: ${error}`);
    }
  }

  return fileToPRs;
}
