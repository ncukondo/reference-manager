# Task: TUI Action Menu Enhancement

## Purpose

Enhance the TUI search action menu (`ref search -t`) with:
- Dynamic menu based on selection count (single vs. multiple entries)
- Citation key action (Pandoc/LaTeX, config-driven)
- New side-effect actions: Open URL, Open fulltext, Manage attachments, Edit, Remove
- Output format submenu (IDs, CSL-JSON, BibTeX, YAML)
- Default citation style from `config.citation.defaultStyle`

See `spec/features/interactive-search.md` (Action Menu section) for full specification.

**Depends on:**
- `20260130-01-citation-key-format.md` (citation key format, config, generateOutput)
- `20260130-02-url-command.md` (URL resolution module)

## References

- Spec: `spec/features/interactive-search.md`
- Action menu: `src/features/interactive/action-menu.ts`
- Search flow app: `src/features/interactive/apps/SearchFlowApp.tsx`
- Search command: `src/cli/commands/search.ts` (`executeInteractiveSearch`, `handleSearchAction`)
- Caller: `src/cli/index.ts` (`handleSearchAction`)
- URL resolution: `src/features/operations/url.ts` (from url-command task)
- Citation key format: `src/features/format/items.ts` (from citation-key-format task)

## Architecture Notes

### Current Design

- `ActionType` is a string union, `ACTION_CHOICES` is a fixed array
- `SearchFlowApp` has states: `search` → `action` → `style` → `exiting`
- `runActionMenu` / `SearchFlowApp` generates output text and returns `ActionMenuResult { action, output, cancelled }`
- `handleSearchAction` in `src/cli/index.ts` writes `result.output` to stdout

### Required Changes

1. **Dynamic action choices**: `ACTION_CHOICES` → `getActionChoices(count, config)` function
2. **New flow state**: `output-format` state for the output format submenu
3. **Side-effect action pattern**: `executeInteractiveSearch` must handle actions that don't produce stdout output
   - Output actions: return `{ output, cancelled: false }` as before
   - Side-effect actions: execute the operation within `executeInteractiveSearch`, return `{ output: "", cancelled: false }`
   - This keeps `handleSearchAction` simple — it doesn't need to know about action details
4. **Config access**: `executeInteractiveSearch` already receives `config`, pass `config.citation.defaultStyle` and `config.citation.defaultKeyFormat` to SearchFlowApp/action menu
5. **Selected items access**: Side-effect actions need the selected `CslItem[]` and `ExecutionContext` — these are available in `executeInteractiveSearch`

### Action Menu Structure

**Single entry selected:**

```
? Action for 1 selected reference:
❯ Citation key (Pandoc)           ← label changes with config.citation.defaultKeyFormat
  Generate citation
  Generate citation (choose style)
  Open URL                        ← opens DOI/PubMed page in browser
  Open fulltext                   ← opens local PDF
  Manage attachments
  Edit reference
  Output (choose format)          ← submenu: IDs, CSL-JSON, BibTeX, YAML
  Remove
  Cancel
```

**Multiple entries selected:**

```
? Action for 3 selected references:
❯ Citation keys (Pandoc)
  Generate citation
  Generate citation (choose style)
  Edit references
  Output (choose format)
  Remove
  Cancel
```

### Citation Key TUI Output Format

| Config | Single | Multiple |
|--------|--------|----------|
| `pandoc` | `@smith2023` | `@smith2023; @jones2024` |
| `latex` | `\cite{smith2023}` | `\cite{smith2023,jones2024}` |

### Underlying Functions for Side-Effect Actions

| Action | Function | Module |
|--------|----------|--------|
| Open URL | `resolveDefaultUrl()` + `openWithSystemApp()` | `src/features/operations/url.ts`, `src/utils/opener.ts` |
| Open fulltext | `executeFulltextOpen()` | `src/cli/commands/fulltext.ts` |
| Manage attachments | `executeAttachOpen()` + `runInteractiveMode()` | `src/cli/commands/attach.ts` |
| Edit | `executeEditCommand()` | `src/cli/commands/edit.ts` |
| Remove | `executeRemove()` with `confirmRemoveIfNeeded()` | `src/cli/commands/remove.ts` |

## TDD Workflow

For each step, follow the Red-Green-Refactor cycle (see `spec/guidelines/testing.md`).

