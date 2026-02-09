/**
 * Index Builder Module
 * Creates lunr.js search index and optionally generates embeddings
 */

import lunr from 'lunr';
import type { KBDocument, KBIndex } from '../../src/types/kb.types.ts';
import { generateEmbeddings } from './embeddings.ts';

export interface IndexBuilderOptions {
  generateEmbeddings?: boolean; // Whether to generate embeddings (default: false)
}

/**
 * Build lunr.js index from documents
 */
export async function buildIndex(
  docs: KBDocument[],
  options: IndexBuilderOptions = {}
): Promise<KBIndex> {
  console.log(`Building search index for ${docs.length} documents...`);

  // Create lunr index
  const idx = lunr(function () {
    this.ref('id');
    this.field('title', { boost: 10 });
    this.field('contentExcerpt', { boost: 1 });
    this.field('path', { boost: 5 });
    this.field('repo', { boost: 3 });
    this.field('lang', { boost: 2 });

    // Add documents
    for (const doc of docs) {
      this.add({
        id: doc.id,
        title: doc.title,
        contentExcerpt: doc.contentExcerpt,
        path: doc.path,
        repo: doc.repo,
        lang: doc.lang,
      });
    }
  });

  // Serialize index
  const serializedIndex = JSON.stringify(idx.toJSON());

  const index: KBIndex = {
    lunrIndex: serializedIndex,
  };

  // Generate embeddings if requested
  if (options.generateEmbeddings) {
    try {
      const embeddings = await generateEmbeddings(docs);
      index.embeddingsLite = embeddings;
      console.log(`✓ Added ${Object.keys(embeddings).length} embeddings to index`);
    } catch (error) {
      console.warn(`⚠️  Failed to generate embeddings: ${error}`);
      console.warn('  Continuing with keyword search only...');
    }
  }

  return index;
}
