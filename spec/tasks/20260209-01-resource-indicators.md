# Task: Resource Indicators

## Purpose

Add emoji indicators to reference list displays (pretty format and TUI interactive mode) showing the presence of fulltext files, attachments, URLs, and tags. This gives users at-a-glance visibility of available resources per reference.

## References

- Spec: `spec/features/resource-indicators.md`
- Related: `src/features/format/pretty.ts`, `src/features/interactive/apps/runSearchFlow.ts`
- Related: `src/features/operations/fulltext-adapter/fulltext-adapter.ts`

## TDD Workflow

For each step, follow the Red-Green-Refactor cycle (see `spec/guidelines/testing.md`):

1. **Write test**: Create test file with comprehensive test cases
2. **Create stub**: Create implementation file with empty functions (`throw new Error("Not implemented")`)
3. **Verify Red**: Run tests, confirm they fail with "Not implemented"
4. **Implement**: Write actual logic until tests pass (Green)
5. **Refactor**: Clean up code while keeping tests green
6. **Quality checks**: Pass lint/typecheck

## Steps

### Step 1: Build resource indicators function

Create `buildResourceIndicators(item: CslItem): string` that returns the concatenated emoji string based on item data.

- [x] Write test: `src/features/format/resource-indicators.test.ts`
  - Item with fulltext PDF → `"📄"`
  - Item with fulltext Markdown → `"📝"`
  - Item with both fulltext formats → `"📄📝"`
  - Item with non-fulltext attachments → `"📎"`
  - Item with fulltext + other attachments → `"📄📎"`
  - Item with URL → `"🔗"`
  - Item with tags → `"🏷"`
  - Item with all resources → `"📄📝📎🔗🏷"`
  - Item with no resources → `""`
  - Icon order is always fixed regardless of data order
- [x] Create stub: `src/features/format/resource-indicators.ts` (export function with `throw new Error("Not implemented")`)
- [x] Verify Red: `npm run test:unit -- resource-indicators.test.ts` (tests fail with "Not implemented")
- [x] Implement: Write actual logic using `findFulltextFiles()` and direct field checks
- [x] Verify Green: `npm run test:unit -- resource-indicators.test.ts` (all tests pass)
- [x] Lint/Type check: `npm run lint && npm run typecheck`

### Step 2: Integrate into pretty formatter

Add indicator line as the last line of `formatSingleReference()` in `pretty.ts`.

- [x] Write test: `src/features/format/pretty.test.ts` (add cases for indicator line)
  - Reference with indicators → last line contains emoji
  - Reference without indicators → no extra line added
  - Indicator line is indented with 2 spaces like other fields
- [x] Implement: Call `buildResourceIndicators()` in `formatSingleReference()`, append line if non-empty
- [x] Verify Green: `npm run test:unit -- pretty.test.ts` (all tests pass)
- [x] Lint/Type check: `npm run lint && npm run typecheck`

### Step 3: Integrate into TUI interactive mode

Prepend indicator string to the meta line in `toChoice()` in `runSearchFlow.ts`.

- [ ] Write test: `src/features/interactive/apps/runSearchFlow.test.ts` (add cases for indicator prefix)
  - Choice with indicators → meta starts with emoji string followed by space
  - Choice without indicators → meta unchanged
- [ ] Implement: Call `buildResourceIndicators()` in `toChoice()`, prepend to `meta` if non-empty
- [ ] Verify Green: `npm run test:unit -- runSearchFlow.test.ts` (all tests pass)
- [ ] Lint/Type check: `npm run lint && npm run typecheck`

## Manual Verification

**Script**: `test-fixtures/test-resource-indicators.sh`

Non-TTY tests (automated):
- [ ] `ref search -f pretty "some query"` shows indicator line for references with fulltext/attachments
- [ ] `ref list -f pretty` shows indicator line for references with URL/tags
- [ ] References with no resources show no extra line

TTY-required tests (run manually in a terminal):
- [ ] `ref search -t` shows emoji prefix on meta line in TUI
- [ ] References with no resources show no prefix in TUI

## Completion Checklist

- [ ] All tests pass (`npm run test`)
- [ ] Lint passes (`npm run lint`)
- [ ] Type check passes (`npm run typecheck`)
- [ ] Build succeeds (`npm run build`)
- [ ] Manual verification: `./test-fixtures/test-resource-indicators.sh` (if applicable)
- [ ] CHANGELOG.md updated
- [ ] Move this file to `spec/tasks/completed/`
