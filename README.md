# Garry RAG Repo Harness

<p align="center">
  <strong>Garry RAG Harness for GitHub Repos</strong><br/>
  Index your GitHub repositories and search them with citations - all static, safe, and read-only.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/react-19-blue?logo=react" alt="React 19" />
  <img src="https://img.shields.io/badge/typescript-5.9-blue?logo=typescript" alt="TypeScript" />
  <img src="https://img.shields.io/badge/vite-7-purple?logo=vite" alt="Vite 7" />
  <img src="https://img.shields.io/badge/tailwind-4-blue?logo=tailwindcss" alt="Tailwind v4" />
  <img src="https://img.shields.io/badge/license-MIT-green" alt="MIT License" />
</p>

<p align="center">
  <a href="https://girijashankarj.github.io/garry-rag-repo-harness/"><strong>Live Demo</strong></a>
</p>

---

## Overview

**Garry RAG Repo Harness** is a static, privacy-first RAG (Retrieval-Augmented Generation) system that indexes your GitHub repositories and provides a searchable interface with citations. It's designed to be:

- **Static**: Runs entirely on GitHub Pages - no backend server required
- **Safe**: No API keys or tokens in the browser
- **Private**: Secrets are scanned and redacted before indexing
- **Search Modes**: Keyword, semantic, and hybrid search capabilities

### Key Features

- 🔍 **Multi-mode search** - Keyword (lunr.js), semantic (embeddings), and hybrid (minimum 2 words)
- 📚 **Citation support** - GitHub links with line numbers
- 🔒 **Secret scanning** - Automatic detection and redaction
- 🎯 **Filtering** - By repository, language, file type, PR status, and tags
- 🔀 **Pull Request integration** - Open PR numbers, titles, and changed file counts
- 📦 **Single file output** - `kb.json` for easy deployment
- 🚀 **GitHub Pages ready** - Fully static deployment
- 🌐 **Public repos only** - Only indexes public repositories by default

---

## Documentation

- 📐 [Architecture](./docs/ARCHITECTURE.md) - System architecture and design diagrams
- 🔒 [Security](./docs/SECURITY.md) - Security best practices and token handling
- 🔑 [Token Permissions](./docs/TOKEN-PERMISSIONS.md) - GitHub token setup guide

---

## Quick Start

**Prerequisites**: Node.js >= 20.19 (recommended: v24.13.0), npm >= 10

```bash
# Clone the repo
git clone <your-repo-url>
cd garry-rag-repo-harness

# Install dependencies
npm install

# Configure
# Edit rag.config.json with your GitHub username or repo list

# Build knowledge base
npm run build:kb

# Start development server
npm run dev

# Build for production
npm run build
```

---

## Configuration

Edit `rag.config.json`:

**Option A: Fetch repos dynamically (Recommended)**

```json
{
  "repoType": "owner",
  "branches": ["main", "master"],
  "outputDir": "./dist",
  "maxChunkSize": 3000,
  "kbSizeLimit": 20000000,
  "fetchPRs": true,
  "maxPRs": 1000,
  "maxRepos": 50,
  "generateEmbeddings": true
}
```

**Note**:

- Set `ACTION_USER` environment variable with your GitHub username (required)
- Only public repositories are indexed by default
- Only repos with "garry-" prefix are indexed (configurable in code)
- Only repos created by `ACTION_USER` are fetched (`repoType: "owner"`)

**Option B: Explicit repo list**

```json
{
  "repos": ["owner/repo1", "owner/repo2"],
  "branches": ["main", "master"],
  "outputDir": "./dist",
  "maxChunkSize": 3000,
  "kbSizeLimit": 20000000,
  "fetchPRs": true,
  "maxPRs": 1000,
  "generateEmbeddings": true,
  "includePrivate": false
}
```

**Note**: Set `includePrivate: true` to include private repos (requires token with repo scope).

**Environment Variables**:

- `ACTION_USER`: Your GitHub username (required when using dynamic repo fetching)
- `ACTION_TOKEN`: GitHub API token for authentication (required for PR fetching and higher rate limits)

**Search Requirements**:

- Minimum 2 words required for search queries
- Keyword search: Always available
- Semantic/Hybrid search: Requires `generateEmbeddings: true` in config

---

## Tech Stack

- **TypeScript 5.9** — Type safety
- **React 19** — UI framework
- **Vite 7** — Build tool
- **Tailwind CSS v4** — Styling
- **shadcn/ui** — UI components
- **lunr.js** — Keyword search
- **@xenova/transformers** — Semantic search embeddings
- **Jest + Testing Library** — Testing
- **ESLint 9 + Prettier** — Code quality

