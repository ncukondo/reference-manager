# Task: fulltext get Multi-ID Support

## Purpose

Enable `fulltext get` to accept multiple identifiers, allowing users to check fulltext availability across multiple references in a single invocation. Also add `-o json` output format for machine-readable results.

## References

- Spec: `spec/features/attachments.md` (fulltext get section)
- Spec: `spec/features/json-output.md` (JSON output conventions)
- Related: `src/cli/commands/fulltext.ts`
- Related: `src/features/operations/fulltext/get.ts`

## Design Decisions

### CLI Syntax

```bash
ref fulltext get [identifiers...]     # Variadic argument (0 or more)
```

### Input Methods

| Method | Single ID | Multiple IDs |
|--------|-----------|--------------|
| Argument | `ref fulltext get smith2020` | `ref fulltext get smith2020 jones2021 doe2022` |
| stdin | First line | All lines (whitespace/newline separated) |
| Interactive (TTY) | Single select | Multi select |

- stdin: Switch from `readIdentifierFromStdin()` to `readIdentifiersFromStdin()` (already exists in helpers.ts)
- Interactive: Change `multiSelect: false` to `multiSelect: true`

### --stdout Restriction

`--stdout` is incompatible with multiple IDs. Error if `--stdout` is used with 2+ identifiers:

```
Error: --stdout cannot be used with multiple identifiers
```

### Text Output

**Single ID** (backward compatible):

```
pdf: /path/to/fulltext.pdf
markdown: /path/to/fulltext.md
```

**Multiple IDs** — success on stdout, errors on stderr:

stdout:
```
smith2020:
  pdf: /path/to/attachments/smith2020/fulltext.pdf
  markdown: /path/to/attachments/smith2020/fulltext.md
jones2021:
  pdf: /path/to/attachments/jones2021/fulltext.pdf
```

stderr:
```
Error: No fulltext attached to 'doe2022'
```

### JSON Output (`-o json`)

**Single ID** (object):

```json
{
  "id": "smith2020",
  "success": true,
  "paths": {
    "pdf": "/path/to/attachments/smith2020/fulltext.pdf",
    "markdown": "/path/to/attachments/smith2020/fulltext.md"
  }
}
```

**Multiple IDs** (array):

```json
[
  {
    "id": "smith2020",
    "success": true,
    "paths": {
      "pdf": "/path/to/attachments/smith2020/fulltext.pdf",
      "markdown": "/path/to/attachments/smith2020/fulltext.md"
    }
  },
  {
    "id": "jones2021",
    "success": true,
    "paths": {
      "pdf": "/path/to/attachments/jones2021/fulltext.pdf"
    }
  },
  {
    "id": "doe2022",
    "success": false,
    "error": "No fulltext attached to 'doe2022'"
  }
]
```

**Single ID failure** (object):

```json
{
  "id": "doe2022",
  "success": false,
  "error": "No fulltext attached to 'doe2022'"
}
```

### Exit Code

| Condition | Code |
|-----------|------|
| All success | 0 |
| Any failure (partial or total) | 1 |

### Architecture

- operations layer (`fulltextGet`): No change. Stays single-ID.
- CLI layer (`handleFulltextGetAction`): Loop over identifiers, collect results, format output.
- MCP tool (`fulltext_get`): Out of scope for this task.

## TDD Workflow

For each step, follow the Red-Green-Refactor cycle (see `spec/guidelines/testing.md`):

1. **Write test**: Create test file with comprehensive test cases
2. **Create stub**: Create implementation file with empty functions (`throw new Error("Not implemented")`)
3. **Verify Red**: Run tests, confirm they fail with "Not implemented"
4. **Implement**: Write actual logic until tests pass (Green)
5. **Refactor**: Clean up code while keeping tests green
6. **Quality checks**: Pass lint/typecheck

## Steps

### Step 1: Multi-ID text output formatting

Add formatting functions for multi-ID results.

- [x] Write test: `src/cli/commands/fulltext.test.ts` — add tests for `formatMultiFulltextGetOutput` (single ID backward compat, multiple IDs with success/failure mix)
- [x] Create stub: Add function signatures with `throw new Error("Not implemented")`
- [x] Verify Red: `npm run test:unit -- fulltext.test.ts` (tests fail with "Not implemented")
- [x] Implement: Write formatting logic
- [x] Verify Green: `npm run test:unit -- fulltext.test.ts` (all tests pass)
- [x] Lint/Type check: `npm run lint && npm run typecheck`

### Step 2: JSON output formatting

Add JSON output formatting for fulltext get results.

- [x] Write test: `src/cli/commands/fulltext.test.ts` — add tests for JSON output (single ID → object, multiple IDs → array, success/failure/mixed)
- [x] Create stub
- [x] Verify Red
- [x] Implement
- [x] Verify Green
- [x] Lint/Type check

### Step 3: handleFulltextGetAction multi-ID support

Update the action handler to accept multiple identifiers, loop and collect results.

- [x] Write test: `src/cli/commands/fulltext.test.ts` — test multi-ID execution flow, --stdout restriction, stdin multi-line input
- [x] Implement: Update `handleFulltextGetAction` signature (`identifiers: string[]`), add loop, collect results
- [x] Verify Green
- [x] Lint/Type check

### Step 4: Commander registration and interactive selection

Update Commander `.argument()` to variadic, add `-o` option, update interactive selection to multiSelect.

- [x] Update Commander registration in `src/cli/index.ts`: `.argument("[identifiers...]")`, `.option("-o, --output <format>", ...)`
- [x] Update interactive selection: `multiSelect: true`
- [x] Verify Green: all existing + new tests pass
- [x] Lint/Type check

### Step 5: E2E test

- [x] Update `src/cli/fulltext.e2e.test.ts` with multi-ID scenarios
- [x] Verify Green
- [x] Lint/Type check

## Manual Verification

**Script**: `test-fixtures/test-fulltext-get-multi-id.sh`

Non-TTY tests (automated):
- [ ] `ref fulltext get id1 id2` — shows paths for both, errors on stderr for missing
- [ ] `ref fulltext get id1 id2 -o json` — returns JSON array
- [ ] `ref fulltext get id1` — backward compatible single-ID output
- [ ] `ref fulltext get id1 -o json` — returns JSON object (not array)
- [ ] `ref fulltext get id1 id2 --stdout` — error message
- [ ] `echo -e "id1\nid2" | ref fulltext get` — multi-ID via stdin

TTY-required tests (run manually in a terminal):
- [ ] `ref fulltext get` — interactive multi-select, then multi-ID output

### Step 6: Documentation updates

- [x] Update README.md with multi-ID usage examples for `fulltext get`
- [x] Update CHANGELOG.md with feature entry

## Completion Checklist

- [x] All tests pass (`npm run test`)
- [x] Lint passes (`npm run lint`)
- [x] Type check passes (`npm run typecheck`)
- [x] Build succeeds (`npm run build`)
- [ ] Manual verification: `./test-fixtures/test-fulltext-get-multi-id.sh` (if applicable)
- [x] CHANGELOG.md updated
- [ ] Move this file to `spec/tasks/completed/`
