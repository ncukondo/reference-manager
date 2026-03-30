# Task: URL Import — Phase 1 (Core Pipeline)

## Purpose

Enable `ref add <URL>` to import web pages as references. This phase implements the core pipeline: URL detection, PubMed URL detection, browser-based page fetching via Playwright, basic metadata extraction (title, URL, accessed date), Markdown fulltext generation (Readability + Turndown), MHTML/HTML archiving, the `archive` attachment role, configuration, and error handling.

## References

- Spec: `spec/features/url-import.md`
- Spec: `spec/features/add.md`
- Spec: `spec/features/attachments.md`
- Related: `src/features/import/detector.ts`
- Related: `src/features/import/fetcher.ts`
- Related: `src/features/attachments/types.ts`
- Related: `src/config/schema.ts`

## TDD Workflow

For each step, follow the Red-Green-Refactor cycle (see `spec/guidelines/testing.md`):

1. **Write test**: Create test file with comprehensive test cases
2. **Create stub**: Create implementation file with empty functions (`throw new Error("Not implemented")`)
3. **Verify Red**: Run tests, confirm they fail with "Not implemented"
4. **Implement**: Write actual logic until tests pass (Green)
5. **Refactor**: Clean up code while keeping tests green
6. **Quality checks**: Pass lint/typecheck

## Steps

### Step 1: URL Detection in detector.ts

Add `"url"` to `InputFormat` and detect `http://` / `https://` URLs that are not already matched as doi/arxiv/pmid identifiers.

- [ ] Write test: `src/features/import/detector.test.ts` (add URL detection cases)
- [ ] Implement: Update `InputFormat`, add URL detection in `detectIdentifier`
- [ ] Verify Green: `npm run test:unit -- detector.test.ts`
- [ ] Lint/Type check: `npm run lint && npm run typecheck`

### Step 2: PubMed URL Detection

Detect PubMed URLs (`pubmed.ncbi.nlm.nih.gov/{PMID}`, `ncbi.nlm.nih.gov/pubmed/{PMID}`) and extract PMID. Detect PMC URLs and extract PMCID.

- [ ] Write test: `src/features/import/detector.test.ts` (PubMed URL cases)
- [ ] Implement: Add PubMed/PMC URL patterns to `detectSingleIdentifier` and normalizer
- [ ] Verify Green: `npm run test:unit -- detector.test.ts`
- [ ] Lint/Type check: `npm run lint && npm run typecheck`

### Step 3: `archive` Role

Add `"archive"` to `RESERVED_ROLES` with constraint: max 1 file.

- [ ] Write test: `src/features/attachments/types.test.ts` (archive role validation)
- [ ] Implement: Update `RESERVED_ROLES`, add `isValidArchiveFiles` validation
- [ ] Verify Green: `npm run test:unit -- types.test.ts`
- [ ] Lint/Type check: `npm run lint && npm run typecheck`

### Step 4: URL Config Schema

Add `url` section to config schema: `archive_format`, `browser_path`, `timeout`.

- [ ] Write test: `src/config/schema.test.ts` (URL config validation)
- [ ] Implement: Add `urlConfigSchema` to `src/config/schema.ts`, integrate with config loading
- [ ] Verify Green: `npm run test:unit -- schema.test.ts`
- [ ] Lint/Type check: `npm run lint && npm run typecheck`

### Step 5: Browser Launcher

Create browser launch utility using `playwright-core` with system Chrome detection and user-friendly error messages.

- [ ] Write test: `src/features/import/browser.test.ts`
- [ ] Create stub: `src/features/import/browser.ts`
- [ ] Verify Red
- [ ] Implement: `launchBrowser()` with `channel: "chrome"`, `browser_path` config support, error handling
- [ ] Verify Green: `npm run test:unit -- browser.test.ts`
- [ ] Lint/Type check: `npm run lint && npm run typecheck`

### Step 6: Metadata Extractor

Extract basic metadata from page: title (from `<title>`), URL, accessed date. Returns partial CslItem.