## Steps

### Step 1: Refactor ActionType and Dynamic Action Choices

Extend `ActionType` with new values and make action choices dynamic.

**Changes:**
- Add to `ActionType`: `"key-default"`, `"open-url"`, `"open-fulltext"`, `"manage-attachments"`, `"edit"`, `"remove"`, `"output-format"`
- Create `getActionChoices(count: number, config: { defaultKeyFormat: string }): SelectOption<ActionType>[]`
  - Single (count === 1): Citation key (Pandoc/LaTeX), Generate citation, Generate citation (choose style), Open URL, Open fulltext, Manage attachments, Edit reference, Output (choose format), Remove, Cancel
  - Multiple (count > 1): Citation keys (Pandoc/LaTeX), Generate citation, Generate citation (choose style), Edit references, Output (choose format), Remove, Cancel
- Dynamic label for citation key: `"pandoc"` → `"Citation key (Pandoc)"`, `"latex"` → `"Citation key (LaTeX)"`
- Update `SearchFlowApp` to call `getActionChoices(selectedItems.length, config)` instead of using `ACTION_CHOICES`

**Files:**
- `src/features/interactive/action-menu.ts`
- `src/features/interactive/apps/SearchFlowApp.tsx`

**Tests:**
- [x] Write test: `src/features/interactive/action-menu.test.ts` — `getActionChoices` returns correct items for count=1 and count>1
- [x] Write test: `getActionChoices` uses config to set citation key label
- [x] Implement
- [x] Verify Green
- [x] Lint/Type check

### Step 2: Add Output Format Submenu ✅

- [x] Implemented `OutputFormatType` and `OUTPUT_FORMAT_CHOICES`
- [x] Added `"output-format"` flow state to `SearchFlowApp`
- [x] YAML output via `yaml` package `stringify`
- [x] Tests pass

### Step 3: Use Default Citation Style from Config ✅

- [x] `defaultStyle` passed through config chain
- [x] `cite-default` uses `config.citation.defaultStyle`
- [x] Tests pass

### Step 4: Side-Effect Action Architecture ✅

- [x] `ActionMenuResult.selectedItems` added for side-effect actions
- [x] `isSideEffectAction()` helper function
- [x] `executeInteractiveSearch` handles side-effect results
- [x] `executeSideEffectAction` dispatches to appropriate functions
- [x] Tests pass

### Steps 5-10: All Actions Implemented ✅

- [x] Step 5: Citation key action (via `generateOutput("key-default")`)
- [x] Step 6: Open URL action (`resolveDefaultUrl` + `openWithSystemApp`)
- [x] Step 7: Open fulltext action (`executeFulltextOpen`)
- [x] Step 8: Manage attachments action (`executeAttachOpen`)
- [x] Step 9: Edit action (`executeEditCommand`)
- [x] Step 10: Remove action (`executeRemove`)

### Step 11: Fix `--config` CLI Flag (Bug)

The `--config <path>` global CLI option is defined in Commander but not passed to `loadConfig()`.
`loadConfigWithOverrides()` ignores `options.config` — the comment says so explicitly.

**Root cause:**
- `loadConfig()` accepts `LoadConfigOptions` which has no `configPath` field for CLI-specified config
- `loadConfigWithOverrides()` calls `loadConfig()` with no arguments, ignoring `options.config`

**Changes:**
- Add `configPath?: string` to `LoadConfigOptions` in `src/config/loader.ts`
- In `loadConfig()`, if `configPath` is provided, load it as the highest-priority file config (same level as env config, or higher)
- In `loadConfigWithOverrides()`, pass `options.config` as `configPath` to `loadConfig()`
- Remove the "currently ignored" comment

**Files:**
- `src/config/loader.ts`
- `src/cli/helpers.ts`

**Tests:**
- [ ] Write test: `loadConfig({ configPath: "/path/to/config.toml" })` loads and applies the file
- [ ] Write test: `configPath` has higher priority than env and user config
- [ ] Write test: `loadConfigWithOverrides({ config: "/path" })` passes through to `loadConfig`
- [ ] Implement
- [ ] Verify Green
- [ ] Lint/Type check

## Manual Verification

**Status**: Not yet performed. PR #55 has all CI checks passing. Manual test needed before merge.

### Roles

