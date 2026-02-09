/**
 * Embeddings Module
 * Generates lightweight embeddings using Hugging Face Transformers.js
 */

import { pipeline, env } from '@xenova/transformers';
import type { KBDocument } from '../../src/types/kb.types.ts';

// Use local models (no external API calls)
env.allowLocalModels = true;
env.allowRemoteModels = false;

// Use a lightweight embedding model
const MODEL_NAME = 'Xenova/all-MiniLM-L6-v2'; // ~23MB, fast, good quality

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let embeddingPipeline: any = null;

/**
 * Initialize the embedding pipeline
 */
async function initializePipeline() {
  if (embeddingPipeline) {
    return embeddingPipeline;
  }

  console.log('  Loading embedding model...');
  embeddingPipeline = await pipeline('feature-extraction', MODEL_NAME, {
    quantized: true, // Use quantized model for smaller size
  });
  console.log('  ✓ Embedding model loaded');
  return embeddingPipeline;
}

/**
 * Generate embedding for a text
 */
async function generateEmbedding(text: string): Promise<number[]> {
  const pipe = await initializePipeline();

  // Combine title and content for better semantic understanding
  const combinedText = text.length > 512 ? text.substring(0, 512) : text;

  const output = await pipe(combinedText, {
    pooling: 'mean',
    normalize: true,
  });

  // Convert tensor to array
  return Array.from(output.data);
}

/**
 * Generate embeddings for all documents
 */
export async function generateEmbeddings(docs: KBDocument[]): Promise<Record<string, number[]>> {
  console.log(`Generating embeddings for ${docs.length} documents...`);

  const embeddings: Record<string, number[]> = {};
  const batchSize = 10; // Process in batches to avoid memory issues

  for (let i = 0; i < docs.length; i += batchSize) {
    const batch = docs.slice(i, i + batchSize);

    // Generate embeddings in parallel for the batch
    const batchPromises = batch.map(async (doc) => {
      const text = `${doc.title}\n${doc.contentExcerpt}`;
      const embedding = await generateEmbedding(text);
      return { id: doc.id, embedding };
    });

    const batchResults = await Promise.all(batchPromises);

    for (const { id, embedding } of batchResults) {
      embeddings[id] = embedding;
    }

    // Progress indicator
    if ((i + batchSize) % 50 === 0 || i + batchSize >= docs.length) {
      console.log(
        `  ✓ Generated embeddings for ${Math.min(i + batchSize, docs.length)}/${docs.length} documents`
      );
    }
  }

  console.log(`✓ Generated ${Object.keys(embeddings).length} embeddings`);
  return embeddings;
}

/**
 * Calculate cosine similarity between two vectors
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error('Vectors must have the same length');
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
