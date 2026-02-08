# Task: Auto-Fetch Fulltext on Add

## Purpose

Add a `--fetch-fulltext` option to `ref add` that automatically discovers and downloads OA fulltext after successfully adding a reference. This streamlines the workflow from adding a reference to having its fulltext available.

## References

- Spec: `spec/features/fulltext-retrieval.md`
- Related: `src/cli/commands/add.ts`, `src/features/operations/fulltext/fetch.ts`
- Prerequisite: `20260208-02-fulltext-retrieval-commands.md`

## TDD Workflow

For each step, follow the Red-Green-Refactor cycle (see `spec/guidelines/testing.md`).

## Steps

### Step 1: Config Option for Auto-Fetch Default

Add `fulltext.autoFetchOnAdd` config option (default: `false`) so users can enable auto-fetch globally.

- [x] Write test: `src/config/loader.test.ts` (add autoFetchOnAdd validation)
- [x] Implement: Add to `fulltextConfigSchema` in `src/config/schema.ts`
- [x] Update loader: `src/config/loader.ts`
- [x] Verify Green
- [x] Lint/Type check

### Step 2: Add `--fetch-fulltext` / `--no-fetch-fulltext` CLI Option

Add flag to the `add` command. When enabled, after each successful add, attempt fulltext fetch.

- [ ] Write test: `src/cli/commands/add.test.ts` (add fetch-fulltext option tests)
- [ ] Implement:
  - Add `--fetch-fulltext` option to `add` command in `src/cli/index.ts`
  - After successful `executeAdd`, for each added item:
    - Call fulltext fetch operation (non-blocking, best-effort)
    - Report success/failure per item on stderr
  - `--no-fetch-fulltext` explicitly disables (overrides config)
- [ ] Verify Green
- [ ] Lint/Type check

### Step 3: Error Handling for Auto-Fetch

Auto-fetch failures should NOT cause the add command to fail. The reference is already added; fulltext is best-effort.

- [ ] Write test: Network failure during auto-fetch does not affect add exit code
- [ ] Write test: No OA source found shows info message, exit code 0
- [ ] Implement: Wrap fetch in try/catch, report on stderr
- [ ] Verify Green
- [ ] Lint/Type check

### Step 4: E2E Tests

- [ ] Write E2E test: `ref add <doi> --fetch-fulltext` adds reference and attempts fulltext
- [ ] Write E2E test: `ref add <doi> --no-fetch-fulltext` skips fulltext even if config enabled
- [ ] Verify Green
- [ ] Lint/Type check

## Manual Verification

Non-TTY tests:
- [ ] `ref add 10.1038/nature12373 --fetch-fulltext` adds ref and fetches fulltext
- [ ] `ref add pmid:12345678 --fetch-fulltext` adds ref and fetches fulltext
- [ ] `ref add <non-oa-doi> --fetch-fulltext` adds ref, reports no OA source, exits 0
- [ ] Config `fulltext.auto_fetch_on_add = true` enables auto-fetch by default

## Completion Checklist

- [ ] All tests pass (`npm run test`)
- [ ] Lint passes (`npm run lint`)
- [ ] Type check passes (`npm run typecheck`)
- [ ] Build succeeds (`npm run build`)
- [ ] CHANGELOG.md updated
- [ ] Move this file to `spec/tasks/completed/`
