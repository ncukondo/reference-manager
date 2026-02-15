# Task: Check Command — Reference Status Verification

## Purpose

Add `ref check` command to detect retractions, expressions of concern, and preprint-to-published version changes by querying Crossref and PubMed APIs.

## References

- Spec: `spec/features/check.md`
- Related: `src/features/import/fetcher.ts`, `src/features/import/rate-limiter.ts`
- Related: `src/features/operations/library-operations.ts` (ILibraryOperations)

## TDD Workflow

For each step, follow the Red-Green-Refactor cycle (see `spec/guidelines/testing.md`):

1. **Write test**: Create test file with comprehensive test cases
2. **Create stub**: Create implementation file with empty functions (`throw new Error("Not implemented")`)
3. **Verify Red**: Run tests, confirm they fail with "Not implemented"
4. **Implement**: Write actual logic until tests pass (Green)
5. **Refactor**: Clean up code while keeping tests green
6. **Quality checks**: Pass lint/typecheck

## Steps

### Phase 1: Crossref API Client & Retraction/Version Detection

#### Step 1: Crossref API client

Query Crossref REST API (`/works/{DOI}`) and parse `update-to` field for retraction/version info.

- [ ] Write test: `src/features/check/crossref-client.test.ts`
- [ ] Create stub: `src/features/check/crossref-client.ts`
- [ ] Verify Red
- [ ] Implement: HTTP fetch to Crossref, parse `update-to` array, extract retraction/concern/new_version
- [ ] Verify Green
- [ ] Lint/Type check

#### Step 2: Check types and checker core

Define `CheckFinding`, `CheckResult` types. Implement checker that takes a reference and returns findings.

- [ ] Write test: `src/features/check/checker.test.ts`
- [ ] Create stub: `src/features/check/types.ts`, `src/features/check/checker.ts`
- [ ] Verify Red
- [ ] Implement: Orchestrate Crossref queries, build findings from API responses
- [ ] Verify Green
- [ ] Lint/Type check

#### Step 3: Check operation

Implement `check` operation in operations layer. Handle multi-ID selection (`[ids...]`, `--all`, `--search`), `--days` skip logic, and `custom.check` saving.

- [ ] Write test: `src/features/operations/check.test.ts`
- [ ] Create stub: `src/features/operations/check.ts`
- [ ] Verify Red
- [ ] Implement: Reference selection, checker invocation, result saving, summary
- [ ] Verify Green
- [ ] Lint/Type check

#### Step 4: ILibraryOperations integration

Add `check()` method to `ILibraryOperations` interface and implement in `OperationsLibrary`.

- [ ] Update `src/features/operations/library-operations.ts` (interface)
- [ ] Update `src/features/operations/operations-library.ts` (implementation)
- [ ] Verify Green: existing tests still pass
- [ ] Lint/Type check

#### Step 5: CLI command

Add `ref check` command with all options.

- [ ] Write test: (CLI integration)
- [ ] Create stub: `src/cli/check.ts`
- [ ] Implement: Commander command definition, text/JSON output formatting
- [ ] Verify Green
- [ ] Lint/Type check

### Phase 2: PubMed Status Detection

#### Step 6: PubMed status checker

Query PubMed E-utilities for publication status and retraction notices (PMID-only references).

- [ ] Write test: `src/features/check/pubmed-client.test.ts`
- [ ] Create stub: `src/features/check/pubmed-client.ts`
- [ ] Verify Red
- [ ] Implement: E-utilities query, parse retraction/status fields
- [ ] Verify Green
- [ ] Lint/Type check

#### Step 7: Integrate PubMed into checker

Extend checker to use PubMed for PMID-only references and as supplementary source.

- [ ] Update tests: `src/features/check/checker.test.ts`
- [ ] Implement: Add PubMed path to checker orchestration
- [ ] Verify Green
- [ ] Lint/Type check

### Phase 3: Interactive Repair (`--fix`)

#### Step 8: Fix actions

Implement interactive repair flow for retraction and version change findings.

- [ ] Write test: `src/features/check/fix-actions.test.ts`
- [ ] Create stub: `src/features/check/fix-actions.ts`
- [ ] Verify Red
- [ ] Implement: Tag addition, metadata update from published version, removal
- [ ] Verify Green
- [ ] Lint/Type check

#### Step 9: CLI `--fix` integration

Wire `--fix` flag to interactive repair in CLI command (TTY-only).

- [ ] Update CLI command to handle `--fix`
- [ ] Verify Green
- [ ] Lint/Type check

### Phase 4: Server & MCP Integration

#### Step 10: HTTP server endpoint

Expose check via HTTP API.

- [ ] Add route and handler
- [ ] Verify Green
- [ ] Lint/Type check

#### Step 11: MCP tool

Add check as MCP tool.

- [ ] Add tool definition
- [ ] Verify Green
- [ ] Lint/Type check

## Manual Verification

**Script**: `test-fixtures/test-check.sh`

Non-TTY tests (automated):
- [ ] `ref check <known-retracted-DOI>` reports retraction
- [ ] `ref check --all --no-save -o json` returns valid JSON with summary
- [ ] `ref check --all --days 0` re-checks all regardless of previous check

TTY-required tests (run manually in a terminal):
- [ ] `ref check` with no args triggers interactive selection
- [ ] `ref check --all --fix` shows interactive repair menu for findings

## Completion Checklist

- [ ] All tests pass (`npm run test`)
- [ ] Lint passes (`npm run lint`)
- [ ] Type check passes (`npm run typecheck`)
- [ ] Build succeeds (`npm run build`)
- [ ] Manual verification: `./test-fixtures/test-check.sh` (if applicable)
- [ ] CHANGELOG.md updated
- [ ] Move this file to `spec/tasks/completed/`
