require('@testing-library/jest-dom');

// Polyfill import.meta.env for Jest (Vite injects this at build time)
if (typeof globalThis.import_meta_env === 'undefined') {
  // ts-jest doesn't support import.meta natively, so we use the transform below
}
