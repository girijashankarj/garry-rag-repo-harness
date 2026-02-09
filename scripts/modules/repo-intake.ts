/**
 * Repo Intake Module
 * Clones/pulls GitHub repositories and prepares them for indexing
 */

import simpleGit from 'simple-git';
import type { SimpleGit } from 'simple-git';
import { existsSync, mkdirSync, statSync, rmSync } from 'fs';
import { join } from 'path';
import type { IgnoreConfig } from './ignore-filters.ts';
import { loadRagIgnore, shouldIncludeFile } from './ignore-filters.ts';
import { glob } from 'glob';
import { getPRStats, mapFilesToPRs, type PRFetcherConfig } from './pr-fetcher.ts';
import { fetchUserRepos, type FetchReposOptions } from './github-api.ts';

export interface RepoConfig {
  repos?: string[]; // ["owner/repo1", "owner/repo2"] - optional if ACTION_USER env var provided
  repoType?: 'all' | 'owner' | 'member'; // For user repos: all, owner, or member
  includePrivate?: boolean; // Include private repos (requires token with repo scope)
  branches?: string[]; // ["main", "master", "dev", "develop", "qa"] - defaults to ["main"]
  outputDir?: string;
  fetchPRs?: boolean; // Whether to fetch PR data
  maxPRs?: number; // Maximum PRs to fetch per repo (default: 1000)
  maxRepos?: number; // Maximum repos to fetch from user/org (default: 1000)
}

import type { PullRequestInfo, RepoPRStats } from '../../src/types/kb.types.ts';

export interface RepoManifest {
  repo: string;
  path: string;
  branch: string;
  commit: string;
  files: string[];
  prStats?: RepoPRStats;
  fileToPRs?: Record<string, PullRequestInfo[]>; // Map of file path to PRs that changed it (serialized)
}

const REPOS_DIR = '.repos';

/**
 * Clone or update a repository
 * Handles missing branches gracefully by trying to detect default branch
 */
async function cloneOrUpdateRepo(
  repo: string,
  branch: string,
  reposDir: string
): Promise<{ path: string; commit: string } | null> {
  const repoPath = join(reposDir, repo.replace('/', '_'));

  const git: SimpleGit = simpleGit();

  if (existsSync(repoPath)) {
    // Update existing repo
    console.log(`  Updating ${repo} (${branch})...`);
    const repoGit = simpleGit(repoPath);
    try {
      await repoGit.fetch();
      await repoGit.checkout(branch);
      await repoGit.pull('origin', branch);
    } catch {
      // Branch might not exist, try to get default branch
      console.warn(`  ⚠️  Branch ${branch} not found, trying default branch...`);
      try {
        const remotes = await repoGit.getRemotes(true);
        const origin = remotes.find((r) => r.name === 'origin');
        if (origin) {
          await repoGit.fetch();
          const branches = await repoGit.branch(['-r']);
          // Try common default branch names
          const defaultBranches = ['main', 'master', 'develop', 'dev'];
          let found = false;
          for (const defaultBranch of defaultBranches) {
            if (branches.all.some((b) => b.includes(`origin/${defaultBranch}`))) {
              await repoGit.checkout(defaultBranch);
              await repoGit.pull('origin', defaultBranch);
              found = true;
              break;
            }
          }
          if (!found) {
            throw new Error(`No default branch found for ${repo}`);
          }
        }
      } catch (fallbackError) {
        console.warn(`  ⚠️  Could not update ${repo}: ${fallbackError}`);
        return null;
      }
    }
  } else {
    // Clone new repo
    console.log(`  Cloning ${repo} (${branch})...`);
    mkdirSync(repoPath, { recursive: true });
    const repoUrl = `https://github.com/${repo}.git`;
    try {
      await git.clone(repoUrl, repoPath, ['--branch', branch, '--single-branch', '--depth', '1']);
    } catch {
      // Branch doesn't exist, try cloning without branch specification to get default
      console.warn(`  ⚠️  Branch ${branch} not found, cloning default branch...`);
      try {
        // Clone without branch spec to get default branch
        await git.clone(repoUrl, repoPath, ['--depth', '1']);
        const repoGit = simpleGit(repoPath);
        const currentBranch = (await repoGit.revparse(['--abbrev-ref', 'HEAD'])).trim();
        console.log(`  ✓ Cloned ${repo} with default branch: ${currentBranch}`);
      } catch (cloneError) {
        console.warn(`  ⚠️  Could not clone ${repo}: ${cloneError}`);
        // Clean up failed clone directory
        if (existsSync(repoPath)) {
          rmSync(repoPath, { recursive: true, force: true });
        }
        return null;
      }
    }
  }

  // Get commit hash
  const repoGit = simpleGit(repoPath);
  const commit = (await repoGit.revparse(['HEAD'])).trim();

  return { path: repoPath, commit };
}

/**
 * Get all files from a repository
 */
