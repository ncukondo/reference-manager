# Task: Clipboard Support

## Purpose

Add clipboard auto-copy functionality for CLI output. When enabled, command output is copied to the system clipboard in addition to stdout. Controlled via three layers: config setting (TUI only), CLI flag, and environment variable (both apply to all commands).

## References

- Spec: `spec/features/interactive-search.md` (Future Extensions → Clipboard auto-copy)
- Spec: `spec/architecture/cli.md` (Global Options, Configuration)
- Config schema: `src/config/schema.ts`
- Env overrides: `src/config/env-override.ts`
- CLI global options: `src/cli/index.ts`
- CLI helpers: `src/cli/helpers.ts`
- Search command: `src/cli/commands/search.ts`

## Design Decisions

### Three-Layer Control

| Layer | Setting | Scope |
|-------|---------|-------|
| Config file | `cli.tui.clipboard_auto_copy = true` | TUI output only |
| Environment variable | `REFERENCE_MANAGER_CLIPBOARD_AUTO_COPY=1` | All output commands |
| CLI flag | `--clipboard` / `--no-clipboard` | All output commands |

**Priority** (highest to lowest): CLI flag → Environment variable → Config file → Default (`false`)

### Behavior

- **stdout output is always maintained** — clipboard is an additional destination
- Success notification: `Copied to clipboard` on stderr (suppressed by `--quiet`)
- Graceful degradation: if clipboard command is unavailable or fails, warn on stderr and continue normally

### Clipboard Command Detection Order

| Priority | Platform | Command |
|----------|----------|---------|
| 1 | macOS | `pbcopy` |
| 2 | WSL | `clip.exe` |
| 3 | Linux (Wayland) | `wl-copy` |
| 4 | Linux (X11) | `xclip -selection clipboard` |
| 5 | — | Not available → warn on stderr |

Detection at copy time (not startup).

### Applicable Commands

All commands that produce stdout output. Implementation via a centralized output helper that checks clipboard settings before writing to stdout, so individual commands need no changes.

## TDD Workflow

For each step, follow the Red-Green-Refactor cycle (see `spec/guidelines/testing.md`).

## Steps

### Step 1: Clipboard Utility Module

Create a utility module for detecting and invoking system clipboard commands.

**Changes:**
- Create `src/utils/clipboard.ts` with:
  - `detectClipboardCommand(): { command: string; args: string[] } | null` — detects available clipboard command
  - `copyToClipboard(text: string): Promise<{ success: boolean; error?: string }>` — copies text via detected command
- Detection order: `pbcopy` → `clip.exe` → `wl-copy` → `xclip -selection clipboard`
- Use `child_process.execFile` / `spawn` to invoke the command, piping text to stdin

**Files:**
- `src/utils/clipboard.ts`
- `src/utils/clipboard.test.ts`

**Tests:**
- [ ] Write test: `detectClipboardCommand` returns correct command per platform mock
- [ ] Write test: `copyToClipboard` returns `{ success: true }` on success
- [ ] Write test: `copyToClipboard` returns `{ success: false, error }` when command fails
- [ ] Write test: `copyToClipboard` returns `{ success: false }` when no clipboard command available
- [ ] Implement
- [ ] Verify Green
- [ ] Lint/Type check

### Step 2: Config Schema and Defaults

Add `clipboard_auto_copy` to TUI config schema and defaults.

**Changes:**
- Add `clipboardAutoCopy: z.boolean()` to `tuiConfigSchema` in `src/config/schema.ts`
- Add default `clipboardAutoCopy: false` in `src/config/defaults.ts`
- Add `REFERENCE_MANAGER_CLIPBOARD_AUTO_COPY` to `ENV_OVERRIDE_MAP` in `src/config/env-override.ts`

**Files:**
- `src/config/schema.ts`
- `src/config/defaults.ts`
- `src/config/env-override.ts`

**Tests:**
- [ ] Write test: config schema accepts `clipboardAutoCopy` boolean
- [ ] Write test: default value is `false`
- [ ] Write test: env override resolves `REFERENCE_MANAGER_CLIPBOARD_AUTO_COPY` to `cli.tui.clipboard_auto_copy`
- [ ] Implement
- [ ] Verify Green
- [ ] Lint/Type check

