/**
 * KB Loader
 * Loads and validates kb.json from the public directory
 */

import type { KnowledgeBase } from '../../types/kb.types.ts';

const KB_PATH = '/kb.json';
const KB_MIN_PATH = '/kb.min.json';

let cachedKB: KnowledgeBase | null = null;

/**
 * Load knowledge base from public directory
 */
export async function loadKB(): Promise<KnowledgeBase> {
  if (cachedKB) {
    return cachedKB;
  }

  try {
    // Try minified version first (smaller)
    const response = await fetch(KB_MIN_PATH);
    if (!response.ok) {
      throw new Error(`Failed to load ${KB_MIN_PATH}: ${response.statusText}`);
    }

    const data = await response.json();
    cachedKB = data as KnowledgeBase;

    // Basic validation
    if (!cachedKB.meta || !cachedKB.docs || !cachedKB.index) {
      throw new Error('Invalid KB structure');
    }

    return cachedKB;
  } catch {
    // Fallback to non-minified version
    try {
      const response = await fetch(KB_PATH);
      if (!response.ok) {
        throw new Error(`Failed to load ${KB_PATH}: ${response.statusText}`);
      }

      const data = await response.json();
      cachedKB = data as KnowledgeBase;

      if (!cachedKB.meta || !cachedKB.docs || !cachedKB.index) {
        throw new Error('Invalid KB structure');
      }

      return cachedKB;
    } catch (fallbackError) {
      throw new Error(`Failed to load knowledge base: ${fallbackError}`);
    }
  }
}

/**
 * Clear cached KB (useful for testing or reloading)
 */
export function clearKBCache(): void {
  cachedKB = null;
}
