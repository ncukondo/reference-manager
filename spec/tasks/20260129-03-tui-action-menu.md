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
- [ ] Write test: `src/features/interactive/action-menu.test.ts` — `getActionChoices` returns correct items for count=1 and count>1
- [ ] Write test: `getActionChoices` uses config to set citation key label
- [ ] Implement
- [ ] Verify Green
- [ ] Lint/Type check

### Step 2: Add Output Format Submenu

Add a submenu for selecting output format (IDs, CSL-JSON, BibTeX, YAML).

**Changes:**
- Define `OutputFormatType` and `OUTPUT_FORMAT_CHOICES` (IDs, CSL-JSON, BibTeX, YAML, Cancel)
- Add `"output-format"` flow state to `SearchFlowApp`
- When "Output (choose format)" is selected in action menu, transition to `"output-format"` state
- When format is selected, generate output and exit
- When cancelled, return to action menu

**Files:**
- `src/features/interactive/action-menu.ts`
- `src/features/interactive/apps/SearchFlowApp.tsx`

**Tests:**
- [ ] Write test: verify output format submenu choices
- [ ] Write test: verify YAML output generation (`yaml` package `stringify`)
- [ ] Implement
- [ ] Verify Green
- [ ] Lint/Type check

### Step 3: Use Default Citation Style from Config

Replace hardcoded "APA" with `config.citation.defaultStyle`.

**Changes:**
- Pass `defaultStyle` (from config) through to `SearchFlowApp` → action menu → `generateOutput`
- Update "Generate citation" label (remove "(APA)" — the default style is now config-driven)
- `generateOutput("cite-default", items)` uses `defaultStyle` from config

**Files:**
- `src/features/interactive/action-menu.ts`
- `src/features/interactive/apps/SearchFlowApp.tsx`
- `src/features/interactive/apps/runSearchFlow.ts`
- `src/cli/commands/search.ts` (`executeInteractiveSearch` — pass config)

**Tests:**
- [ ] Write test: verify default style is used from config
- [ ] Implement
- [ ] Verify Green
- [ ] Lint/Type check

### Step 4: Side-Effect Action Architecture

Extend `executeInteractiveSearch` to handle actions that perform operations rather than producing stdout output.

**Changes:**
- Extend `ActionMenuResult` (or `InteractiveSearchResult`) to carry `action` and `selectedItems` when the action is a side-effect type
- In `executeInteractiveSearch`, after `runSearchFlow` returns:
  - If output action: return `{ output }` as before
  - If side-effect action: execute the operation, return `{ output: "", cancelled: false }`
- Side-effect execution needs `context` and `config` (already available in `executeInteractiveSearch`)

**Files:**
- `src/cli/commands/search.ts`
- `src/features/interactive/apps/runSearchFlow.ts` (return type changes)
- `src/features/interactive/apps/SearchFlowApp.tsx` (return selected items for side-effect actions)

**Tests:**
- [ ] Write test: verify side-effect action type is returned with selectedItems
- [ ] Write test: verify executeInteractiveSearch handles side-effect results
- [ ] Implement
- [ ] Verify Green
- [ ] Lint/Type check

### Step 5: Implement Citation Key Action

Output citation key(s) using config-driven format. Uses `generateOutput("key-default")` from citation-key-format task.

**Files:**
- `src/features/interactive/action-menu.ts` (already handled by Step 4 of citation-key-format task)

**Tests:**
- [ ] Write test: verify citation key output in TUI format (pandoc `;` / latex `,`)
- [ ] Verify Green
- [ ] Lint/Type check

### Step 6: Implement Open URL Action

Single-entry only. Opens the reference's web page in browser.

**Changes:**
- In side-effect handler: call `resolveDefaultUrl()` from URL module, then `openWithSystemApp()` with the URL
- If no URL available: output error message to stderr

**Files:**
- `src/cli/commands/search.ts` (side-effect handler)

**Tests:**
- [ ] Write test: verify `resolveDefaultUrl` + `openWithSystemApp` is called
- [ ] Write test: verify error when no URL available
- [ ] Implement
- [ ] Verify Green
- [ ] Lint/Type check

### Step 7: Implement Open Fulltext Action

