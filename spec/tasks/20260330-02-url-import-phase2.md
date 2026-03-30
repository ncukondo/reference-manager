# Task: URL Import — Phase 2 (Metadata Extraction)

## Purpose

Enhance URL import metadata extraction with full support for JSON-LD (Schema.org), citation_* meta tags, Dublin Core, and Open Graph. Automatically infer CSL type from JSON-LD `@type`. This makes imported references more accurate and complete, especially for government legislation, reports, and academic web content.

## References

- Spec: `spec/features/url-import.md` (Metadata Extraction section)
- Related: `src/features/import/url-metadata.ts` (Phase 1 basic extractor)

## TDD Workflow

For each step, follow the Red-Green-Refactor cycle (see `spec/guidelines/testing.md`).

## Steps

### Step 1: JSON-LD Metadata Extraction

Parse `<script type="application/ld+json">` blocks and extract structured metadata. Handle nested objects, arrays, `@graph` patterns.

- [x] Write test: `src/features/import/url-metadata.test.ts` (JSON-LD test cases)
- [x] Implement: JSON-LD parsing and CSL-JSON field mapping
- [x] Verify Green: `npm run test:unit -- url-metadata.test.ts`
- [x] Lint/Type check: `npm run lint && npm run typecheck`

### Step 2: JSON-LD @type → CSL type Mapping

Map Schema.org types (`Legislation`, `Report`, `Article`, etc.) to CSL types.

- [x] Write test: `src/features/import/url-metadata.test.ts` (type mapping cases)
- [x] Implement: Type mapping function with fallback to `"webpage"`
- [x] Verify Green: `npm run test:unit -- url-metadata.test.ts`
- [x] Lint/Type check: `npm run lint && npm run typecheck`

### Step 3: citation_* Meta Tag Extraction

Extract Highwire Press / Google Scholar meta tags: `citation_title`, `citation_author` (multiple), `citation_date`, `citation_publication_date`, `citation_doi`, `citation_journal_title`, `citation_pdf_url`.

- [x] Write test: `src/features/import/url-metadata.test.ts` (citation_* cases)
- [x] Implement: citation_* parsing with multi-value author support
- [x] Verify Green: `npm run test:unit -- url-metadata.test.ts`
- [x] Lint/Type check: `npm run lint && npm run typecheck`

### Step 4: Dublin Core Extraction

Extract `DC.title`, `DC.creator`, `DC.date`, `DC.publisher`, `DC.description`, `DC.identifier`.

- [x] Write test: `src/features/import/url-metadata.test.ts` (Dublin Core cases)
- [x] Implement: Dublin Core parsing and CSL-JSON mapping
- [x] Verify Green: `npm run test:unit -- url-metadata.test.ts`
- [x] Lint/Type check: `npm run lint && npm run typecheck`

### Step 5: Open Graph Extraction

Extract `og:title`, `og:description` as lower-priority fallbacks.

- [x] Write test: `src/features/import/url-metadata.test.ts` (OG cases)
- [x] Implement: Open Graph parsing
- [x] Verify Green: `npm run test:unit -- url-metadata.test.ts`
- [x] Lint/Type check: `npm run lint && npm run typecheck`

### Step 6: Metadata Merge with Fallback Priority

Combine all metadata sources with the specified priority: JSON-LD → citation_* → Dublin Core → Open Graph → HTML. Each field uses the highest-priority source that provides a non-empty value.

- [x] Write test: `src/features/import/url-metadata.test.ts` (merge/fallback cases)
- [x] Implement: Unified merge function
- [x] Verify Green: `npm run test:unit -- url-metadata.test.ts`
- [x] Lint/Type check: `npm run lint && npm run typecheck`

## Manual Verification

TTY-required tests (run manually in a terminal):
- [x] Import a government legislation page with JSON-LD → type is `legislation`
- [x] Import a page with citation_* tags → author and DOI are extracted
- [x] Import a page with Dublin Core only → title and date are extracted
- [x] Import a plain page with only `<title>` → falls back to webpage type

## Completion Checklist

- [x] All tests pass (`npm run test`)
- [x] Lint passes (`npm run lint`)
- [x] Type check passes (`npm run typecheck`)
- [x] Build succeeds (`npm run build`)
- [x] CHANGELOG.md updated
- [x] Close linked issue (include `Closes #XX` in PR description)
- [x] Move this file to `spec/tasks/completed/`