- [ ] Write test: `src/features/import/url-metadata.test.ts`
- [ ] Create stub: `src/features/import/url-metadata.ts`
- [ ] Verify Red
- [ ] Implement: `extractMetadata(page)` → `{ title, URL, accessed, type: "webpage" }`
- [ ] Verify Green: `npm run test:unit -- url-metadata.test.ts`
- [ ] Lint/Type check: `npm run lint && npm run typecheck`

### Step 7: Fulltext Generator (Readability + Turndown)

Generate Markdown from page content using Readability (in-browser) + Turndown (Node.js). Fall back to full HTML on Readability failure.

- [ ] Write test: `src/features/import/url-fulltext.test.ts`
- [ ] Create stub: `src/features/import/url-fulltext.ts`
- [ ] Verify Red
- [ ] Implement: `generateFulltext(page)` → Markdown string
- [ ] Verify Green: `npm run test:unit -- url-fulltext.test.ts`
- [ ] Lint/Type check: `npm run lint && npm run typecheck`

### Step 8: Archive Creator

Create MHTML or single HTML archive from page via CDP.

- [ ] Write test: `src/features/import/url-archive.test.ts`
- [ ] Create stub: `src/features/import/url-archive.ts`
- [ ] Verify Red
- [ ] Implement: `createArchive(page, format)` → `{ data: string, extension: string }`
- [ ] Verify Green: `npm run test:unit -- url-archive.test.ts`
- [ ] Lint/Type check: `npm run lint && npm run typecheck`

### Step 9: URL Fetcher (Orchestrator)

Orchestrate the full pipeline: launch browser → navigate → extract metadata → generate fulltext → create archive → return results.

- [ ] Write test: `src/features/import/url-fetcher.test.ts`
- [ ] Create stub: `src/features/import/url-fetcher.ts`
- [ ] Verify Red
- [ ] Implement: `fetchUrl(url, options)` → `{ item: CslItem, fulltext: string, archive?: { data, ext } }`
- [ ] Verify Green: `npm run test:unit -- url-fetcher.test.ts`
- [ ] Lint/Type check: `npm run lint && npm run typecheck`

### Step 10: Importer Integration

Integrate URL fetcher into the add command's import pipeline. Handle `--archive-format` and `--no-archive` options.

- [ ] Write test: `src/features/import/importer.test.ts` (add URL import cases)
- [ ] Implement: Add URL handling to importer, wire up archive attachment
- [ ] Verify Green: `npm run test:unit -- importer.test.ts`
- [ ] Lint/Type check: `npm run lint && npm run typecheck`

### Step 11: CLI Options

Add `--archive-format` and `--no-archive` options to the `add` command.

- [ ] Implement: Update `src/cli/commands/add.ts` with new options
- [ ] Lint/Type check: `npm run lint && npm run typecheck`

## Manual Verification

**Script**: `test-fixtures/test-url-import.sh`

Non-TTY tests (automated):
- [ ] `ref add https://example.com` → adds reference with title, URL, accessed date
- [ ] `ref add https://pubmed.ncbi.nlm.nih.gov/12345678/` → detected as PMID, fetched via PMC API
- [ ] `ref add https://example.com --no-archive` → no archive file created
- [ ] `ref add https://example.com --archive-format html` → archive.html created
- [ ] `ref add https://example.com -o json` → JSON output with URL metadata

TTY-required tests (run manually in a terminal):
- [ ] `ref add https://elaws.e-gov.go.jp/document?lawid=415AC0000000057` → imports law with fulltext.md + archive.mhtml

## Completion Checklist

- [ ] All tests pass (`npm run test`)
- [ ] Lint passes (`npm run lint`)
- [ ] Type check passes (`npm run typecheck`)
- [ ] Build succeeds (`npm run build`)
- [ ] Manual verification: `./test-fixtures/test-url-import.sh` (if applicable)
- [ ] CHANGELOG.md updated
- [ ] Close linked issue (include `Closes #XX` in PR description)
- [ ] Move this file to `spec/tasks/completed/`