### Step 3: CLI Global Option `--clipboard` / `--no-clipboard`

Add clipboard flags as global CLI options.

**Changes:**
- Add `--clipboard` / `--no-clipboard` to global options in `src/cli/index.ts`
- Update `loadConfigWithOverrides` in `src/cli/helpers.ts` to resolve clipboard setting:
  - CLI flag (if explicitly set) → env var → config `cli.tui.clipboard_auto_copy` (TUI only) → `false`
- Expose resolved clipboard flag in execution context or as a return from the config loader

**Files:**
- `src/cli/index.ts`
- `src/cli/helpers.ts`

**Tests:**
- [ ] Write test: `--clipboard` flag overrides config and env
- [ ] Write test: `--no-clipboard` flag disables clipboard
- [ ] Write test: env var applies when no CLI flag given
- [ ] Write test: config `cli.tui.clipboard_auto_copy` applies only in TUI mode when no CLI flag/env
- [ ] Implement
- [ ] Verify Green
- [ ] Lint/Type check

### Step 4: Integrate Clipboard into Output Path

Wire clipboard copy into the CLI output flow.

**Changes:**
- Create output helper (e.g., `writeOutputWithClipboard`) that:
  1. Writes to stdout as usual
  2. If clipboard is enabled, calls `copyToClipboard`
  3. On success, writes `Copied to clipboard` to stderr (unless `--quiet`)
  4. On failure, writes warning to stderr (unless `--quiet`)
- Apply helper to `handleSearchAction` (both TUI and non-TUI paths)
- Apply helper to other output commands: `cite`, `show`, `export`

**Files:**
- `src/cli/helpers.ts` (or new `src/cli/output.ts`)
- `src/cli/index.ts` (command handlers)

**Tests:**
- [ ] Write test: output goes to both stdout and clipboard when enabled
- [ ] Write test: stderr shows "Copied to clipboard" on success
- [ ] Write test: stderr warning on clipboard failure, stdout still works
- [ ] Write test: `--quiet` suppresses clipboard notification
- [ ] Write test: clipboard not invoked when disabled
- [ ] Implement
- [ ] Verify Green
- [ ] Lint/Type check

### Step 5: Update Specs

Update specification documents to reflect the new clipboard feature.

- [ ] Update `spec/architecture/cli.md`: add `--clipboard` / `--no-clipboard` to Global Options, add `clipboard_auto_copy` to config settings
- [ ] Update `spec/features/interactive-search.md`: move clipboard from Future Extensions to Configuration section
- [ ] Update `spec/features/config-command.md`: add new config key if needed
- [ ] Verify consistency across specs

## Manual Verification

**Script**: `test-fixtures/test-clipboard.sh`

Non-TTY tests (automated, requires clipboard command):
- [ ] `ref search --clipboard --ids-only "test" 2>&1` → output on stdout + "Copied to clipboard" on stderr
- [ ] `ref cite --clipboard smith2020 2>&1` → citation on stdout + "Copied to clipboard" on stderr
- [ ] `ref search --no-clipboard --ids-only "test" 2>/dev/null` → no clipboard copy
- [ ] `ref search --clipboard --quiet --ids-only "test" 2>&1` → no stderr notification
- [ ] `REFERENCE_MANAGER_CLIPBOARD_AUTO_COPY=1 ref search --ids-only "test" 2>&1` → clipboard copy via env var

TTY-required tests (run manually in a terminal):
- [ ] Set `cli.tui.clipboard_auto_copy = true` in config → `ref search -t` → select + output action → verify clipboard contains output
- [ ] `ref search -t --no-clipboard` → verify clipboard NOT updated despite config

## Completion Checklist

- [ ] All tests pass (`npm run test`)
- [ ] Lint passes (`npm run lint`)
- [ ] Type check passes (`npm run typecheck`)
- [ ] Build succeeds (`npm run build`)
- [ ] Manual verification completed
- [ ] CHANGELOG.md updated
- [ ] Move this file to `spec/tasks/completed/`
