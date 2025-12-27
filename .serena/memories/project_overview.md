# Project Overview

## Purpose
Reference-manager is a local reference management CLI tool using CSL-JSON as the single source of truth. It supports adding references from multiple formats (PMID, DOI, BibTeX, RIS, ISBN), generating citations, and managing full-text files.

## Tech Stack
- **Runtime**: Node.js >= 22
- **Language**: TypeScript (ESM)
- **Build**: Vite + tsc
- **Test**: Vitest
- **Lint/Format**: Biome
- **Framework**: Commander (CLI), Hono (HTTP server)
- **Schema Validation**: Zod

## Package Name
`@ncukondo/reference-manager` (npm)

## Entry Points
- CLI: `bin/reference-manager.js` (commands: `ref`, `reference-manager`)
- MCP Server: `mcp --config <path>`
- HTTP Server: `server --config <path>`

## Source Structure
```
src/
├── cli/       # CLI commands
├── core/      # Core library logic
├── features/  # Feature implementations (import, citation, fulltext, etc.)
├── server/    # HTTP server
├── mcp/       # MCP stdio server
├── config/    # Configuration handling
└── utils/     # Utilities
```
