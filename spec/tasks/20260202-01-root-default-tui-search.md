# Task: `ref` Default to Interactive TUI Search

## Purpose

Make `ref` (without subcommand) fall back to `ref search -t` (interactive TUI search),
providing the most natural entry point for browsing and managing references.

This follows the same pattern as `ref attach` → `ref attach open` (Phase 31).

**Scope**:
- `ref` (no args, TTY) → launch interactive TUI search (same as `ref search -t`)
- `ref` (no args, non-TTY) → show help (current behavior preserved)
- All existing subcommands (`search`, `list`, `add`, etc.) → unchanged

## References

- Spec: `spec/features/interactive-search.md`
- Spec: `spec/features/search.md`
- Prior art: `spec/tasks/completed/20260129-02-attach-default-open.md`
- CLI registration: `src/cli/index.ts` (`createProgram`)
- Handler: `src/cli/index.ts` (`handleSearchAction`)
- TUI entry: `src/cli/commands/search.ts` (`executeInteractiveSearch`)
- TTY detection: `src/features/interactive/tty.ts` (`checkTTY`)

## Design Notes

### Commander.js Approach

Add `.action()` to the root `program` in `createProgram()`. Commander.js allows both
a default action on the root command and subcommands simultaneously — the same pattern
proven by `ref attach`. Commander.js prioritizes subcommand matching, so `ref search`,
`ref list`, etc. will still route to their respective handlers.

No arguments or command-specific options needed on the root action. Global options
(`--library`, `--config`, etc.) are available via `program.opts()` as usual.

### TTY Detection Strategy

Check `process.stdin.isTTY && process.stdout.isTTY` **before** calling
`handleSearchAction`. If non-TTY, call `program.help()` to display help instead.
This avoids the poor UX of showing "TUI mode requires a TTY" error when a user
simply runs `ref` in a non-interactive context (e.g., pipe, script).

```typescript
program.action(async () => {
  if (process.stdin.isTTY && process.stdout.isTTY) {
    await handleSearchAction("", { tui: true }, program);
  } else {
    program.help();
  }
});
```

### Impact on Shell Completion

Shell completion (`src/cli/completion.ts`) checks `COMP_LINE` before `parseAsync`,
so it is unaffected. `ref <TAB>` will continue to list subcommands.

## TDD Workflow

For each step, follow the Red-Green-Refactor cycle (see `spec/guidelines/testing.md`):

## Steps

### Step 1: Add Default Action to Root Program (Unit Tests)

- [ ] Write test: `src/cli/index.test.ts` — add "root command default action" describe block
  - Root program has an action handler when no subcommand is given
  - All existing subcommands remain registered and functional
- [ ] Implement: Add `.action()` to `program` in `createProgram()` with TTY check
- [ ] Verify Green: `npm run test:unit -- index.test.ts`
- [ ] Lint/Type check: `npm run lint && npm run typecheck`

### Step 2: E2E Test

- [ ] Write test: `src/cli/interactive-search.e2e.test.ts` — add test for `ref` with no subcommand
  - Non-TTY: should show help (exit code 0), not "TUI mode requires a TTY" error
- [ ] Verify Green: `npm run test:e2e -- interactive-search`
- [ ] Lint/Type check: `npm run lint && npm run typecheck`

### Step 3: Documentation Updates

- [ ] Update `spec/features/interactive-search.md` — add `ref` (no subcommand) as TUI entry point
- [ ] Update `spec/features/search.md` — mention fallback in TUI Mode section
- [ ] Update `spec/architecture/cli.md` — document root command default behavior
- [ ] Update `README.md` — add `ref` usage example in relevant sections
- [ ] Update `CHANGELOG.md`

## Manual Verification

TTY-required tests (run manually in a terminal):
- [ ] `ref` (TTY, no args) → TUI search launches
- [ ] `ref` (TTY) then `Esc` → exits cleanly
- [ ] `ref search -t` → still works as before
- [ ] `ref search "query"` → still works as before
- [ ] `ref list` → still works as before
- [ ] `ref --help` → shows help with all subcommands
- [ ] `ref -V` → shows version
- [ ] `echo "" | ref` (non-TTY) → shows help, not TUI error

## Completion Checklist

- [ ] All tests pass (`npm run test`)
- [ ] Lint passes (`npm run lint`)
- [ ] Type check passes (`npm run typecheck`)
- [ ] Build succeeds (`npm run build`)
- [ ] Manual verification completed
- [ ] CHANGELOG.md updated
- [ ] Move this file to `spec/tasks/completed/`