async function getRepoFiles(repoPath: string, config: IgnoreConfig): Promise<string[]> {
  const files: string[] = [];

  // Use glob to find all files
  const allFiles = await glob('**/*', {
    cwd: repoPath,
    absolute: true,
    ignore: config.denylist.map((pattern) => pattern.replace(/^\*\*\//, '')),
    nodir: true,
  });

  // Filter files using shouldIncludeFile
  for (const filePath of allFiles) {
    try {
      if (statSync(filePath).isFile() && shouldIncludeFile(filePath, repoPath, config)) {
        files.push(filePath);
      }
    } catch {
      // Skip files that can't be accessed
    }
  }

  return files;
}

/**
 * Intake repositories
 */
export async function intakeRepos(config: RepoConfig): Promise<RepoManifest[]> {
  const reposDir = join(process.cwd(), REPOS_DIR);
  mkdirSync(reposDir, { recursive: true });

  const manifests: RepoManifest[] = [];
  const reposToProcess: string[] = [];

  const githubToken = process.env.ACTION_TOKEN;
  // Default branches: main, master only, limit to max 5
  const allBranches = config.branches || ['main', 'master'];
  const branches = allBranches.slice(0, 5); // Limit to max 5 branches
  const fetchPRs = config.fetchPRs !== false; // Default to true
  const prConfig: PRFetcherConfig = {
    githubToken,
    maxPRs: config.maxPRs || 1000,
  };

  // Collect repos to process
  if (config.repos && config.repos.length > 0) {
    // Use explicit repo list if provided
    reposToProcess.push(...config.repos);
  } else {
    // Use ACTION_USER environment variable (required)
    const username = process.env.ACTION_USER;

    if (!username) {
      throw new Error(
        'Either repos list in config or ACTION_USER environment variable must be provided'
      );
    }

    // Fetch repos dynamically from GitHub API

    if (!githubToken) {
      console.warn(
        '⚠️  No ACTION_TOKEN found. Fetching public repos only (rate-limited to 60 req/hour)'
      );
    } else {
      console.log(`✓ Using ACTION_TOKEN - fetching public repositories only`);
    }

    console.log(`Fetching public repositories for ${username}...`);
    const fetchOptions: FetchReposOptions = {
      githubToken,
      type: config.repoType || 'owner', // Only repos created by ACTION_USER
      sort: 'updated',
      direction: 'desc',
      perPage: 100,
      maxRepos: config.maxRepos || 1000,
      includePrivate: config.includePrivate || false, // Default: only public repos
    };

    const fetchedRepos = await fetchUserRepos(username, fetchOptions);

    // Filter repos: only "garry-" prefix, skip garry-rag-repo-harness
    const currentRepoName = process.env.GITHUB_REPOSITORY;
    const filteredRepos = fetchedRepos.filter((repo) => {
      // Skip current repo
      if (currentRepoName && repo === currentRepoName) {
        console.log(`  ⏭️  Skipping ${repo} (current repository)`);
        return false;
      }
      // Skip garry-rag-repo-harness
      if (repo.includes('garry-rag-repo-harness')) {
        console.log(`  ⏭️  Skipping ${repo} (self-referencing)`);
        return false;
      }
      // Only include repos with "garry-" prefix
      const repoName = repo.split('/')[1];
      if (!repoName.startsWith('garry-')) {
        return false;
      }
      return true;
    });

    reposToProcess.push(...filteredRepos);

    console.log(`✓ Found ${fetchedRepos.length} repository(ies) for ${username}`);
    console.log(
      `✓ Filtered to ${filteredRepos.length} repo(s) with "garry-" prefix (excluding garry-rag-repo-harness)`
    );

    if (filteredRepos.length === 0) {
      throw new Error(
        `No repositories found for ${username} after filtering. Check if the user/org exists and has accessible repos.`
      );
    }
  }

  // Process each repo
  for (const repo of reposToProcess) {
    for (const branch of branches) {
      try {
        const cloneResult = await cloneOrUpdateRepo(repo, branch, reposDir);
        if (!cloneResult) {
          console.warn(`  ⚠️  Skipping ${repo}@${branch} (clone failed)`);
          continue;
        }

        const { path: repoPath, commit } = cloneResult;
        const ignoreConfig = loadRagIgnore(repoPath);
        const files = await getRepoFiles(repoPath, ignoreConfig);

        const manifest: RepoManifest = {
          repo,
          path: repoPath,
          branch,
          commit,
          files,
        };

        // Fetch PR data if enabled
        if (fetchPRs) {
          try {
            console.log(`  Fetching PR data for ${repo}...`);
            const prStats = await getPRStats(repo, prConfig);
            manifest.prStats = prStats;

            // Map files to PRs
            console.log(`  Mapping files to PRs for ${repo}...`);
            const fileToPRsMap = await mapFilesToPRs(repo, files, prConfig);
            // Convert Map to Record for JSON serialization
            const fileToPRsRecord: Record<string, PullRequestInfo[]> = {};
            for (const [filePath, prs] of fileToPRsMap.entries()) {
              fileToPRsRecord[filePath] = prs;
            }
            manifest.fileToPRs = fileToPRsRecord;

            console.log(
              `  ✓ PR stats: ${prStats.totalPRs} total (${prStats.openPRs} open, ${prStats.mergedPRs} merged)`
            );
          } catch (error) {
            console.warn(`  ⚠️  Failed to fetch PR data for ${repo}: ${error}`);
            // Continue without PR data
          }
        }

        manifests.push(manifest);

        console.log(`  ✓ Processed ${repo}@${branch}: ${files.length} files`);
      } catch (error) {
        console.warn(`  ⚠️  Failed to process ${repo}@${branch}: ${error}`);
        // Continue with other repos/branches instead of failing completely
        continue;
      }
    }
  }

  if (manifests.length === 0) {
    throw new Error('No repositories were successfully processed. Check logs for errors.');
  }

  return manifests;
}
