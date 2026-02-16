# Task: Check Command — Metadata Comparison

## Purpose

Extend `ref check` to compare local metadata against remote sources (Crossref, PubMed) and detect metadata drift. Distinguish between two cases:

- **`metadata_mismatch`**: Local data significantly differs from remote (likely wrong registration)
- **`metadata_outdated`**: Remote data has been updated since import (update recommended)

Default behavior: metadata comparison enabled. Use `--no-metadata` to skip.

## References

- Spec: `spec/features/check.md`
- Related: `src/features/check/` (existing check implementation)
- Related: `src/features/operations/change-details.ts` (`getChangedFields`, `formatChangeDetails`)
- Related: `src/features/search/normalizer.ts` (`normalize` function)
- Related: `src/features/duplicate/detector.ts` (author normalization patterns)

## TDD Workflow

For each step, follow the Red-Green-Refactor cycle (see `spec/guidelines/testing.md`):

1. **Write test**: Create test file with comprehensive test cases
2. **Create stub**: Create implementation file with empty functions (`throw new Error("Not implemented")`)
3. **Verify Red**: Run tests, confirm they fail with "Not implemented"
4. **Implement**: Write actual logic until tests pass (Green)
5. **Refactor**: Clean up code while keeping tests green
6. **Quality checks**: Pass lint/typecheck

## Steps

### Phase 1: Similarity Functions

#### Step 1: Title similarity

Implement word-level Jaccard similarity and Containment coefficient for title comparison.

- Normalize with existing `normalize()` from `src/features/search/normalizer.ts` (NFKC, lowercase, diacritics removal, punctuation removal)
- Split on whitespace to get word sets
- Jaccard = |A∩B| / |A∪B|
- Containment = |A∩B| / min(|A|, |B|)
- Title is "similar" if: Jaccard ≥ 0.5 OR Containment ≥ 0.8

Test cases:
- Identical titles → similar
- Subtitle added (e.g., "Effect of X" → "Effect of X: A Randomized Trial") → similar (Containment catches it)
- Title significantly extended → similar (Containment catches it)
- Completely different titles → mismatched
- Same-field different papers (e.g., "Deep Learning for Image Classification" vs "Reinforcement Learning for Image Segmentation") → mismatched
- Typo correction → similar (Jaccard catches it)
- Short title with coincidental overlap → mismatched (Containment < 0.8)
- Empty/missing titles → handle gracefully

- [ ] Write test: `src/features/check/metadata-similarity.test.ts`
- [ ] Create stub: `src/features/check/metadata-similarity.ts`
- [ ] Verify Red
- [ ] Implement
- [ ] Verify Green
- [ ] Lint/Type check

#### Step 2: Author similarity

Implement family name overlap ratio for author comparison.

- Extract family names, normalize with `normalize()` (handles diacritics: García → garcia)
- Overlap = |local_families ∩ remote_families| / |local_families|
- Asymmetric by design: measures how many local authors appear in remote
- Author is "similar" if: overlap ≥ 0.5
- If either side has no authors → skip author comparison (not enough data)

Test cases:
- Co-authors added → similar (local is subset of remote)
- Completely different authors → mismatched
- One author replaced out of three → similar (2/3 overlap)
- Single author match → similar
- Single author mismatch → mismatched
- Diacritics difference (García vs Garcia) → similar
- Empty author arrays → skip

- [ ] Write test: (in `src/features/check/metadata-similarity.test.ts`)
- [ ] Create stub: (in `src/features/check/metadata-similarity.ts`)
- [ ] Verify Red
- [ ] Implement
- [ ] Verify Green
- [ ] Lint/Type check

### Phase 2: Crossref Metadata Extraction

#### Step 3: Extend Crossref client to return metadata

Extend `queryCrossref` to extract comparable metadata fields from the existing Crossref response `message` object (no additional API call needed).

Add `CrossrefMetadata` to result:

```typescript
interface CrossrefMetadata {
  title?: string;
  author?: Array<{ family?: string; given?: string }>;
  containerTitle?: string;
  type?: string;
  page?: string;
  volume?: string;
  issue?: string;
  issued?: { "date-parts"?: number[][] };
}
```

Extend `CrossrefResult`:

```typescript
type CrossrefResult =
  | { success: true; updates: CrossrefUpdateInfo[]; metadata?: CrossrefMetadata }
  | { success: false; error: string };
```

- [ ] Write test: extend `src/features/check/crossref-client.test.ts`
- [ ] Implement: extract fields from `message` in `queryCrossref`
- [ ] Verify Green
- [ ] Lint/Type check

### Phase 3: Metadata Comparison & Classification

#### Step 4: Metadata comparator

Implement comparison logic that classifies differences as `metadata_mismatch` or `metadata_outdated`.

Comparison fields:

| Category | Fields | Role in classification |
|----------|--------|----------------------|
| Identity | `title`, `author`, `container-title`, `type` | Determines mismatch vs outdated |
| Publication | `page`, `volume`, `issue`, `issued` | Diff shown, always classified as outdated |
| Excluded | `custom`, `id`, `abstract`, `score` | Not compared |

Classification logic:

```
1. Compare title similarity (Step 1)
2. Compare author similarity (Step 2)
3. If title mismatched OR author mismatched → metadata_mismatch
4. If only publication fields differ or identity fields have minor changes → metadata_outdated
5. No differences → no finding
```

Output includes field-level diffs for display:

```typescript
interface MetadataComparisonResult {
  classification: "metadata_mismatch" | "metadata_outdated" | "no_change";
  changedFields: string[];
  fieldDiffs: Array<{
    field: string;
    local: string | null;
    remote: string | null;
  }>;
}
```

