# Task: Search Command Help Enhancement

## Purpose

Enhance the `ref search --help` output to include query syntax documentation, field list, case sensitivity rules, and usage examples. This enables users and AI agents to understand search capabilities directly from CLI help without consulting external documentation.

Currently, `ref search --help` shows only basic option descriptions but lacks:
- Query syntax explanation (free text, phrase, field:value)
- Available field list (author, title, year, doi, etc.)
- Case sensitivity rules (consecutive uppercase)
- Usage examples

## References

- Spec: `spec/features/search.md`
- Related: `src/cli/index.ts` (command registration)
- Pattern: `gh search repos --help` (GitHub CLI)

## Design

Target output for `ref search --help`:

```
Search references in the library.

Supports field-specific search with field:value syntax and phrase search
with quoted strings. Consecutive uppercase letters (AI, RNA) are matched
case-sensitively; other text is matched case-insensitively.

USAGE
  ref search [options] [query]

ARGUMENTS
  query    Search query (required unless using --tui)

QUERY SYNTAX
  Free text      machine learning       Search all fields (AND logic)
  Phrase         "machine learning"     Exact phrase match
  Field          author:Smith           Search specific field
  Field+Phrase   author:"John Smith"    Field with phrase

FIELDS
  author, title, year, doi, pmid, pmcid, isbn, url, keyword, tag, id

CASE SENSITIVITY
  Consecutive uppercase (2+ letters) is case-sensitive:
    AI    → matches "AI therapy", not "ai therapy"
    RNA   → matches "mRNA synthesis", not "mrna synthesis"
  Other text is case-insensitive:
    api   → matches "API", "api", "Api"

OPTIONS
  -t, --tui              Interactive TUI search mode
  -o, --output <format>  Output format: pretty|json|bibtex|ids|uuid|pandoc-key|latex-key
      --json             Alias for --output json
      --bibtex           Alias for --output bibtex
      --ids-only         Alias for --output ids
      --uuid-only        Alias for --output uuid
  -k, --key              Output citation keys (uses default_key_format config)
      --pandoc-key       Alias for --output pandoc-key
      --latex-key        Alias for --output latex-key
      --sort <field>     Sort: created|updated|published|author|title|relevance
      --order <order>    Sort order: asc|desc (default: desc)
  -n, --limit <n>        Maximum number of results (0 = unlimited)
      --offset <n>       Skip first n results
  -h, --help             Display help

EXAMPLES
  $ ref search "machine learning"
  $ ref search author:Smith year:2020
  $ ref search author:"John Smith" title:introduction
  $ ref search tag:review --sort published --order desc
  $ ref search AI therapy                  # AI is case-sensitive
  $ ref search id:smith2023 --output json
  $ ref search --tui                       # Interactive mode
```

## Implementation Approach

Use Commander.js `addHelpText('after', ...)` to append custom sections after the auto-generated options.

## TDD Workflow

For each step, follow the Red-Green-Refactor cycle (see `spec/guidelines/testing.md`):

1. **Write test**: Create test file with comprehensive test cases
2. **Create stub**: Create implementation file with empty functions (`throw new Error("Not implemented")`)
3. **Verify Red**: Run tests, confirm they fail with "Not implemented"
4. **Implement**: Write actual logic until tests pass (Green)
5. **Refactor**: Clean up code while keeping tests green
6. **Quality checks**: Pass lint/typecheck

## Steps

### Step 1: Create help text builder

- [ ] Write test: `src/cli/help/search-help.test.ts`
  - Test that `buildSearchHelpText()` returns expected sections
  - Test QUERY SYNTAX section content
  - Test FIELDS section content
  - Test CASE SENSITIVITY section content
  - Test EXAMPLES section content
- [ ] Create stub: `src/cli/help/search-help.ts`
- [ ] Verify Red: `npm run test:unit -- search-help.test.ts`
- [ ] Implement: Write `buildSearchHelpText()` function
- [ ] Verify Green: `npm run test:unit -- search-help.test.ts`
- [ ] Lint/Type check: `npm run lint && npm run typecheck`

### Step 2: Integrate with search command

- [ ] Update test: `src/cli/index.test.ts`
  - Add test that search command includes custom help text
- [ ] Implement: Add `addHelpText('after', buildSearchHelpText())` to search command in `src/cli/index.ts`
- [ ] Verify Green: `npm run test:unit -- index.test.ts`
- [ ] Lint/Type check: `npm run lint && npm run typecheck`

### Step 3: Update command description

- [ ] Update `.description()` in search command to include brief overview
- [ ] Verify help output matches design

## Manual Verification

**Script**: `test-fixtures/test-search-help.sh`

Non-TTY tests (automated):
- [ ] `ref search --help` shows QUERY SYNTAX section
- [ ] `ref search --help` shows FIELDS section
- [ ] `ref search --help` shows CASE SENSITIVITY section
- [ ] `ref search --help` shows EXAMPLES section
- [ ] All sections are properly formatted and readable

## Completion Checklist

- [ ] All tests pass (`npm run test`)
- [ ] Lint passes (`npm run lint`)
- [ ] Type check passes (`npm run typecheck`)
- [ ] Build succeeds (`npm run build`)
- [ ] Manual verification: `./test-fixtures/test-search-help.sh`
- [ ] CHANGELOG.md updated
- [ ] Move this file to `spec/tasks/completed/`
