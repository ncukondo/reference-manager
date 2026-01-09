# Task: Export Command

## Purpose

Add an `export` command to output raw CSL-JSON for external tool integration (pandoc, jq, etc.). Supports multiple IDs, search queries, and multiple output formats.

## References

- Spec: `spec/architecture/cli.md` (to be updated)
- Related: `src/cli/commands/`, `src/core/operations.ts`

## Command Specification

```
ref export [ids...] [options]

Arguments:
  ids...            Citation keys or UUIDs (optional if --all or --search used)

Options:
  --uuid            Interpret identifiers as UUIDs
  --all             Export all references
  --search <query>  Export references matching search query
  --format <fmt>    Output format: json (default), yaml, bibtex
  -f <fmt>          Short for --format
```

### Selection Modes (mutually exclusive)

| Mode | Description |
|------|-------------|
| `[ids...]` | Export specific references by ID |
| `--all` | Export all references |
| `--search <query>` | Export references matching query |

### Output Formats

| Format | Description |
|--------|-------------|
| `json` | Raw CSL-JSON array (default) |
| `yaml` | CSL-JSON in YAML format |
| `bibtex` | BibTeX format |

### Output Behavior

- **Single item**: Output as single object (not array)
- **Multiple items**: Output as array
- **No matches**: Empty array `[]` with exit code 0
- **Not found (by ID)**: Error with exit code 1

### Exit Codes

| Code | Condition |
|------|-----------|
| 0 | Success (including empty results for --all/--search) |
| 1 | Reference not found (when specific IDs requested) |

## Usage Examples

```bash
# Export single reference
ref export smith-2024

# Export multiple references
ref export smith-2024 jones-2023 doe-2022

# Export all references
ref export --all

# Export search results
ref export --search "author:smith year:2024"

# Output as YAML
ref export smith-2024 --format yaml

# Output as BibTeX
ref export --all --format bibtex

# Pipe to pandoc
ref export id1 id2 > refs.json
pandoc --bibliography refs.json paper.md -o paper.pdf

# Pipe to jq
ref export --all | jq '.[] | select(.type == "article-journal")'
```

## TDD Workflow

For each step:
1. Write failing test
2. Write minimal implementation to pass
3. Clean up, pass lint/typecheck, verify tests still pass

## Steps

### Step 1: Create export command with single ID support

- [ ] Write test: `src/cli/commands/export.test.ts`
  - Test export by citation key (single ID)
  - Test export by UUID with `--uuid` flag
  - Test not found error
- [ ] Implement: `src/cli/commands/export.ts`
  - Basic implementation with JSON output
- [ ] Register in `src/cli/commands/index.ts`
- [ ] Verify: `npm run test:unit -- export`
- [ ] Lint/Type check: `npm run lint && npm run typecheck`

### Step 2: Add multiple ID support

- [ ] Write test for multiple IDs
  - `ref export id1 id2 id3` returns array
  - Partial failures (some IDs not found)
- [ ] Implement multiple ID handling
- [ ] Verify: `npm run test:unit -- export`

### Step 3: Add --all option

- [ ] Write test for `--all` option
  - Returns all references as array
  - Empty library returns `[]`
- [ ] Implement `--all` option
- [ ] Verify: `npm run test:unit -- export`

### Step 4: Add --search option

- [ ] Write test for `--search` option
  - Returns matching references
  - No matches returns `[]`
- [ ] Implement `--search` option
- [ ] Verify: `npm run test:unit -- export`

### Step 5: Add YAML output format

- [ ] Write test for `--format yaml`
- [ ] Implement YAML serialization
- [ ] Verify: `npm run test:unit -- export`

### Step 6: Add BibTeX output format

- [ ] Write test for `--format bibtex`
- [ ] Implement using existing BibTeX conversion
- [ ] Verify: `npm run test:unit -- export`

### Step 7: E2E tests

- [ ] Write E2E tests: `src/cli/export.e2e.test.ts`
  - Test all selection modes
  - Test all output formats
  - Test error cases
- [ ] Verify: `npm run test:e2e`

### Step 8: Update documentation

- [ ] Update `spec/architecture/cli.md` with export command
- [ ] Update `spec/features/json-output.md` if needed

## Completion Checklist

- [ ] All tests pass (`npm run test`)
- [ ] Lint passes (`npm run lint`)
- [ ] Type check passes (`npm run typecheck`)
- [ ] Build succeeds (`npm run build`)
- [ ] Manual verification:
  - [ ] `ref export <id>`
  - [ ] `ref export <id1> <id2>`
  - [ ] `ref export --all`
  - [ ] `ref export --search "query"`
  - [ ] `ref export --format yaml <id>`
  - [ ] `ref export --format bibtex <id>`
  - [ ] `ref export --uuid <uuid>`
- [ ] CHANGELOG.md updated
- [ ] Move this file to `spec/tasks/completed/`

## Design Notes

### Why not extend `list`/`search` with `--raw`?

- `list`/`search` are designed for human-readable output with pagination
- `export` has clear intent: raw data for external tools
- Separation of concerns: display vs data export

### Single vs Array output

When a single ID is requested, output a single object (not wrapped in array) for convenience:
```bash
ref export smith-2024 | jq '.title'  # Works directly
```

For multiple items or --all/--search, always output array:
```bash
ref export --all | jq '.[0].title'   # Array access needed
```
