# Task: Show Command

## Purpose

Add a `show` command to display a single reference by citation key or UUID with multiple output format options (CSL-JSON, YAML, BibTeX, text). This provides a direct way to view reference details without using search.

## References

- Spec: `spec/architecture/cli.md` (to be updated)
- Related: `src/cli/commands/`, `src/core/operations.ts`

## Command Specification

```
ref show <identifier> [options]

Arguments:
  identifier    Citation key or UUID

Options:
  --uuid        Interpret identifier as UUID
  --json        Output raw CSL-JSON (default)
  --yaml        Output YAML format
  --bibtex      Output BibTeX format
  --text        Output pretty-printed text
```

### Output Formats

| Option | Description |
|--------|-------------|
| `--json` | Raw CSL-JSON (default) |
| `--yaml` | YAML format (human-readable) |
| `--bibtex` | BibTeX format |
| `--text` | Pretty-printed text format |

### Exit Codes

| Code | Condition |
|------|-----------|
| 0 | Success |
| 1 | Reference not found |

## TDD Workflow

For each step:
1. Write failing test
2. Write minimal implementation to pass
3. Clean up, pass lint/typecheck, verify tests still pass

## Steps

### Step 1: Add `get` method to ILibraryOperations (if not exists)

- [ ] Check if `get(id)` or `getById(id)` exists in operations
- [ ] If not, add to interface and implementations
- [ ] Write test for the operation
- [ ] Verify: `npm run test:unit`

### Step 2: Create show command with JSON output

- [ ] Write test: `src/cli/commands/show.test.ts`
  - Test show by citation key
  - Test show by UUID with `--uuid` flag
  - Test not found error
- [ ] Implement: `src/cli/commands/show.ts`
  - Basic implementation with `--json` output
- [ ] Register in `src/cli/commands/index.ts`
- [ ] Verify: `npm run test:unit -- show`
- [ ] Lint/Type check: `npm run lint && npm run typecheck`

### Step 3: Add YAML output format

- [ ] Write test for `--yaml` output
- [ ] Implement YAML serialization (using `yaml` package or similar)
- [ ] Verify: `npm run test:unit -- show`

### Step 4: Add BibTeX output format

- [ ] Write test for `--bibtex` output
- [ ] Implement using existing BibTeX conversion
- [ ] Verify: `npm run test:unit -- show`

### Step 5: Add text output format

- [ ] Write test for `--text` output
- [ ] Implement pretty-print text format
- [ ] Verify: `npm run test:unit -- show`

### Step 6: E2E tests

- [ ] Write E2E tests: `src/cli/show.e2e.test.ts`
  - Test all output formats
  - Test error cases
- [ ] Verify: `npm run test:e2e`

### Step 7: Update documentation

- [ ] Update `spec/architecture/cli.md` with show command
- [ ] Create `spec/features/show.md` if needed

## Completion Checklist

- [ ] All tests pass (`npm run test`)
- [ ] Lint passes (`npm run lint`)
- [ ] Type check passes (`npm run typecheck`)
- [ ] Build succeeds (`npm run build`)
- [ ] Manual verification:
  - [ ] `ref show <id>`
  - [ ] `ref show <id> --yaml`
  - [ ] `ref show <id> --bibtex`
  - [ ] `ref show --uuid <uuid>`
- [ ] CHANGELOG.md updated
- [ ] Move this file to `spec/tasks/completed/`

## Dependencies

This task should be implemented after `20260108-01-search-id-field.md` as it may reuse similar lookup logic.