| Role | Responsibility |
|------|----------------|
| **AI Agent** | Build, generate dummy library, create directories, verify `list` works |
| **User** | Set alias (one-line copy-paste), run TUI operations, visual verification |

TTY operations cannot be executed by the agent; the user must run them directly in the terminal.
After preparation is complete, the agent should present the "User Test Procedure" below as-is.

### Agent Preparation

```bash
# 1. Navigate to worktree and build
cd /workspaces/reference-manager--worktrees/feature/tui-action-menu
npm run build

# 2. Generate dummy library (20 entries with DOI/PMID/URL)
node test-fixtures/generate-dummy-library.mjs /tmp/tui-test-library.json 20

# 3. Create attachments directory
mkdir -p /tmp/tui-test-attachments

# 4. Verify list command works
node bin/cli.js --library /tmp/tui-test-library.json list --limit 3
```

After preparation, present the "User Test Procedure" below to the user.

> **Note on `--config` flag**: The `--config` CLI flag is currently non-functional
> (`loadConfigWithOverrides` ignores it). See Step 11 for the fix.
> Manual tests use `--library` and default config values.
> LaTeX key format test (E) and custom default style test require Step 11 to be
> completed first, or the user config file at `~/.config/reference-manager/config.toml`
> to be edited manually.

---

### User Test Procedure

> Run the following directly in your terminal.

#### 0. Setup

```bash
# Navigate to worktree
cd /workspaces/reference-manager--worktrees/feature/tui-action-menu

# Set up ref alias with --library (session-only)
alias ref="node $(pwd)/bin/cli.js --library /tmp/tui-test-library.json --attachments-dir /tmp/tui-test-attachments"

# Verify: should display 3 entries
ref list --limit 3
```

#### A. Action menu display (single selection)

```bash
ref search --tui
```

1. Without typing a query (all entries visible), use **Up/Down** to move and **Space** to select **1 entry**
2. Press **Enter**
3. **Verify**: Action menu shows the following **10 items** in order:
   ```
   Citation key (Pandoc)
   Generate citation
   Generate citation (choose style)
   Open URL
   Open fulltext
   Manage attachments
   Edit reference          ← singular
   Output (choose format)
   Remove
   Cancel
   ```
4. Select **Cancel** to exit

- [ ] 10 items displayed

#### B. Action menu display (multiple selection)

```bash
ref search --tui
```

1. Select **3 entries** with **Space**, then press **Enter**
2. **Verify**: The following **7 items** are shown (Open URL, Open fulltext, Manage attachments **absent**):
   ```
   Citation keys (Pandoc)  ← plural
   Generate citation
   Generate citation (choose style)
   Edit references         ← plural
   Output (choose format)
   Remove
   Cancel
   ```
3. Select **Cancel** to exit

- [ ] 7 items displayed (singular → plural change confirmed)

#### C. Citation key (single, Pandoc)

```bash
ref search --tui
```

1. Select 1 entry → Enter → choose **"Citation key (Pandoc)"**
2. **Verify**: Output in `@<citation-key>` format (e.g., `@Smith-2023`)

- [ ] `@<id>` format output

#### D. Citation keys (multiple, Pandoc)

```bash
ref search --tui
```

1. Select 3 entries → Enter → choose **"Citation keys (Pandoc)"**
2. **Verify**: Output in `@id1; @id2; @id3` format (semicolon-separated)

- [ ] `@id1; @id2; @id3` format

#### E. LaTeX key format

> **Prerequisite**: Requires `--config` fix (Step 11) or manual user config edit.
> To test without Step 11, edit `~/.config/reference-manager/config.toml`:
> ```toml
> [citation]
> default_key_format = "latex"
> ```

```bash
ref search --tui
```

1. Select 1 entry → **"Citation key (LaTeX)"** → **Verify**: `\cite{<id>}` format
2. Run again → Select 3 entries → **"Citation keys (LaTeX)"** → **Verify**: `\cite{id1,id2,id3}` format

Restore config after testing (remove the `[citation]` section or revert the change).

- [ ] LaTeX single and multiple output

#### F. Generate citation (default style)

```bash
ref search --tui
```

1. Select 1 entry → **"Generate citation"**
2. **Verify**: Citation text is output (default style is APA unless config is overridden)

- [ ] Default style citation output

#### G. Generate citation (choose style)

```bash
ref search --tui
```

