/**
 * GitHub API Module
 * Fetches repository information from GitHub API
 */

import { sanitizeErrorMessage } from './token-security.ts';

const GITHUB_API_BASE = 'https://api.github.com';

export interface GitHubRepo {
  name: string;
  full_name: string;
  owner: {
    login: string;
  };
  private: boolean;
  default_branch: string;
  updated_at: string;
  language: string | null;
}

export interface FetchReposOptions {
  githubToken?: string;
  type?: 'all' | 'owner' | 'member'; // For user repos
  sort?: 'created' | 'updated' | 'pushed' | 'full_name';
  direction?: 'asc' | 'desc';
  perPage?: number;
  maxRepos?: number;
  includePrivate?: boolean; // Include private repos (default: false - only public repos)
}

/**
 * Fetch repositories for a user or organization
 */
export async function fetchUserRepos(
  username: string,
  options: FetchReposOptions = {}
): Promise<string[]> {
  const {
    githubToken,
    type = 'all',
    sort = 'updated',
    direction = 'desc',
    perPage = 100,
    maxRepos = 1000,
    includePrivate = false, // Default: only public repos
  } = options;

  const headers: Record<string, string> = {
    Accept: 'application/vnd.github.v3+json',
    'User-Agent': 'rag-repo-harness',
  };

  if (githubToken) {
    headers.Authorization = `token ${githubToken}`;
  }

  const repos: string[] = [];
  let page = 1;
  let hasMore = true;

  while (hasMore && repos.length < maxRepos) {
    try {
      // Try user endpoint first
      let url = `${GITHUB_API_BASE}/users/${username}/repos?type=${type}&sort=${sort}&direction=${direction}&per_page=${perPage}&page=${page}`;
      let response = await fetch(url, { headers });

      // If user endpoint fails, try org endpoint
      if (!response.ok && response.status === 404) {
        url = `${GITHUB_API_BASE}/orgs/${username}/repos?type=${type}&sort=${sort}&direction=${direction}&per_page=${perPage}&page=${page}`;
        response = await fetch(url, { headers });
      }

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error(`User or organization '${username}' not found`);
        }
        if (response.status === 403) {
          throw new Error(
            'Rate limited or insufficient permissions. Make sure ACTION_TOKEN has proper permissions.'
          );
        }
        throw new Error(`GitHub API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();

      if (!Array.isArray(data) || data.length === 0) {
        hasMore = false;
        break;
      }

      // Extract full repository names (owner/repo)
      // Filter by private/public based on includePrivate option
      for (const repo of data as GitHubRepo[]) {
        if (repos.length >= maxRepos) {
          hasMore = false;
          break;
        }
        // Only include public repos unless includePrivate is explicitly true
        if (includePrivate || !repo.private) {
          repos.push(repo.full_name);
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
      // Sanitize error message to prevent token leaks
      const safeError = new Error(sanitizeErrorMessage(error, githubToken));
      console.error(`Error fetching repos for ${username}:`, safeError.message);
      throw safeError;
    }
  }

  return repos;
}

/**
 * Fetch repository details
 */
export async function fetchRepoDetails(
  repo: string,
  options: { githubToken?: string } = {}
): Promise<GitHubRepo | null> {
  const { githubToken } = options;
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

  try {
    const url = `${GITHUB_API_BASE}/repos/${owner}/${repoName}`;
    const response = await fetch(url, { headers });

    if (!response.ok) {
      if (response.status === 404) {
        return null;
      }
      throw new Error(`GitHub API error: ${response.status} ${response.statusText}`);
    }

    return (await response.json()) as GitHubRepo;
  } catch (error) {
    // Sanitize error message to prevent token leaks
    const safeMessage = sanitizeErrorMessage(error, githubToken);
    console.error(`Error fetching repo details for ${repo}:`, safeMessage);
    return null;
  }
}
