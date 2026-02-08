# Task: Fulltext Retrieval Commands (discover, fetch, convert)

## Purpose

Implement `ref fulltext discover`, `ref fulltext fetch`, and `ref fulltext convert` commands using the `@ncukondo/academic-fulltext` package. These commands enable automated OA discovery, download, and PMC XML to Markdown conversion.

## References

- Spec: `spec/features/fulltext-retrieval.md`
- Dependency: `@ncukondo/academic-fulltext` (npm package)
- Related: `src/cli/commands/fulltext.ts`, `src/features/operations/fulltext/`
- Prerequisite: `20260208-01-fulltext-retrieval-config.md`

## TDD Workflow

For each step, follow the Red-Green-Refactor cycle (see `spec/guidelines/testing.md`).

## Steps

### Step 1: Add `@ncukondo/academic-fulltext` dependency

- [ ] Install: `npm install @ncukondo/academic-fulltext`
- [ ] Verify: import works in a simple test
- [ ] Lint/Type check: `npm run lint && npm run typecheck`

### Step 2: Fulltext Discover Operation

Create operation layer function that takes a reference item, extracts DOI/PMID, and calls `discoverOA()`.

- [ ] Write test: `src/features/operations/fulltext/discover.test.ts`
- [ ] Create stub: `src/features/operations/fulltext/discover.ts`
- [ ] Verify Red
- [ ] Implement: Extract DOI/PMID from CSL-JSON item, call `discoverOA()`, return structured result
- [ ] Verify Green
- [ ] Lint/Type check

### Step 3: Fulltext Fetch Operation

Create operation layer function that discovers OA sources, downloads the best available, and auto-attaches via existing `fulltextAttach`.

- [ ] Write test: `src/features/operations/fulltext/fetch.test.ts`
- [ ] Create stub: `src/features/operations/fulltext/fetch.ts`
- [ ] Verify Red
- [ ] Implement:
  - Call discover operation
  - Download PDF (and PMC XML if available) to temp directory
  - Convert PMC XML to Markdown if downloaded
  - Call `fulltextAttach` to attach files
  - Clean up temp files
- [ ] Verify Green
- [ ] Lint/Type check

### Step 4: Fulltext Convert Operation

Create operation layer function that finds attached PMC XML and converts to Markdown.

- [ ] Write test: `src/features/operations/fulltext/convert.test.ts`
- [ ] Create stub: `src/features/operations/fulltext/convert.ts`
- [ ] Verify Red
- [ ] Implement: Locate XML in attachment dir, call `convertPmcXmlToMarkdown()`, attach result
- [ ] Verify Green
- [ ] Lint/Type check

### Step 5: CLI Command - `fulltext discover`

Register `fulltext discover <id>` subcommand.

- [ ] Write test: `src/cli/commands/fulltext.test.ts` (add discover test cases)
- [ ] Implement: Add to `src/cli/commands/fulltext.ts` and register in `src/cli/index.ts`
- [ ] Verify Green
- [ ] Lint/Type check

### Step 6: CLI Command - `fulltext fetch`

Register `fulltext fetch <id>` subcommand with `--source`, `--force` options.

- [ ] Write test: `src/cli/commands/fulltext.test.ts` (add fetch test cases)
- [ ] Implement: Add to `src/cli/commands/fulltext.ts` and register in `src/cli/index.ts`
- [ ] Verify Green
- [ ] Lint/Type check

### Step 7: CLI Command - `fulltext convert`

Register `fulltext convert <id>` subcommand.

- [ ] Write test: `src/cli/commands/fulltext.test.ts` (add convert test cases)
- [ ] Implement: Add to `src/cli/commands/fulltext.ts` and register in `src/cli/index.ts`
- [ ] Verify Green
- [ ] Lint/Type check

### Step 8: MCP/HTTP Server Endpoints

Add `fulltext_discover`, `fulltext_fetch`, `fulltext_convert` MCP tools and HTTP endpoints.

- [ ] Write test: MCP tool tests
- [ ] Implement: Add MCP tools and HTTP routes
- [ ] Verify Green
- [ ] Lint/Type check

### Step 9: E2E Tests

- [ ] Write E2E test: `src/cli/fulltext.e2e.test.ts` (add discover/fetch/convert test cases)
- [ ] Verify Green
- [ ] Lint/Type check

## Manual Verification

Non-TTY tests:
- [ ] `ref fulltext discover <id-with-doi>` shows OA sources
- [ ] `ref fulltext discover <id-without-doi>` shows appropriate error
- [ ] `ref fulltext fetch <id>` downloads and attaches fulltext
- [ ] `ref fulltext fetch <id> --force` overwrites existing
- [ ] `ref fulltext convert <id>` converts XML to Markdown

## Completion Checklist

- [ ] All tests pass (`npm run test`)
- [ ] Lint passes (`npm run lint`)
- [ ] Type check passes (`npm run typecheck`)
- [ ] Build succeeds (`npm run build`)
- [ ] CHANGELOG.md updated
- [ ] Move this file to `spec/tasks/completed/`
