# Task: arXiv ID Import Support

## Purpose

Add support for adding references by arXiv ID. Currently `ref add` supports PMID, DOI, and ISBN identifiers. This adds arXiv ID as a fourth identifier type, fetching metadata from the arXiv Atom API and storing the arXiv ID in `custom.arxiv_id`.

## Prerequisites

- Phase 41 (CslCustomSchema Type Refinement) must be completed first, as this task depends on `custom.arxiv_id` being a typed field.

## References

- Spec: `spec/features/add.md`
- Spec: `spec/features/metadata.md`
- Spec: `spec/features/fulltext-retrieval.md`
- Detector: `src/features/import/detector.ts`
- Normalizer: `src/features/import/normalizer.ts`
- Importer: `src/features/import/importer.ts`
- Fetcher: `src/features/import/fetcher.ts`
- Cache: `src/features/import/cache.ts`
- Rate limiter: `src/features/import/rate-limiter.ts`

## Design Decisions

### Identifier Detection (prefix-less)

arXiv IDs are detected without requiring a prefix. The pattern `\d{4}\.\d{4,5}(v\d+)?` does not conflict with:
- **PMID**: pure digits (no decimal point)
- **DOI**: starts with `10.`
- **ISBN**: requires `ISBN:` prefix

Accepted input formats:
| Input | Normalized |
|-------|-----------|
| `2301.13867` | `2301.13867` |
| `2301.13867v2` | `2301.13867v2` |
| `arXiv:2301.13867` | `2301.13867` |
| `arxiv:2301.13867v2` | `2301.13867v2` |
| `https://arxiv.org/abs/2301.13867` | `2301.13867` |
| `https://arxiv.org/pdf/2301.13867` | `2301.13867` |
| `https://arxiv.org/html/2301.13867v2` | `2301.13867v2` |

### Version handling

Version suffixes (e.g. `v2`) are preserved as-is in `custom.arxiv_id`.

### Metadata fetching

Uses arXiv Atom API: `http://export.arxiv.org/api/query?id_list=<arxiv_id>`

Response is Atom XML. Extract and map to CSL-JSON:
- `title` → `title`
- `author/name` → `author` array
- `summary` → `abstract`
- `published` → `issued`
- `arxiv:doi` (journal DOI, if present) → `DOI` (preferred)
- If no journal DOI: arXiv DOI `10.48550/arXiv.<id>` → `DOI`
- `link[@title="pdf"]/@href` → (not stored, available via fulltext fetch)
- `arxiv:primary_category/@term` → not stored (could go to tags in future)

### DOI priority (journal DOI preferred)

When arXiv API returns a journal DOI (`arxiv:doi` element):
- `DOI` field: journal DOI
- `custom.arxiv_id`: arXiv ID

