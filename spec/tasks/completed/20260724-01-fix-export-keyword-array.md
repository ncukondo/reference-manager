# Task: Fix `ref export` json/yaml emits `keyword` as array (invalid CSL-JSON)

## Purpose

`ref export -o json` can emit `keyword` as a JSON **array**, which is invalid
CSL-JSON (the spec expects a `"; "`-separated string). Passing such an export to
pandoc/citeproc fails the whole file. Apply the same keyword normalization used
by the storage serializer to the export json/yaml output so `ref export` always
produces spec-compliant CSL-JSON.

Fixes #106.

## Root Cause

- In-memory `keyword` is typed as `z.array(z.string())` (`src/core/csl-json/types.ts:91`).
- Storage write path normalizes array → `"; "` string via
  `serializeCslJson` (`src/core/csl-json/serializer.ts`).
- Read path reverses string → array via `parseKeyword` (`src/core/csl-json/parser.ts`).
- `formatExportOutput` calls `JSON.stringify` directly on raw in-memory items
  (`src/cli/commands/export.ts:102`), bypassing normalization → array leaks out.
- The normalization logic (`serializeKeyword` + item mapping) is currently
  private inside `serializer.ts`, so export cannot reuse it.

## References

- Spec: `spec/guidelines/pandoc.md`, `spec/core/data-model.md`
- Related: `src/core/csl-json/serializer.ts`, `src/cli/commands/export.ts`
- Issue: #106

## TDD Workflow

For each step, follow the Red-Green-Refactor cycle (see `spec/guidelines/testing.md`).

## Steps

### Step 1: Extract reusable keyword normalization in serializer

- [ ] Write test: `src/core/csl-json/serializer.test.ts` (add cases for the new
      `toSerializableCslItem` / `toSerializableCslLibrary` helpers: keyword array
      → `"; "` string; empty/undefined keyword → field omitted; other fields
      preserved)
- [ ] Implement: export `toSerializableCslItem(item)` and
      `toSerializableCslLibrary(library)` from `serializer.ts`; refactor
      `serializeCslJson` to use them (behavior unchanged)
- [ ] Verify Green: `npm run test:unit -- serializer.test.ts`
- [ ] Lint/Type check: `npm run lint && npm run typecheck`

### Step 2: Apply normalization in export json/yaml output

- [ ] Write test: `src/cli/commands/export.test.ts` (keyword array →
      `-o json` emits `"; "` string, not array; `-o yaml` same; single-ID
      object output normalized; keyword-less item omits field)
- [ ] Implement: in `formatExportOutput`, normalize items via the serializer
      helpers before `JSON.stringify` (json) and `yamlStringify` (yaml);
      handle both single-object and array output shapes; bibtex path unchanged
- [ ] Verify Green: `npm run test:unit -- export.test.ts`
- [ ] Lint/Type check: `npm run lint && npm run typecheck`

## Out of Scope

- BibTeX export (`bibtex.ts` does not emit `keyword`)
- Changing the in-memory `keyword` type (arrays remain in memory; normalization
  happens only at output boundaries, consistent with existing design)

## Manual Verification

Non-TTY tests (automated):
- [ ] Add an item with multiple tags, `ref export <id> -o json` → `keyword` is a
      `"; "`-separated string
- [ ] `ref export --all -o json` piped to `jq` — no `keyword` arrays present

## Completion Checklist

- [ ] All tests pass (`npm run test`)
- [ ] Lint passes (`npm run lint`)
- [ ] Type check passes (`npm run typecheck`)
- [ ] Build succeeds (`npm run build`)
- [ ] CHANGELOG.md updated
- [ ] Close linked issue (include `Closes #106` in PR description)
- [ ] Move this file to `spec/tasks/completed/`
