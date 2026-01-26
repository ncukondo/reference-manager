# Task: React Ink Migration

## Purpose

Replace Enquirer with React Ink for all interactive TUI components. Enquirer has unfixed bugs and inactive maintenance, while React Ink provides a declarative UI model with active development.

## References

- ADR: `spec/decisions/ADR-014-use-react-ink-for-tui.md`
- Superseded ADR: `spec/decisions/ADR-012-use-enquirer-for-interactive-prompts.md`
- Spec: `spec/features/interactive-search.md`
- Spec: `spec/features/interactive-id-selection.md`
- Prototype: `src/features/interactive-ink/`
- Demo: `npm run demo:ink`

## Migration Strategy

1. Develop React Ink components in `src/features/interactive-ink/` (prototype phase)
2. Migrate implementation to `src/features/interactive/` (production)
3. Update demo to use `src/features/interactive/`
4. Delete `src/features/interactive-ink/` directory after migration
5. Remove Enquirer dependency

**Important**: The final implementation lives in `src/features/interactive/`, not `interactive-ink/`.

## TDD Workflow

For each step, follow the Red-Green-Refactor cycle (see `spec/guidelines/testing.md`):

1. **Write test**: Create test file with comprehensive test cases
2. **Create stub**: Create implementation file with empty functions (`throw new Error("Not implemented")`)
3. **Verify Red**: Run tests, confirm they fail with "Not implemented"
4. **Implement**: Write actual logic until tests pass (Green)
5. **Refactor**: Clean up code while keeping tests green
6. **Quality checks**: Pass lint/typecheck

## Testing Policy

**Critical**: When e2e tests or manual tests reveal bugs:

1. **Investigate root cause**: Do not dismiss failures as "flaky" without proof
2. **Fix the implementation**: The bug is in the code, not the test
3. **Never delete tests** to make failures go away
4. **Never modify expected values** to match incorrect behavior
5. **Add regression tests** for bugs found during manual testing

Unit tests alone cannot catch all TUI interaction bugs. E2E and manual testing are essential.

## Steps

### Step 1: Finalize Core Components ✅

The prototype components are already implemented in `src/features/interactive-ink/`.

- [x] Review and finalize `SearchableMultiSelect` component
- [x] Review and finalize `Select` component
- [x] Add unit tests for components (if feasible with Ink)
- [x] Lint/Type check: `npm run lint && npm run typecheck`

### Step 2: Create Integration Layer ✅

Create a unified API that mirrors the existing interactive module.

- [x] Create `src/features/interactive-ink/reference-select.ts`
  - Export `runReferenceSelect(options)` function
  - Match interface from `spec/features/interactive-id-selection.md`
- [x] Create `src/features/interactive-ink/style-select.ts`
  - Export `runStyleSelect(options)` function
  - Support built-in and custom CSL styles
- [x] Lint/Type check: `npm run lint && npm run typecheck`

Note: Integration layer is implemented directly in `src/features/interactive/` as part of Step 3.

### Step 3: Migrate to `src/features/interactive/` ✅

Move React Ink implementation to replace Enquirer-based code.

- [x] Replace Enquirer components in `src/features/interactive/` with React Ink components
  - `search-prompt.ts` now uses React Ink `SearchableMultiSelect`
  - `style-select.ts` now uses React Ink `Select`
  - `action-menu.ts` now uses React Ink `Select`
- [x] Update `src/features/interactive/reference-select.ts` to use React Ink (unchanged, uses runSearchPrompt)
- [x] Update `src/features/interactive/style-select.ts` to use React Ink
- [x] Ensure all exports work correctly (no index.ts, individual imports used)
- [x] Lint/Type check: `npm run lint && npm run typecheck`
- [x] All unit tests pass

### Step 4: Migrate Interactive Search Command ✅

Replace Enquirer usage in `search -t` / `search --tui` command.

- [x] Update `src/cli/commands/search.ts` to use React Ink components from `src/features/interactive/`
  - Already imports from `src/features/interactive/search-prompt.js` and `action-menu.js`
  - These modules now use React Ink internally
- [ ] Verify all features work (manual testing):
  - Real-time search filtering
  - Multi-select with Tab
  - Sort options (Ctrl+S)
  - Scroll indicators
  - Action menu after selection
- [x] Lint/Type check: `npm run lint && npm run typecheck`

### Step 5: Migrate ID Selection Fallback ✅

Update ID-less command invocations to use new implementation.

- [x] All commands already import from `src/features/interactive/`:
  - `cite.ts` → `reference-select.js`, `style-select.js`
  - `edit.ts` → `reference-select.js`
  - `remove.ts` → `reference-select.js`
  - `update.ts` → `reference-select.js`
  - `fulltext.ts` → `reference-select.js`
  - `attach.ts` → `reference-select.js`
- [ ] Verify commands work without arguments (manual testing):
  - `ref cite` (multi-select + style selection)
  - `ref edit` (multi-select)
  - `ref remove` (multi-select + confirmation)
  - `ref update` (single-select)
  - `ref fulltext open` (single-select)
- [x] Lint/Type check: `npm run lint && npm run typecheck`

### Step 6: E2E and Manual Testing ✅

Comprehensive testing to catch bugs that unit tests miss.