- [ ] Write test: `src/features/check/metadata-comparator.test.ts`
- [ ] Create stub: `src/features/check/metadata-comparator.ts`
- [ ] Verify Red
- [ ] Implement
- [ ] Verify Green
- [ ] Lint/Type check

#### Step 5: Integrate metadata comparison into checker

Extend `checkReference` to perform metadata comparison when metadata checking is enabled.

- Add `metadata` option to `CheckConfig` (default: `true`)
- When enabled, use Crossref metadata (or PubMed fetcher for PMID-only) to compare
- Produce `metadata_mismatch` or `metadata_outdated` finding alongside existing findings (retracted, concern, version_changed)
- For PubMed-only references: reuse existing `fetchPmids` from import fetcher to get CSL-JSON

- [ ] Write test: extend `src/features/check/checker.test.ts`
- [ ] Implement: metadata comparison path in `checkReference`
- [ ] Verify Green
- [ ] Lint/Type check

### Phase 4: Types, Output & CLI

#### Step 6: Extend types

Update `CheckStatus` and `CheckFinding`:

```typescript
// Replace metadata_changed with two specific types
type CheckStatus = "ok" | "retracted" | "concern" | "version_changed"
  | "metadata_mismatch" | "metadata_outdated";

interface CheckFinding {
  type: CheckStatus;
  message: string;
  details?: {
    retractionDoi?: string;
    retractionDate?: string;
    newDoi?: string;
    updatedFields?: string[];
    fieldDiffs?: Array<{
      field: string;
      local: string | null;
      remote: string | null;
    }>;
  };
}
```

Update `CheckOperationOptions`:

```typescript
interface CheckOperationOptions {
  // ... existing fields
  metadata?: boolean;  // default: true
}
```

- [ ] Update types: `src/features/check/types.ts`
- [ ] Update existing tests for type changes
- [ ] Verify Green
- [ ] Lint/Type check

#### Step 7: Extend output formatting

Text output:

```
[MISMATCH] smith-2024
  title: "Wrong Title" → "Correct Title"
  author: no overlap with remote authors
  ⚠ Local metadata significantly differs from the remote record.
  → Run: ref update smith-2024

[OUTDATED] jones-2023
  page: (none) → "123-145"
  volume: (none) → "42"
  ℹ Remote metadata has been updated since import.
  → Run: ref update jones-2023

Summary: 5 checked, 1 retracted, 1 mismatch, 1 outdated, 2 ok
```

JSON output: include `fieldDiffs` in finding details.

Summary: add `mismatch` and `outdated` counts.

- [ ] Write test: extend output formatting tests
- [ ] Implement: text and JSON formatters for metadata findings
- [ ] Verify Green
- [ ] Lint/Type check

#### Step 8: CLI `--metadata`/`--no-metadata` options

- `--metadata` is the default (no-op, for explicitness)
- `--no-metadata` disables metadata comparison
- Pass `metadata` option through to operation layer

- [ ] Update CLI command: `src/cli/commands/check.ts`
- [ ] Verify Green
- [ ] Lint/Type check

### Phase 5: Fix Actions for Metadata

#### Step 9: Fix actions for metadata findings

Add fix actions for `metadata_mismatch` and `metadata_outdated`:

```
[MISMATCH] smith-2024
  title: "Wrong Title" → "Correct Title"
  Actions:
  1) Update all changed fields from remote
  2) Skip

[OUTDATED] jones-2023
  page: (none) → "123-145"
  Actions:
  1) Update all changed fields from remote
  2) Skip
```

Internal API supports field selection:

```typescript
type FixActionType =
  | ... // existing
  | "update_all_fields"
  | "update_selected_fields";

interface MetadataFixOptions {
  fields?: string[];  // undefined = all changed fields
}
```

Default `--fix` behavior: update all fields at once. Individual field selection available via programmatic API (MCP/server).

- [ ] Write test: extend `src/features/check/fix-actions.test.ts`
- [ ] Implement: `update_all_fields` and `update_selected_fields` actions
- [ ] Update `src/features/check/fix-interaction.ts` for new finding types
- [ ] Verify Green
- [ ] Lint/Type check

### Phase 6: Server, MCP & Documentation

#### Step 10: Server & MCP integration

- Add `metadata` option to server check endpoint schema
- Add `metadata` option to MCP check tool
- Default: `true`

- [ ] Update: `src/server/routes/check.ts`
- [ ] Update: `src/mcp/tools/check.ts`
- [ ] Verify Green
- [ ] Lint/Type check

#### Step 11: README update

Update README to document:
- `--metadata` / `--no-metadata` options
- Metadata mismatch vs outdated detection
- Example output with metadata findings
- Update suggestion in check output

- [ ] Update: `README.md`

## Manual Verification

**Script**: `test-fixtures/test-check-metadata.sh`

Non-TTY tests (automated):
- [ ] `ref check <DOI-with-known-metadata>` detects metadata differences
- [ ] `ref check --no-metadata <DOI>` skips metadata comparison
- [ ] `ref check -o json <DOI>` includes fieldDiffs in JSON output

TTY-required tests (run manually in a terminal):
- [ ] `ref check --fix <DOI-with-drift>` shows update action and applies changes

## Completion Checklist

- [ ] All tests pass (`npm run test`)
- [ ] Lint passes (`npm run lint`)
- [ ] Type check passes (`npm run typecheck`)
- [ ] Build succeeds (`npm run build`)
- [ ] Manual verification: `./test-fixtures/test-check-metadata.sh` (if applicable)
- [ ] CHANGELOG.md updated
- [ ] Move this file to `spec/tasks/completed/`
