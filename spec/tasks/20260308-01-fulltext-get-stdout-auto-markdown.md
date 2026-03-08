# Task: fulltext get --stdout Auto-Select Markdown

## Purpose

When `--stdout` is used without `--pdf`/`--markdown`, automatically output markdown content if available. If only PDF exists, report on stderr with guidance. Fixes #77.

## References

- Issue: #77
- Spec: `spec/features/attachments.md` (fulltext get section)
- Related: `src/features/operations/fulltext/get.ts`
- Related: `src/cli/commands/fulltext.ts`
- Related: `src/features/operations/fulltext/get.test.ts`

## Design Decisions

### Behavior Matrix

| markdown | PDF | stdout | stderr | exit |
|----------|-----|--------|--------|------|
| exists | any | markdown content | (none) | 0 |
| none | exists | (none) | `No markdown fulltext attached to '<id>'. PDF is available; use --pdf flag to output.` | 1 |
| none | none | (none) | `No fulltext attached to '<id>'` | 1 |

### Rationale

- Markdown is text and natural for stdout; PDF is binary and should not be implicitly piped
- Explicit `--pdf` / `--markdown` + `--stdout` behavior remains unchanged
- Only the `stdout && !type` case is affected

### Architecture

- Change is in the operations layer (`fulltextGet` in `get.ts`): add a new branch for `stdout && !type`
- CLI layer (`fulltext.ts`): no structural change needed — existing `outputFulltextGetResult` already handles `result.content`
- Error message for "PDF only" case uses a new `error` string that includes actionable guidance

## TDD Workflow

For each step, follow the Red-Green-Refactor cycle (see `spec/guidelines/testing.md`):

1. **Write test**: Create test file with comprehensive test cases
2. **Create stub**: Create implementation file with empty functions (`throw new Error("Not implemented")`)
3. **Verify Red**: Run tests, confirm they fail with "Not implemented"
4. **Implement**: Write actual logic until tests pass (Green)
5. **Refactor**: Clean up code while keeping tests green
6. **Quality checks**: Pass lint/typecheck

## Steps

### Step 1: Unit tests and implementation for stdout auto-markdown

Add the `stdout && !type` branch in `fulltextGet()`.

- [x] Write test: `src/features/operations/fulltext/get.test.ts` — add tests for:
  - `stdout=true, type=undefined`, markdown exists → returns content (Buffer)
  - `stdout=true, type=undefined`, only PDF exists → returns error with guidance message
  - `stdout=true, type=undefined`, no attachments → returns error "No fulltext attached"
  - `stdout=true, type=undefined`, markdown + PDF exist → returns markdown content
- [x] Verify Red: `npm run test:unit -- get.test.ts` (tests fail)
- [x] Implement: Add branch in `fulltextGet()` after line 172
- [x] Verify Green: `npm run test:unit -- get.test.ts` (all tests pass)
- [x] Lint/Type check: `npm run lint && npm run typecheck`

### Step 2: E2E test

- [x] Write test: `src/cli/fulltext.e2e.test.ts` — add tests for:
  - `ref fulltext get <id> --stdout` with markdown attached → outputs markdown content
  - `ref fulltext get <id> --stdout` with only PDF → stderr guidance, exit 1
- [x] Verify Green: `npm run test:e2e -- fulltext.e2e.test.ts`
- [x] Lint/Type check: `npm run lint && npm run typecheck`

### Step 3: Documentation updates

- [ ] Update `spec/features/attachments.md` — document `--stdout` without type behavior
- [ ] Update CHANGELOG.md

## Completion Checklist

- [ ] All tests pass (`npm run test`)
- [ ] Lint passes (`npm run lint`)
- [ ] Type check passes (`npm run typecheck`)
- [ ] Build succeeds (`npm run build`)
- [ ] CHANGELOG.md updated
- [ ] Move this file to `spec/tasks/completed/`
