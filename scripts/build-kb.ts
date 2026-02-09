#!/usr/bin/env tsx
/**
 * Main Build Script
 * Orchestrates the entire knowledge base build process
 */

import { readFileSync, mkdirSync, rmSync, existsSync } from 'fs';
import { join } from 'path';
import chalk from 'chalk';
import ora from 'ora';
import { intakeRepos, type RepoConfig } from './modules/repo-intake.ts';
import { chunkFile } from './modules/chunking.ts';
import { scanAndRedact, generateScanReport } from './modules/secret-scan.ts';
import { buildIndex } from './modules/index-builder.ts';
import { writeKB } from './modules/kb-schema.ts';
import type { KnowledgeBase, KBDocument, PullRequestInfo } from '../src/types/kb.types.ts';

const CONFIG_PATH = 'rag.config.json';
const DEFAULT_OUTPUT_DIR = './dist';

interface BuildConfig extends RepoConfig {
  maxChunkSize?: number;
  kbSizeLimit?: number;
  fetchPRs?: boolean;
  maxPRs?: number;
  generateEmbeddings?: boolean; // Generate embeddings for semantic search
}

async function main() {
  console.log(chalk.blue.bold('\n🔍 RAG Harness KB Builder\n'));

  // Load config
  let config: BuildConfig;
  try {
    const configContent = readFileSync(CONFIG_PATH, 'utf8');
    config = JSON.parse(configContent);
  } catch {
    console.error(chalk.red(`✗ Failed to load ${CONFIG_PATH}`));
    console.error(
      chalk.yellow('Please create rag.config.json with your repository configuration.')
    );
    process.exit(1);
  }

  // Use ACTION_USER environment variable (required if repos not specified)
  if (!config.repos || config.repos.length === 0) {
    const actionUser = process.env.ACTION_USER;
    if (!actionUser) {
      console.error(
        chalk.red('✗ ACTION_USER environment variable is required when repos list is not provided')
      );
      console.error(
        chalk.yellow('Please set ACTION_USER environment variable with your GitHub username')
      );
      process.exit(1);
    }
    console.log(chalk.cyan(`ℹ️  Using ACTION_USER environment variable: ${actionUser}`));
  }

  const outputDir = config.outputDir || DEFAULT_OUTPUT_DIR;
  mkdirSync(outputDir, { recursive: true });

  const spinner = ora('Starting build process...').start();

  try {
    // Step 1: Intake repositories
    spinner.text = 'Intaking repositories...';
    const manifests = await intakeRepos(config);
    spinner.succeed(`Intaked ${manifests.length} repository manifest(s)`);

    // Step 2: Process files and chunk
    spinner.start('Processing files and chunking...');
    const allDocuments: KBDocument[] = [];
    const scanResults: Array<{
      hasSecrets: boolean;
      redactedContent: string;
      secretsFound: Array<{ type: string; count: number }>;
    }> = [];

    for (const manifest of manifests) {
      for (const filePath of manifest.files) {
        try {
          const relativePath = filePath.replace(manifest.path + '/', '');
          const chunks = chunkFile(filePath, manifest.repo, relativePath, {
            maxChunkSize: config.maxChunkSize || 3000,
          });

          // Get PR info for this file if available
          let filePRs: PullRequestInfo[] | undefined;
          if (manifest.fileToPRs) {
            // Try to find matching PRs for this file
            const normalizedPath = relativePath.startsWith('/')
              ? relativePath.slice(1)
              : relativePath;
            for (const [key, prs] of Object.entries(manifest.fileToPRs)) {
              if (key === filePath || key.endsWith(normalizedPath) || filePath.endsWith(key)) {
                filePRs = prs;
                break;
              }
            }
          }

          // Scan for secrets
          for (const chunk of chunks) {
            // Ensure contentExcerpt exists and is not empty
            if (!chunk.contentExcerpt || chunk.contentExcerpt.trim().length === 0) {
              console.warn(`⚠️  Skipping empty chunk for ${relativePath}`);
              continue;
            }

            const scanResult = scanAndRedact(chunk.contentExcerpt);
            scanResults.push(scanResult);

            if (scanResult.hasSecrets) {
              // Redact content, but ensure it's not empty
              const redacted = scanResult.redactedContent.trim();
              if (redacted.length > 0) {
                chunk.contentExcerpt = redacted;
              } else {
                // If redaction removed all content, keep original but mark as redacted
                chunk.contentExcerpt = '[Content redacted - see original file]';
              }
            }

            // Final validation: ensure contentExcerpt is not empty
            if (!chunk.contentExcerpt || chunk.contentExcerpt.trim().length === 0) {
              console.warn(`⚠️  Skipping chunk with empty contentExcerpt for ${relativePath}`);
              continue;
            }

            // Associate PR info with chunk (use the most recent PR)
            if (filePRs && filePRs.length > 0) {
              // Sort by updated date (most recent first) and take the first one
              const sortedPRs = [...filePRs].sort(
                (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
              );
              chunk.pullRequest = sortedPRs[0];
            }

            allDocuments.push(chunk);
          }
        } catch (error) {
          console.warn(chalk.yellow(`⚠️  Failed to process ${filePath}: ${error}`));
        }
      }
    }

    spinner.succeed(`Processed ${allDocuments.length} document chunks`);

    // Step 3: Secret scan report
    const scanReport = generateScanReport(scanResults);
    console.log(chalk.cyan('\n📋 Secret Scan Report:'));
    console.log(scanReport);

    // Step 4: Build search index
    spinner.start('Building search index...');
    const index = await buildIndex(allDocuments, {
      generateEmbeddings: config.generateEmbeddings || false,
    });
    spinner.succeed('Search index built');

    // Step 5: Create KB structure
    spinner.start('Creating knowledge base structure...');

    // Count unique repos that actually have documents
    const uniqueReposWithDocs = new Set(allDocuments.map((d) => d.repo));
    const actualRepoCount = uniqueReposWithDocs.size;

    // Collect PR stats (only for repos that have documents)
    const reposWithDocs = Array.from(uniqueReposWithDocs);
    const prStats = manifests
      .filter((m) => reposWithDocs.includes(m.repo))
      .map((m) => m.prStats)
      .filter((stats): stats is NonNullable<typeof stats> => stats !== undefined);

    // Determine source scope based on whether ACTION_USER was used (vs explicit repos list)
    const usedGitHubUser = process.env.ACTION_USER || !config.repos || config.repos.length === 0;

    const kb: KnowledgeBase = {
      meta: {
        generatedAt: new Date().toISOString(),
        sourceScope: usedGitHubUser ? 'public-only' : 'private-local',
        repoCount: actualRepoCount, // Count repos that actually have documents
        docCount: allDocuments.length,
        version: manifests[0]?.commit || 'unknown',
        prStats: prStats.length > 0 ? prStats : undefined,
      },
      docs: allDocuments,
      index,
    };

    // Step 6: Write KB
    spinner.start('Writing knowledge base...');
    writeKB(kb, outputDir);
    spinner.succeed('Knowledge base written');

    console.log(chalk.green.bold('\n✅ Build completed successfully!\n'));
    console.log(chalk.cyan(`📊 Statistics:`));
    console.log(`   Repositories processed: ${manifests.length}`);
    console.log(`   Repositories with documents: ${actualRepoCount}`);
    console.log(`   Documents: ${allDocuments.length}`);
    if (prStats.length > 0) {
      const totalOpen = prStats.reduce((sum, s) => sum + s.openPRs, 0);
      console.log(`   Pull Requests: ${totalOpen} open PRs`);
    }
    console.log(`   Output: ${outputDir}/kb.json`);

    // Step 7: Cleanup temporary files
    spinner.start('Cleaning up temporary files...');
    const reposDir = join(process.cwd(), '.repos');
    if (existsSync(reposDir)) {
      rmSync(reposDir, { recursive: true, force: true });
      console.log(chalk.green(`✓ Cleaned up ${reposDir}`));
    }
    spinner.succeed('Cleanup completed');
  } catch (error) {
    spinner.fail('Build failed');
    console.error(chalk.red('\n✗ Error:'), error);

    // Cleanup on error too
    try {
      const reposDir = join(process.cwd(), '.repos');
      if (existsSync(reposDir)) {
        rmSync(reposDir, { recursive: true, force: true });
        console.log(chalk.yellow('✓ Cleaned up temporary files'));
      }
    } catch {
      // Ignore cleanup errors
    }

    process.exit(1);
  }
}

main().catch((error) => {
  console.error(chalk.red('\n✗ Fatal error:'), error);
  process.exit(1);
});