**E2E Tests**:
- [x] Add/update e2e tests for `search -t` command (existing tests work with React Ink)
- [x] Add/update e2e tests for ID-less command invocations (existing tests work)
- [x] Run full e2e test suite: `npm run test:e2e` - all 2629 tests passed
- [x] Fixed: E2E test CLI path updated from `bin/reference-manager.js` to `bin/cli.js`
- [x] Fixed: Vite config updated to externalize `ink`, `react`, `node:buffer`

**Manual Testing Checklist**:
- [ ] `ref search -t` with various queries
- [ ] Keyboard navigation (arrows, Page Up/Down, Ctrl+A, Ctrl+E)
- [ ] Selection (Tab to toggle, Enter to confirm)
- [ ] Sort menu (Ctrl+S)
- [ ] Cancel (Esc)
- [ ] `ref cite` without arguments
- [ ] `ref edit` without arguments
- [ ] `ref remove` without arguments
- [ ] `ref update` without arguments
- [ ] `ref fulltext open` without arguments
- [ ] Terminal resize handling
- [ ] Large dataset (100+ items) scrolling
- [ ] **If bugs found**: Create regression test, then fix implementation

### Step 7: Cleanup ✅

Remove prototype directory and Enquirer dependency.

- [x] Move components from `src/features/interactive-ink/components/` to `src/features/interactive/components/`
- [x] Update import paths in search-prompt.ts, style-select.ts, action-menu.ts
- [x] Delete `src/features/interactive-ink/` directory
- [x] Remove demo:ink script from package.json (demo removed with interactive-ink)
- [x] Remove `enquirer` from `package.json` dependencies
- [x] Replace Enquirer Confirm prompt in helpers.ts with readline-based implementation
- [x] Remove enquirer from vite.config.ts externals
- [x] Remove enquirer.d.ts type declaration
- [x] Verify build: `npm run build` ✓
- [x] Run all tests: `npm run test:unit` ✓, `npm run test:e2e` ✓ (2629 tests passed)
- [x] Lint/Type check: `npm run lint && npm run typecheck` ✓

### Step 8: Update Documentation

- [ ] Update README.md if it mentions Enquirer
- [ ] Update demo script path in package.json (`demo:ink` → use interactive/)
- [ ] Verify all spec files reference React Ink (already done in ADR-014)

## Session Handoff (2026-01-26 Session 2)

### Completed This Session
- **ADR-015**: Created `spec/decisions/ADR-015-react-ink-single-app-pattern.md`
  - Documents "1 Flow = 1 App = 1 render()" principle
  - Explains why multiple render() calls cause screen clearing issues
- **SearchFlowApp**: Created `src/features/interactive/apps/SearchFlowApp.tsx`
  - Single App component for `search -t` flow
  - Manages state transitions: search → action → style → exiting
  - Uses React state management instead of multiple render() calls
- **runSearchFlow**: Created `src/features/interactive/apps/runSearchFlow.ts`
  - Runner function that calls render() once
- **Fixed**: Screen transition from search to action menu works correctly
- **Fixed**: Action menu clears when selecting an option (using "exiting" state with empty Box)
- **Fixed**: reservedLines calculation (5 → 10) for proper header display

### Remaining Issue
**Terminal history not restored after Ink exit**
- After exiting the Ink app, previous terminal commands are not restored
- In the original demo (`feature/interactive-ink`), this worked correctly
- The demo displayed results inside Ink component with "Press any key to exit"
- Current implementation exits Ink and writes to stdout externally

**Investigation needed**:
- Compare demo's App.tsx behavior (git show 5bfc395:src/features/interactive-ink/App.tsx)
- Demo used `setState("result")` to show output inside Ink before exit
- May need to investigate Ink's alternate screen buffer behavior

### Pending Work
1. **Fix terminal history restoration** - investigate demo's approach
2. **Apply Single App Pattern to `cite` command** - similar to SearchFlowApp
3. **Manual testing** for all interactive commands
4. **Step 8**: Documentation updates
5. **Run tests**: unit, e2e, lint, typecheck

### Test Environment
```bash
export REFERENCE_MANAGER_LIBRARY=/tmp/ref-manual-test/references.json
alias ref="node /workspaces/reference-manager/bin/cli.js"
ref search -t
```

### Key Files Modified
- `src/features/interactive/apps/SearchFlowApp.tsx` (new)
- `src/features/interactive/apps/runSearchFlow.ts` (new)
- `src/features/interactive/apps/index.ts` (new)
- `src/cli/commands/search.ts` (uses runSearchFlow)
- `src/features/interactive/components/SearchableMultiSelect.tsx` (removed exit())
- `src/features/interactive/components/Select.tsx` (removed exit())
- `src/features/interactive/action-menu.ts` (exported generateOutput)
- `src/features/interactive/search-prompt.ts` (reservedLines fix)
- `spec/decisions/ADR-015-react-ink-single-app-pattern.md` (new)

## Completion Checklist

- [ ] All unit tests pass (`npm run test:unit`)
- [ ] All e2e tests pass (`npm run test:e2e`)
- [ ] Lint passes (`npm run lint`)
- [ ] Type check passes (`npm run typecheck`)
- [ ] Build succeeds (`npm run build`)
- [ ] Manual verification of all interactive commands
- [ ] `src/features/interactive-ink/` directory deleted
- [ ] Enquirer removed from dependencies
- [ ] Demo uses `src/features/interactive/`
- [ ] CHANGELOG.md updated
- [ ] Move this file to `spec/tasks/completed/`