---

## Project Structure

```
src/
├── components/      # React components
│   ├── search/      # Search UI components
│   └── ui/          # shadcn/ui components
├── hooks/           # Custom React hooks
├── lib/
│   └── search/      # Search engine (keyword, semantic, hybrid)
├── types/           # TypeScript types
└── utils/           # Utility functions

scripts/
├── build-kb.ts      # Main build script
└── modules/         # Build modules
    ├── repo-intake.ts
    ├── ignore-filters.ts
    ├── secret-scan.ts
    ├── chunking.ts
    ├── index-builder.ts
    ├── embeddings.ts
    └── kb-schema.ts
```

---

## Development

### Available Scripts

- `npm run dev` — Start development server
- `npm run build` — Build for production
- `npm run build:kb` — Build knowledge base only
- `npm run preview` — Preview production build
- `npm run cleanup` — Clean up temporary files and directories
- `npm run lint` — Run ESLint
- `npm run lint:fix` — Fix ESLint errors
- `npm run format` — Format code with Prettier
- `npm run format:check` — Check code formatting
- `npm test` — Run tests with coverage
- `npm run verify:security` — Verify no tokens leaked

### Code Quality

- **Type checking**: `tsc -b`
- **Linting**: ESLint 9 (flat config)
- **Formatting**: Prettier
- **Testing**: Jest + Testing Library

---

## Architecture

See [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md) for detailed architecture documentation with diagrams.

### Build Time (Local/GitHub Actions)

1. **Repo Intake** - Fetch public repos from GitHub API, clone/pull repositories, fetch open PR data
2. **File Filtering** - Apply `.ragignore` and `.gitignore`
3. **Secret Scanning** - Detect and redact secrets
4. **Chunking** - Split documents by structure (headings, functions, size)
5. **Index Building** - Create lunr.js index and generate embeddings (if enabled)
6. **KB Generation** - Output `kb.json` with indexed content
7. **Cleanup** - Remove temporary files (`.repos`, cache, etc.)

### Runtime (GitHub Pages)

- Static UI loads `kb.json`
- In-browser search using lunr.js (keyword) and Transformers.js (semantic)
- Minimum 2 words required for search queries
- Results displayed with citations and GitHub links
- Markdown content rendered with proper formatting
- No external network calls (except loading `kb.json`)

---

## Security & Privacy

### Secret Scanning

The build process automatically scans for:

- GitHub tokens
- AWS keys
- JWT tokens
- Private keys
- Passwords
- High-entropy strings

Secrets are **redacted** before indexing. If high-confidence secrets are found, the build may fail (configurable).

### Privacy Guarantees

- ✅ No API keys or tokens in browser
- ✅ No backend server required
- ✅ Secrets are redacted before publishing
- ✅ Only sanitized excerpts are indexed (1-3 KB per chunk)
- ✅ Full file contents are never published

See [docs/SECURITY.md](./docs/SECURITY.md) for detailed security documentation.

See [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md) for architecture documentation.

---

## Deploy to GitHub Pages

1. **Enable GitHub Pages** in your repository settings
2. **Add secrets** in repository settings → Secrets:
   - `ACTION_USER`: Your GitHub username
   - `ACTION_TOKEN`: Your GitHub token (see [docs/TOKEN-PERMISSIONS.md](./docs/TOKEN-PERMISSIONS.md))
3. **Push to main branch** or manually trigger workflow
4. The GitHub Actions workflow will:
   - Build `kb.json` (fetches public repos, indexes content)
   - Clean up temporary files automatically
   - Build the site
   - Deploy to GitHub Pages

**Note**: The workflow automatically cleans up temporary files (`.repos`, cache, etc.) after each build. No manual cleanup needed.

---

## Limitations

- **Static only**: No real-time updates - rebuild required for new content
- **Size limit**: KB must be < 20MB
- **Public repos only**: Only public repositories are indexed by default (set `includePrivate: true` for private repos)
- **Search minimum**: Requires at least 2 words per search query
- **No LLM**: This is a search/retrieval system, not an LLM-based Q&A
- **Semantic search**: Requires embeddings to be generated at build time (`generateEmbeddings: true`)

---

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'feat: add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Commit Convention

This project uses [Conventional Commits](https://www.conventionalcommits.org/).

---

## License

MIT License — see LICENSE file for details.

---

## Status

🚧 **In Development** — This project is currently under active development.