Single-entry only. Opens the fulltext file in the system viewer.

**Changes:**
- In side-effect handler: call `executeFulltextOpen()` with the selected item's ID
- Use `config.attachments.directory` for fulltext directory

**Files:**
- `src/cli/commands/search.ts` (side-effect handler)

**Tests:**
- [ ] Write test: verify `executeFulltextOpen` is called with correct options
- [ ] Implement
- [ ] Verify Green
- [ ] Lint/Type check

### Step 8: Implement Manage Attachments Action

Single-entry only. Opens the attachment directory and runs sync.

**Changes:**
- In side-effect handler: call `executeAttachOpen()` to open directory, then `runInteractiveMode()` for sync
- The `runInteractiveMode` from `attach.ts` handles: display naming convention → wait for Enter → sync

**Files:**
- `src/cli/commands/search.ts` (side-effect handler)

**Tests:**
- [ ] Write test: verify attach open + sync flow is called
- [ ] Implement
- [ ] Verify Green
- [ ] Lint/Type check

### Step 9: Implement Edit Action

Available for single and multiple entries. Opens editor with selected items.

**Changes:**
- In side-effect handler: call `executeEditCommand()` with selected item IDs
- Use `config.cli.edit.defaultFormat` for edit format
- Output edit result to stderr

**Files:**
- `src/cli/commands/search.ts` (side-effect handler)

**Tests:**
- [ ] Write test: verify `executeEditCommand` is called with correct identifiers
- [ ] Implement
- [ ] Verify Green
- [ ] Lint/Type check

### Step 10: Implement Remove Action

Available for single and multiple entries. Deletes with confirmation.

**Changes:**
- In side-effect handler: for each selected item, call confirmation + `executeRemove()`
- Use `config.attachments.directory` for fulltext directory
- Output results to stderr

**Files:**
- `src/cli/commands/search.ts` (side-effect handler)
- May need to extract/refactor confirmation logic from `src/cli/commands/remove.ts`

**Tests:**
- [ ] Write test: verify confirmation is prompted and `executeRemove` is called
- [ ] Write test: verify multiple items are removed sequentially
- [ ] Implement
- [ ] Verify Green
- [ ] Lint/Type check

## Manual Verification

**Script**: `test-fixtures/test-tui-action-menu.sh`

TTY-required tests (run manually in a terminal):
- [ ] `ref search -t` → select 1 entry → verify all 10 actions shown
- [ ] `ref search -t` → select 3 entries → verify 7 actions shown (no Open URL, Open fulltext, Manage attachments)
- [ ] Select 1 → Citation key → verify output matches config (Pandoc: `@id` / LaTeX: `\cite{id}`)
- [ ] Select 3 → Citation keys → verify multi-cite format (Pandoc: `@id1; @id2; @id3` / LaTeX: `\cite{id1,id2,id3}`)
- [ ] Select 1 → Generate citation → verify default style from config is used
- [ ] Select 1 → Output (choose format) → verify submenu with IDs, CSL-JSON, BibTeX, YAML
- [ ] Select 1 → Output → YAML → verify YAML output
- [ ] Select 1 → Open URL → verify browser opens DOI/PubMed page
- [ ] Select 1 → Open fulltext → verify PDF opens in system viewer
- [ ] Select 1 → Manage attachments → verify directory opens and sync prompt appears
- [ ] Select 1 → Edit reference → verify editor opens with reference data
- [ ] Select 1 → Remove → verify confirmation prompt and deletion
- [ ] Select 3 → Edit references → verify editor opens with all 3 items
- [ ] Select 3 → Remove → verify sequential confirmation and deletion
- [ ] Esc in action menu → returns to search
- [ ] Cancel in output format submenu → returns to action menu

## Completion Checklist

- [ ] All tests pass (`npm run test`)
- [ ] Lint passes (`npm run lint`)
- [ ] Type check passes (`npm run typecheck`)
- [ ] Build succeeds (`npm run build`)
- [ ] Manual verification completed
- [ ] Spec updated: `spec/features/interactive-search.md`
- [ ] CHANGELOG.md updated
- [ ] Move this file to `spec/tasks/completed/`
