# Task: Show Command for Single-Reference Detail View

## Purpose

Add `ref show <id>` command for comprehensive single-reference inspection. AI agents naturally expect this command (analogous to `git show`), and it consolidates information from multiple commands (`export`, `fulltext get`, `url`) into one output.

GitHub Issue: #84

## References

- Spec: `spec/features/show.md`
- Related: `src/cli/commands/export.ts` (similar single-ID lookup pattern)
- Related: `src/features/format/pretty.ts` (existing pretty formatter)
- Related: `src/features/operations/attachments/get.ts` (fulltext path resolution)
- Related: `src/cli/index.ts` (command registration)
- Related: `src/mcp/tools/` (MCP tool registration)

## TDD Workflow

For each step, follow the Red-Green-Refactor cycle (see `spec/guidelines/testing.md`):

1. **Write test**: Create test file with comprehensive test cases
2. **Create stub**: Create implementation file with empty functions (`throw new Error("Not implemented")`)
3. **Verify Red**: Run tests, confirm they fail with "Not implemented"
4. **Implement**: Write actual logic until tests pass (Green)
5. **Refactor**: Clean up code while keeping tests green
6. **Quality checks**: Pass lint/typecheck

## Steps

### Step 1: Normalizer — CSL-JSON to Normalized Detail Object

Transform a CslItem into the flat, agent-friendly normalized structure used for JSON output and as the data source for pretty formatting.

- [ ] Write test: `src/features/format/show-normalizer.test.ts`
  - Normalize basic fields (id, uuid, type, title)
  - Normalize authors from CslItem `author` array to `"Family, Given"` strings
  - Extract year from `issued.date-parts`
  - Consolidate journal info (container-title, volume, issue, page)
  - Extract DOI, PMID, PMCID, URL
  - Extract tags from `custom.tags`
  - Extract created/modified timestamps from `custom.created_at`/`custom.timestamp`
  - Null for absent optional fields (no `(none)` strings)
  - Include `raw` as the original CslItem
- [ ] Create stub: `src/features/format/show-normalizer.ts`
  - Export `NormalizedReference` interface
  - Export `normalizeReference(item: CslItem, options?)` function
- [ ] Verify Red
- [ ] Implement
- [ ] Verify Green
- [ ] Lint/Type check

### Step 2: Fulltext and Attachment Resolution

Resolve fulltext paths (pdf/markdown) and non-fulltext attachment list for a reference.

- [ ] Write test: `src/features/format/show-normalizer.test.ts` (extend)
  - Fulltext paths resolved when attachmentsDirectory provided
  - Fulltext `null` when no fulltext attached
  - Non-fulltext attachments listed with filename and role
  - No attachmentsDirectory → fulltext and attachments are null
- [ ] Implement: extend `normalizeReference()` with `attachmentsDirectory` option
- [ ] Verify Green
- [ ] Lint/Type check

### Step 3: Pretty Formatter for Show

Rich pretty output for single-reference detail view.

- [ ] Write test: `src/features/format/show-pretty.test.ts`
  - Header line: `[id] title`
  - Type, Authors, Year, Journal consolidated line
  - DOI, PMID, PMCID, URL (only when present)
  - UUID always shown
  - Tags (only when present)
  - Added/Modified dates
  - Fulltext section with pdf/markdown paths
  - Fulltext `-` when no fulltext
  - Fulltext partial (pdf only, markdown `-`)
  - Files line for non-fulltext attachments
  - Abstract shown at end (only when present)
  - Absent optional fields are omitted (no noise)
- [ ] Create stub: `src/features/format/show-pretty.ts`
  - Export `formatShowPretty(ref: NormalizedReference)` function
- [ ] Verify Red
- [ ] Implement
- [ ] Verify Green
- [ ] Lint/Type check

### Step 4: Show CLI Command

Register `ref show` command with options and action handler.

- [ ] Write test: `src/cli/commands/show.test.ts`
  - Single ID lookup (pretty output)
  - `--uuid` flag
  - `--output json` / `--json` flag
  - `--output yaml` flag
  - `--output bibtex` flag
  - Reference not found → exit code 1, stderr error
  - No identifier, non-TTY → exit code 1, stderr error
  - Interactive selection when no ID and TTY
- [ ] Create stub: `src/cli/commands/show.ts`
  - Export `executeShow()` function
  - Export `formatShowOutput()` function
- [ ] Implement
- [ ] Register in `src/cli/index.ts` (between `list` and `search`)
- [ ] Verify Green
- [ ] Lint/Type check

### Step 5: MCP Tool

Add `show` tool to MCP server.

- [ ] Write test: `src/mcp/tools/show.test.ts`
  - `show` tool with identifier parameter
  - `show` tool with uuid parameter
  - `show` tool JSON output (normalized format)
  - Reference not found error
- [ ] Create stub: `src/mcp/tools/show.ts`
- [ ] Implement
- [ ] Register in `src/mcp/tools/index.ts`
- [ ] Verify Green
- [ ] Lint/Type check

### Step 6: HTTP Server Route (if applicable)

Add show endpoint to HTTP server if export route exists.

- [ ] Check if HTTP server has export route
- [ ] If yes, add `show` route following same pattern
- [ ] If no, skip this step
- [ ] Verify Green
- [ ] Lint/Type check

## Manual Verification

**Script**: `test-fixtures/test-show.sh`

Non-TTY tests (automated):
- [ ] `ref show <existing-id>` — pretty output with all sections
- [ ] `ref show <existing-id> --json` — normalized JSON output
- [ ] `ref show <existing-id> --output yaml` — YAML output
- [ ] `ref show <existing-id> --output bibtex` — BibTeX output
- [ ] `ref show <non-existent>` — error on stderr, exit code 1
- [ ] `echo "" | ref show` — error about identifier required

TTY-required tests (run manually in a terminal):
- [ ] `ref show` — interactive selection prompt

## Completion Checklist

- [ ] All tests pass (`npm run test`)
- [ ] Lint passes (`npm run lint`)
- [ ] Type check passes (`npm run typecheck`)
- [ ] Build succeeds (`npm run build`)
- [ ] Manual verification: `./test-fixtures/test-show.sh` (if applicable)
- [ ] CHANGELOG.md updated
- [ ] Close linked issue (include `Closes #84` in PR description)
- [ ] Move this file to `spec/tasks/completed/`
