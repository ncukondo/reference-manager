# Task: Interactive ID Selection

## Purpose

Enable interactive reference selection when commands are invoked without ID arguments in TTY environment, improving UX by reducing the need to know exact citation keys.

## References

- Spec: `spec/features/interactive-id-selection.md`
- Related: `src/features/interactive/`, `src/cli/commands/`

## TDD Workflow

For each step:
1. Write failing test
2. Write minimal implementation to pass
3. Clean up, pass lint/typecheck, verify tests still pass

## Steps

### Step 1: Create shared reference selection utility

- [x] Write test: `src/features/interactive/reference-select.test.ts`
- [x] Implement: `src/features/interactive/reference-select.ts`
  - `runReferenceSelect()` function
  - Support both single and multi-select modes
  - Reuse `runSearchPrompt` from existing interactive search
- [x] Verify: `npm run test:unit`
- [x] Lint/Type check: `npm run lint && npm run typecheck`

### Step 2: Create style selection prompt for cite

- [ ] Write test: `src/features/interactive/style-select.test.ts`
- [ ] Implement: `src/features/interactive/style-select.ts`
  - `runStyleSelect()` function
  - List built-in styles from `BUILTIN_STYLES`
  - List custom styles from `csl_directory` (glob `*.csl`)
  - Show default style first with `(default)` marker
- [ ] Verify: `npm run test:unit`
- [ ] Lint/Type check: `npm run lint && npm run typecheck`

### Step 3: Update cite command

- [ ] Write test: `src/cli/commands/cite.test.ts` (add interactive mode tests)
- [ ] Implement: Update `src/cli/index.ts` and `src/cli/commands/cite.ts`
  - Change argument from `<id-or-uuid...>` to `[id-or-uuid...]`
  - Add interactive mode when no IDs provided in TTY
  - Integrate style selection when `--style` not specified
- [ ] Verify: `npm run test:unit`
- [ ] Lint/Type check: `npm run lint && npm run typecheck`

### Step 4: Update edit command

- [ ] Write test: `src/cli/commands/edit.test.ts` (add interactive mode tests)
- [ ] Implement: Update `src/cli/index.ts` and `src/cli/commands/edit.ts`
  - Change argument from `<identifier...>` to `[identifier...]`
  - Add interactive mode when no IDs provided in TTY
- [ ] Verify: `npm run test:unit`
- [ ] Lint/Type check: `npm run lint && npm run typecheck`

### Step 5: Update remove command

- [ ] Write test: `src/cli/commands/remove.test.ts` (add interactive mode tests)
- [ ] Implement: Update `src/cli/index.ts` and `src/cli/commands/remove.ts`
  - Support optional ID with interactive fallback
- [ ] Verify: `npm run test:unit`
- [ ] Lint/Type check: `npm run lint && npm run typecheck`

### Step 6: Update update command

- [ ] Write test: `src/cli/commands/update.test.ts` (add interactive mode tests)
- [ ] Implement: Update `src/cli/index.ts` and `src/cli/commands/update.ts`
  - Change argument from `<identifier>` to `[identifier]`
  - Add single-select interactive mode when no ID provided in TTY
- [ ] Verify: `npm run test:unit`
- [ ] Lint/Type check: `npm run lint && npm run typecheck`

### Step 7: Update fulltext subcommands

- [ ] Write test: `src/cli/commands/fulltext.test.ts` (add interactive mode tests)
- [ ] Implement: Update `src/cli/index.ts`
  - `fulltext attach`: Change to `[identifier]`, add interactive mode
  - `fulltext get`: Change to `[identifier]`, add interactive mode
  - `fulltext detach`: Change to `[identifier]`, add interactive mode
  - `fulltext open`: Update existing optional handling to use interactive mode
  - All use single-select mode
- [ ] Verify: `npm run test:unit`
- [ ] Lint/Type check: `npm run lint && npm run typecheck`

### Step 8: E2E tests

- [ ] Write E2E tests: `src/cli/interactive-id-selection.e2e.test.ts`
  - Test cite with interactive selection
  - Test edit with interactive selection
  - Test fulltext open with interactive selection
  - Test style selection for cite
- [ ] Verify: `npm run test:e2e`

### Step 9: Build and prepare for manual testing

- [ ] Run full test suite: `npm run test`
- [ ] Run lint: `npm run lint`
- [ ] Run typecheck: `npm run typecheck`
- [ ] Build: `npm run build`
- [ ] Create test data (see Manual Testing section below)

## Manual Testing

### Test Data Setup

Create a test library with sample references:

```bash
# Create temporary test directory
export TEST_DIR=$(mktemp -d)
export REF_LIBRARY="$TEST_DIR/library.json"

# Add sample references for testing
ref add --pmid 12345678
ref add --doi "10.1038/nature12373"
ref add --isbn "978-0-13-468599-1"

# Create CSL directory with custom style (optional)
mkdir -p "$TEST_DIR/styles"
# Copy a custom CSL file if available
```

### Manual Verification Checklist

Test each command in TTY environment:

#### cite command
- [ ] `ref cite` → Opens interactive search
- [ ] Search and select multiple references → Style selection appears
- [ ] Select style → Citations are output
- [ ] `ref cite --style apa` (no ID) → Skips style selection, uses APA
- [ ] `ref cite smith2020` → Works as before (no interactive mode)

#### edit command
- [ ] `ref edit` → Opens interactive search
- [ ] Search and select references → Opens editor with selected references
- [ ] `ref edit smith2020` → Works as before (no interactive mode)

#### remove command
- [ ] `ref remove` → Opens interactive search
- [ ] Search and select references → Shows confirmation prompt
- [ ] Confirm → References are removed
- [ ] `ref remove smith2020` → Works as before (no interactive mode)

#### update command
- [ ] `ref update` → Opens interactive search (single-select)
- [ ] Select one reference → Continues to update flow
- [ ] `ref update smith2020` → Works as before (no interactive mode)

#### fulltext commands
- [ ] `ref fulltext open` → Opens interactive search (single-select)
- [ ] Select reference → Opens associated file
- [ ] `ref fulltext attach` → Opens interactive search (single-select)
- [ ] `ref fulltext get` → Opens interactive search (single-select)
- [ ] `ref fulltext detach` → Opens interactive search (single-select)

#### Style selection (cite)
- [ ] Built-in styles shown: apa, vancouver, harvard
- [ ] Default style marked with `(default)` and shown first
- [ ] Custom styles from `csl_directory` are listed (if configured)

#### Non-TTY behavior
- [ ] `echo "" | ref cite` → Error: identifier required
- [ ] `ref cite > output.txt` → Error: identifier required (stdin not TTY)

### Cleanup

```bash
rm -rf "$TEST_DIR"
unset TEST_DIR REF_LIBRARY
```

## Completion Checklist

- [ ] All tests pass (`npm run test`)
- [ ] Lint passes (`npm run lint`)
- [ ] Type check passes (`npm run typecheck`)
- [ ] Build succeeds (`npm run build`)
- [ ] Manual verification completed (all items above checked)
- [ ] CHANGELOG.md updated
- [ ] Move this file to `spec/tasks/completed/`
