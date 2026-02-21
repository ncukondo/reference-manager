# Task: Fulltext Fetch Failure Diagnostics

## Purpose

When `fulltext fetch` fails, the current error messages provide no information about which OA sources were checked, which download attempts were made, or why each attempt failed. This makes it impossible for users to determine next steps (e.g., manual download, config fix, retry with different source).

This task adds structured diagnostic information to `FulltextFetchResult` so that failure messages clearly show:
- Which OA sources were checked (PMC, Unpaywall, arXiv, CORE)
- Discovery-level errors (API failures, missing config)
- Download attempts with per-attempt failure reasons (HTTP 403, 404, Content-Type mismatch, conversion failure)

## References

- Spec: `spec/features/fulltext-retrieval.md` (Error Handling section updated)
- Related: `src/features/operations/fulltext/fetch.ts` (core logic)
- Related: `src/cli/commands/fulltext.ts` (CLI formatting)
- Related: `src/mcp/tools/fulltext.ts` (MCP tool response)
- External: `@ncukondo/academic-fulltext` (already provides `DiscoveryResult.errors` and `DownloadResult.error`)

## Background

### Current Problem

1. **Discovery phase**: `discoverOA()` returns `errors: Array<{source, error}>` but `fulltextFetch` ignores them entirely. When locations are empty, only `"No OA sources found for <id>"` is returned.

2. **Download phase**: `tryDownloadPdf` discards `DownloadResult.error` (HTTP status, Content-Type). `tryDownloadPmcXmlAndConvert` and `tryArxivHtmlFromLocations` return plain booleans with no failure reason.

3. **Result type**: `FulltextFetchResult.error` is a single string — no room for structured per-source diagnostics.

### Design

Add optional diagnostic fields to `FulltextFetchResult`:

```typescript
interface FetchAttempt {
  source: string;           // "unpaywall", "pmc", "arxiv", "core"
  phase: "download" | "convert" | "attach";
  url?: string;
  fileType: "pdf" | "xml" | "html" | "markdown";
  error: string;            // "HTTP 403 Forbidden", "Unexpected Content-Type: text/html"
}

interface FulltextFetchResult {
  // ... existing fields ...
  discoveryErrors?: Array<{source: string; error: string}>;  // from discoverOA
  attempts?: FetchAttempt[];       // per-download-attempt details
  checkedSources?: string[];       // e.g., ["pmc", "unpaywall", "arxiv"]
  hint?: string;                   // e.g., "try 'ref url <id>' to open the publisher page"
}
```

When no OA sources are found and the reference has a DOI, the `hint` field suggests `ref url <id>` so users with subscriptions can manually download from the publisher page.

The `@ncukondo/academic-fulltext` library does NOT need changes — it already exposes the needed error details.

## TDD Workflow

For each step, follow the Red-Green-Refactor cycle (see `spec/guidelines/testing.md`):

1. **Write test**: Create test file with comprehensive test cases
2. **Create stub**: Create implementation file with empty functions (`throw new Error("Not implemented")`)
3. **Verify Red**: Run tests, confirm they fail with "Not implemented"
4. **Implement**: Write actual logic until tests pass (Green)
5. **Refactor**: Clean up code while keeping tests green
6. **Quality checks**: Pass lint/typecheck

## Steps

### Step 1: Add diagnostic fields to FulltextFetchResult

Extend the result type with `discoveryErrors`, `attempts`, and `checkedSources` fields.

- [ ] Update `FulltextFetchResult` interface in `src/features/operations/fulltext/fetch.ts`
- [ ] Add `FetchAttempt` interface
- [ ] Lint/Type check: `npm run lint && npm run typecheck`

### Step 2: Collect discovery diagnostics in fulltextFetch

Pass through `discovery.errors` and extract `checkedSources` from the discovery result.

- [ ] Write test: `src/features/operations/fulltext/fetch.test.ts` — assert `discoveryErrors` and `checkedSources` are populated on failure
- [ ] Implement: propagate `discovery.errors` and compute `checkedSources` from `discovery.locations` sources
- [ ] Verify Green: `npm run test:unit -- fetch.test.ts`
- [ ] Lint/Type check: `npm run lint && npm run typecheck`

### Step 3: Collect download attempt details

Modify `tryDownloadPdf`, `tryDownloadPmcXmlAndConvert`, `tryArxivHtmlFromLocations` to return failure reasons and accumulate `FetchAttempt[]`.

- [ ] Write test: `src/features/operations/fulltext/fetch.test.ts` — assert `attempts` array contains per-source error details (HTTP 403, conversion failure, etc.)
- [ ] Implement: thread `attempts` array through download helpers, capture `DownloadResult.error`
- [ ] Verify Green: `npm run test:unit -- fetch.test.ts`
- [ ] Lint/Type check: `npm run lint && npm run typecheck`

### Step 4: Update CLI output formatting

Update `formatFulltextFetchOutput` to display diagnostic details and hint on failure.

- [ ] Write test: `src/cli/commands/fulltext.test.ts` — assert formatted output includes checked sources, attempt details, and hint
- [ ] Implement: update `formatFulltextFetchOutput` in `src/cli/commands/fulltext.ts`
- [ ] Verify Green: `npm run test:unit -- fulltext.test.ts`
- [ ] Lint/Type check: `npm run lint && npm run typecheck`

Expected output format on failure (download failed):
```
Error: Failed to download fulltext for Smith-2024
  Checked: pmc, unpaywall, arxiv
  unpaywall: PDF https://example.com/paper.pdf → HTTP 403 Forbidden
  pmc: XML download failed → HTTP 404 Not Found
  arxiv: not available
```

Expected output format on failure (no OA sources):
```
Error: No OA sources found for Smith-2024
  Checked: pmc, unpaywall
  Hint: try 'ref url Smith-2024' to open the publisher page
```

The DOI URL (`https://doi.org/<DOI>`) is already available via `ref url` command — we show a hint directing users there rather than duplicating URL resolution logic.

### Step 5: Update MCP tool response

Update `registerFulltextFetchTool` to include diagnostics in error response.

- [ ] Write test: `src/mcp/tools/index.test.ts` — assert MCP error response includes diagnostic details
- [ ] Implement: update MCP handler in `src/mcp/tools/fulltext.ts`
- [ ] Verify Green: `npm run test:unit -- index.test.ts`
- [ ] Lint/Type check: `npm run lint && npm run typecheck`

## Manual Verification

**Script**: `test-fixtures/test-fulltext-fetch-diagnostics.sh`

Non-TTY tests (automated):
- [ ] `ref fulltext fetch <non-oa-ref>` shows checked sources and "No OA sources found"
- [ ] `ref fulltext fetch <ref-with-blocked-pdf>` shows download attempt with HTTP status
- [ ] `ref fulltext discover <ref>` still works unchanged

## Completion Checklist

- [ ] All tests pass (`npm run test`)
- [ ] Lint passes (`npm run lint`)
- [ ] Type check passes (`npm run typecheck`)
- [ ] Build succeeds (`npm run build`)
- [ ] Manual verification: `./test-fixtures/test-fulltext-fetch-diagnostics.sh` (if applicable)
- [ ] CHANGELOG.md updated
- [ ] Move this file to `spec/tasks/completed/`