When no journal DOI exists:
- `DOI` field: `10.48550/arXiv.<id>` (arXiv's own DOI)
- `custom.arxiv_id`: arXiv ID

### Storage

```json
{
  "id": "author2023title",
  "type": "article",
  "DOI": "10.1234/journal.2023.001",
  "URL": "https://arxiv.org/abs/2301.13867",
  "custom": {
    "uuid": "...",
    "arxiv_id": "2301.13867"
  }
}
```

### Fulltext integration

`buildDiscoveryArticle` in `src/features/operations/fulltext/fetch.ts` will be extended to pass `arxiv_id` from `custom.arxiv_id` when available, enabling direct arXiv fulltext discovery even when DOI points to the journal version.

## TDD Workflow

For each step, follow the Red-Green-Refactor cycle (see `spec/guidelines/testing.md`):

1. **Write test**: Create test file with comprehensive test cases
2. **Create stub**: Create implementation file with empty functions (`throw new Error("Not implemented")`)
3. **Verify Red**: Run tests, confirm they fail with "Not implemented"
4. **Implement**: Write actual logic until tests pass (Green)
5. **Refactor**: Clean up code while keeping tests green
6. **Quality checks**: Pass lint/typecheck

## Steps

### Step 1: arXiv ID detection and normalization

Add `isArxiv()` and `normalizeArxiv()` functions.

Detection order in `detectSingleIdentifier` (updated):
1. DOI (starts with `10.` or DOI URL) — checked first, no conflict
2. arXiv (matches `\d{4}\.\d{4,5}(v\d+)?` or `arXiv:` prefix or arXiv URL) — new
3. ISBN (requires `ISBN:` prefix)
4. PMID (numeric only) — last, as fallback

- [ ] Write test: `src/features/import/detector.test.ts` — add arXiv detection cases
- [ ] Write test: `src/features/import/normalizer.test.ts` — add arXiv normalization cases
- [ ] Implement: `isArxiv()` in `detector.ts`, `normalizeArxiv()` in `normalizer.ts`
- [ ] Update `detectSingleIdentifier` to include arXiv
- [ ] Verify Green: `npm run test:unit -- detector.test.ts normalizer.test.ts`
- [ ] Lint/Type check: `npm run lint && npm run typecheck`

### Step 2: arXiv metadata fetching

Add `fetchArxiv()` function that calls the arXiv Atom API and converts the response to CSL-JSON.

- [ ] Write test: `src/features/import/fetcher.test.ts` — add arXiv fetch cases (mock HTTP)
- [ ] Implement: `fetchArxiv()` in `fetcher.ts` (Atom XML parsing, CSL-JSON mapping, journal DOI priority)
- [ ] Verify Green: `npm run test:unit -- fetcher.test.ts`
- [ ] Lint/Type check: `npm run lint && npm run typecheck`

### Step 3: Rate limiter and cache

Add `"arxiv"` to rate limiter types and arXiv cache functions.

- [ ] Write test: `src/features/import/rate-limiter.test.ts` — add arXiv rate limiter case
- [ ] Write test: `src/features/import/cache.test.ts` — add arXiv cache cases
- [ ] Implement: Add `"arxiv"` type to rate limiter, add cache functions
- [ ] Verify Green: `npm run test:unit -- rate-limiter.test.ts cache.test.ts`
- [ ] Lint/Type check: `npm run lint && npm run typecheck`

### Step 4: Importer integration

Update `classifyIdentifiers` and add `fetchArxivWithCache`. Wire into `importIdentifiers`.

- [ ] Write test: `src/features/import/importer.test.ts` — add arXiv classification and import cases
- [ ] Implement: Update `classifyIdentifiers`, add `fetchArxivWithCache`, update `importIdentifiers`
- [ ] Verify Green: `npm run test:unit -- importer.test.ts`
- [ ] Lint/Type check: `npm run lint && npm run typecheck`

### Step 5: CLI integration

Update CLI to accept `arxiv` as `--input` format option.

- [ ] Write test: `src/cli/commands/add.test.ts` — add arXiv CLI cases
- [ ] Implement: Update `registerAddCommand` in `src/cli/index.ts`
- [ ] Verify Green: `npm run test:unit -- add.test.ts`
- [ ] Lint/Type check: `npm run lint && npm run typecheck`

### Step 6: Fulltext discovery enhancement

Extend `buildDiscoveryArticle` to include arXiv ID from `custom.arxiv_id`.

- [ ] Write test: `src/features/operations/fulltext/fetch.test.ts` — test discovery with arxiv_id
- [ ] Implement: Update `buildDiscoveryArticle` in `fetch.ts`
- [ ] Verify Green: `npm run test:unit -- fulltext/fetch.test.ts`
- [ ] Lint/Type check: `npm run lint && npm run typecheck`

### Step 7: Duplicate detection

Add arXiv ID to duplicate detection (match on `custom.arxiv_id`).

- [ ] Write test: add arXiv duplicate detection cases
- [ ] Implement: update duplicate detection logic
- [ ] Verify Green: `npm run test:unit -- duplicate`
- [ ] Lint/Type check: `npm run lint && npm run typecheck`

## Manual Verification

**Script**: `test-fixtures/test-arxiv-import.sh`

Non-TTY tests (automated):
- [ ] `ref add 2301.13867` — adds arXiv paper, shows title/author
- [ ] `ref add arXiv:2301.13867` — same result with prefix
- [ ] `ref add 2301.13867 -o json --full` — JSON output includes `custom.arxiv_id`
- [ ] `ref add https://arxiv.org/abs/2301.13867` — URL input works
- [ ] `ref add 2301.13867 && ref add 2301.13867` — second add detects duplicate
- [ ] `ref fulltext fetch <id>` — fulltext discovery uses arXiv ID

## Completion Checklist

- [ ] All tests pass (`npm run test`)
- [ ] Lint passes (`npm run lint`)
- [ ] Type check passes (`npm run typecheck`)
- [ ] Build succeeds (`npm run build`)
- [ ] Manual verification: `./test-fixtures/test-arxiv-import.sh` (if applicable)
- [ ] CHANGELOG.md updated
- [ ] Move this file to `spec/tasks/completed/`
