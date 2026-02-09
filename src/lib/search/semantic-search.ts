/**
 * Semantic Search Module
 * Performs semantic search using pre-computed embeddings and cosine similarity
 */

import { pipeline, env } from '@xenova/transformers';
import type { KnowledgeBase, SearchResult, SearchFilters } from '../../types/kb.types.ts';

// Use local models (no external API calls)
env.allowLocalModels = true;
env.allowRemoteModels = false;

const MODEL_NAME = 'Xenova/all-MiniLM-L6-v2'; // Same model as build-time

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let embeddingPipeline: any = null;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let modelLoadingPromise: Promise<any> | null = null;
let isModelLoading = false;

/**
 * Check if model is currently loading
 */
export function isModelLoadingState(): boolean {
  return isModelLoading;
}

/**
 * Initialize the embedding pipeline (lazy load)
 * Returns a promise that resolves when model is ready
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function initializePipeline(): Promise<any> {
  if (embeddingPipeline) {
    return embeddingPipeline;
  }

  // If already loading, return the existing promise
  if (modelLoadingPromise) {
    return modelLoadingPromise;
  }

  // Start loading
  isModelLoading = true;
  modelLoadingPromise = pipeline('feature-extraction', MODEL_NAME, {
    quantized: true,
  })
    .then((pipe) => {
      embeddingPipeline = pipe;
      isModelLoading = false;
      modelLoadingPromise = null;
      return pipe;
    })
    .catch((error) => {
      isModelLoading = false;
      modelLoadingPromise = null;
      throw error;
    });

  return modelLoadingPromise;
}

/**
 * Calculate cosine similarity between two vectors
 */
function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    return 0;
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  const denominator = Math.sqrt(normA) * Math.sqrt(normB);
  if (denominator === 0) {
    return 0;
  }

  return dotProduct / denominator;
}

/**
 * Generate embedding for query text using Transformers.js
 */
async function generateQueryEmbedding(query: string): Promise<number[]> {
  const pipe = await initializePipeline();

  // Truncate if too long (model limit)
  const text = query.length > 512 ? query.substring(0, 512) : query;

  const output = await pipe(text, {
    pooling: 'mean',
    normalize: true,
  });

  return Array.from(output.data);
}

/**
 * Check if embeddings are available
 */
export function hasEmbeddings(kb: KnowledgeBase): boolean {
  return !!kb.index.embeddingsLite && Object.keys(kb.index.embeddingsLite).length > 0;
}

/**
 * Perform semantic search using embeddings
 */
export async function semanticSearch(
  query: string,
  kb: KnowledgeBase,
  filters?: SearchFilters,
  limit: number = 20
): Promise<SearchResult[]> {
  if (!hasEmbeddings(kb)) {
    throw new Error(
      'Semantic search requires embeddings. Please rebuild the knowledge base with generateEmbeddings: true in rag.config.json'
    );
  }

  try {
    const embeddings = kb.index.embeddingsLite!;

    // Generate query embedding (this will load the model if needed)
    const queryEmbedding = await generateQueryEmbedding(query);

    // Calculate similarities
    const similarities: Array<{ docId: string; score: number }> = [];

    for (const [docId, docEmbedding] of Object.entries(embeddings)) {
      const similarity = cosineSimilarity(queryEmbedding, docEmbedding);
      if (similarity > 0) {
        similarities.push({ docId, score: similarity });
      }
    }

    // Sort by similarity (highest first)
    similarities.sort((a, b) => b.score - a.score);

    // Map to search results
    const results: SearchResult[] = [];

    for (const { docId, score } of similarities.slice(0, limit * 2)) {
      const doc = kb.docs.find((d) => d.id === docId);
      if (!doc) {
        continue;
      }

      // Apply filters
      if (filters) {
        if (filters.repo && doc.repo !== filters.repo) {
          continue;
        }
        if (filters.language && doc.lang !== filters.language) {
          continue;
        }
        if (filters.tag && !doc.tags.includes(filters.tag)) {
          continue;
        }
        if (filters.prStatus && filters.prStatus !== 'all') {
          if (!doc.pullRequest || doc.pullRequest.state !== filters.prStatus) {
            continue;
          }
        }
        if (filters.fileType) {
          const fileExt = doc.path.split('.').pop()?.toLowerCase();
          if (fileExt !== filters.fileType.toLowerCase()) {
            continue;
          }
        }
      }

      results.push({
        doc,
        score,
      });

      if (results.length >= limit) {
        break;
      }
    }

    return results;
  } catch (error) {
    // If semantic search fails (e.g., model loading error), return empty results
    // This allows keyword search to still work
    console.warn('Semantic search failed:', error);
    return [];
  }
}
