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

- [x] All tests pass (`npm run test`)
- [x] Lint passes (`npm run lint`)
- [x] Type check passes (`npm run typecheck`)
- [x] Build succeeds (`npm run build`)
- [ ] Manual verification (TTY required)
- [x] Spec verified: `spec/features/interactive-search.md` (already up to date)
- [x] CHANGELOG.md updated
- [ ] Move this file to `spec/tasks/completed/`
