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

Options that apply: `--uuid` only. `--print` and `--no-sync` are available via
explicit `ref attach open` subcommand. This avoids option name conflicts between
parent and subcommand that would require `enablePositionalOptions()` on the root
program, which breaks global option propagation (e.g. `--library`).

### Non-TTY Behavior

In non-TTY mode without identifier, the command should show help (same as current behavior)
since interactive selection is not available. With identifier, `--print` should still work.

## Steps

### Step 1: Add Default Action to `attach` Parent Command

- [x] Write test: `src/cli/index.test.ts` — test that `ref attach` parent has identifier arg, options, and subcommands
- [x] Implement: Add `[identifier]` argument and action to `attachCmd` in `registerAttachCommand`
- [x] Verify: existing `attach open/add/list/get/detach/sync` subcommands still work correctly
- [x] Lint/Type check: `npm run lint && npm run typecheck`

### Step 2: Manual Verification

- [x] `ref attach` (TTY, no args) → interactive selection → opens directory (delegates to handleAttachOpenAction)
- [x] `ref attach <key>` (TTY) → opens directory for reference (delegates to handleAttachOpenAction)
- [x] `ref attach open --print <key>` → prints directory path (--print only on open subcommand)
- [x] `ref attach open <key>` → still works as before
- [x] `ref attach add`, `ref attach list`, etc. → still work as before
- [x] `ref attach --help` → shows both default behavior and subcommands

## Completion Checklist

- [x] All tests pass (`npm run test`)
- [x] Lint passes (`npm run lint`)
- [x] Type check passes (`npm run typecheck`)
- [x] Build succeeds (`npm run build`)
- [x] Manual verification completed
- [x] CHANGELOG.md updated
- [x] Move this file to `spec/tasks/completed/`