1. Select 1 entry → **"Generate citation (choose style)"**
2. **Verify**: Style selection menu appears (APA / Vancouver / Harvard)
3. Select a style → citation in the chosen style is output

- [ ] Style selection → output

#### H. Output (choose format) submenu

```bash
ref search --tui
```

1. Select 1 entry → **"Output (choose format)"**
2. **Verify**: Submenu appears:
   ```
   IDs (citation keys)
   CSL-JSON
   BibTeX
   YAML
   Cancel
   ```
3. Select **"YAML"** → verify YAML output

Also test IDs, CSL-JSON, BibTeX (requires re-running the command each time).

- [ ] Submenu displayed
- [ ] YAML output (contains `id:`, `type:` keys)
- [ ] IDs output (one citation key per line)
- [ ] CSL-JSON output (JSON object)
- [ ] BibTeX output (`@article{...}` format)

#### I. Output format Cancel

```bash
ref search --tui
```

1. Select 1 entry → **"Output (choose format)"** → **"Cancel"**
2. **Verify**: Returns to action menu (process does not exit)
3. Select **Cancel** to exit

- [ ] Cancel returns to action menu

#### J. Open URL

```bash
ref search --tui
```

1. Select 1 entry with a DOI (type `DOI:` in search to filter) → **"Open URL"**
2. **Verify**: Browser opens, or on WSL `wslview` is invoked
   - If an error occurs, confirming the opener was called is sufficient

- [ ] URL available: browser/opener invoked
- [ ] URL unavailable: `No URL available for <id>` shown in terminal

#### K. Open fulltext

```bash
ref search --tui
```

1. Select 1 entry → **"Open fulltext"**
2. **Verify**: Error message displayed (expected — dummy data has no fulltext)

- [ ] Error message displayed

#### L. Manage attachments

```bash
ref search --tui
```

1. Select 1 entry → **"Manage attachments"**
2. **Verify**: Attempts to open attachments directory (`/tmp/tui-test-attachments/<id>/`)

- [ ] Directory open attempted (or error)

#### M. Edit reference (single)

```bash
EDITOR=cat ref search --tui
```

> `EDITOR=cat` shows content on stdout instead of opening an editor.

1. Select 1 entry → **"Edit reference"**
2. **Verify**: YAML-formatted reference data is displayed

- [ ] Editor (cat) invoked, data displayed

#### N. Edit references (multiple)

```bash
EDITOR=cat ref search --tui
```

1. Select 3 entries → **"Edit references"**
2. **Verify**: Data for all 3 entries is displayed

- [ ] Multiple entries displayed

#### O. Remove (single)

```bash
ref search --tui
```

1. Select 1 entry → **"Remove"**
2. **Verify**: Confirmation prompt appears → confirm with `y`
3. Check:
   ```bash
   ref list | wc -l
   ```
   → Count should decrease by 1

- [ ] Confirmation prompt → deletion → count decreased

#### P. Remove (multiple)

```bash
ref search --tui
```

1. Select 2 entries → **"Remove"**
2. **Verify**: Sequential confirmation and deletion for each entry

- [ ] Multiple entries deleted sequentially

#### Q. Navigation

```bash
ref search --tui
```

1. Select 1 entry → Enter → action menu appears → press **Esc**
2. **Verify**: Returns to search screen (TUI does not exit)
3. Press **Esc** on search screen
4. **Verify**: TUI exits, returns to normal shell

- [ ] Esc in action menu → returns to search
- [ ] Esc in search screen → TUI exits

---

### Cleanup after testing

```bash
rm -f /tmp/tui-test-library.json
rm -rf /tmp/tui-test-attachments
unalias ref 2>/dev/null
```

## Completion Checklist

- [x] All tests pass (`npm run test`) — 2548 unit tests, 27 action-menu tests
- [x] Lint passes (`npm run lint`)
- [x] Type check passes (`npm run typecheck`)
- [x] Build succeeds (`npm run build`)
- [x] CI passes (ubuntu, macOS, Windows) — PR #55
- [ ] Step 11: Fix `--config` CLI flag
- [ ] Manual verification (TTY required) — steps A through Q above
- [x] Spec verified: `spec/features/interactive-search.md` (already up to date)
- [x] CHANGELOG.md updated
- [ ] Merge PR
- [ ] On main: update ROADMAP, move task file to `completed/`
