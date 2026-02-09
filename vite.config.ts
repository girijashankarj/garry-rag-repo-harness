import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig(({ mode }) => ({
  base: process.env.GITHUB_PAGES === 'true' ? '/garry-rag-repo-harness/' : '/',
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  define: {
    __DEV__: mode !== 'production',
    __LOG_LEVEL__: JSON.stringify(process.env.VITE_LOG_LEVEL || ''),
  },
}));
