# Task: `ref attach` Default to Open Behavior

## Purpose

Make `ref attach` (without subcommand) behave like `ref attach open` in TTY mode,
providing a shortcut to the most common attachment workflow: opening the attachments
directory to add/manage files interactively.

**Scope**:
- `ref attach` (no args, TTY) → interactive ID selection → open directory (same as `ref attach open`)
- `ref attach <identifier>` (TTY) → open directory for that reference (same as `ref attach open <identifier>`)
- `ref attach <identifier> <file>` → **NOT** implemented (avoid ambiguity with `attach add`)

## References

- Spec: `spec/features/attachments.md`
- ADR: `spec/decisions/ADR-013-attachments-architecture.md`
- CLI registration: `src/cli/index.ts` (`registerAttachCommand`)
- Handler: `src/cli/commands/attach.ts` (`handleAttachOpenAction`)

## Design Notes

### Commander.js Approach

The parent `attachCmd` needs an `.argument("[identifier]")` and `.action()` that delegates
to `handleAttachOpenAction`. Commander.js allows both a default action on the parent
and subcommands simultaneously. The key consideration is that Commander.js must still
route `ref attach open`, `ref attach add`, etc. to their respective subcommands.

Use `attachCmd.argument("[identifier]").action(...)` to handle the no-subcommand case.
Commander.js will prioritize subcommand matching over the parent action, so
`ref attach open` will still route correctly.

Options that apply: `--uuid`, `--print`, `--no-sync` (same as `attach open`).

### Non-TTY Behavior

In non-TTY mode without identifier, the command should show help (same as current behavior)
since interactive selection is not available. With identifier, `--print` should still work.

## Steps

### Step 1: Add Default Action to `attach` Parent Command

- [ ] Write test: `src/cli/commands/attach.test.ts` — test that `ref attach` delegates to open behavior
- [ ] Implement: Add `[identifier]` argument and action to `attachCmd` in `registerAttachCommand`
- [ ] Verify: existing `attach open/add/list/get/detach/sync` subcommands still work correctly
- [ ] Lint/Type check: `npm run lint && npm run typecheck`

### Step 2: Manual Verification

- [ ] `ref attach` (TTY, no args) → interactive selection → opens directory
- [ ] `ref attach <key>` (TTY) → opens directory for reference
- [ ] `ref attach --print <key>` → prints directory path
- [ ] `ref attach open <key>` → still works as before
- [ ] `ref attach add`, `ref attach list`, etc. → still work as before
- [ ] `ref attach --help` → shows both default behavior and subcommands

## Completion Checklist

- [ ] All tests pass (`npm run test`)
- [ ] Lint passes (`npm run lint`)
- [ ] Type check passes (`npm run typecheck`)
- [ ] Build succeeds (`npm run build`)
- [ ] Manual verification completed
- [ ] CHANGELOG.md updated
- [ ] Move this file to `spec/tasks/completed/`
