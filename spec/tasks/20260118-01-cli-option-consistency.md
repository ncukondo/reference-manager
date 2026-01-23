# Task: CLI Option Consistency

## Purpose

Improve CLI option consistency by unifying input/output format options and short option conventions across all commands. This is a breaking change (acceptable in pre-release phase).

## References

- Spec: `spec/architecture/cli.md`
- Spec: `spec/features/add.md`
- Spec: `spec/features/search.md`
- Spec: `spec/features/citation.md`
- Spec: `spec/features/interactive-search.md`
- Spec: `spec/features/config-command.md`
- Related: `src/cli/index.ts`, `src/cli/commands/`

## Summary of Changes

### Short Option Conventions

| Short | Long | Meaning | Commands |
|-------|------|---------|----------|
| `-i` | `--input` | Input format | `add` |
| `-o` | `--output` | Output format | all |
| `-f` | `--force` | Skip confirmation | `add`, `remove`, `fulltext` |
| `-t` | `--tui` | TUI mode | `search` |
| `-n` | `--limit` | Result limit | `list`, `search` |

### Specific Changes

| Before | After | Commands |
|--------|-------|----------|
| `--format` (input) | `--input` / `-i` | `add` |
| `-f, --format` (output) | `--output` / `-o` | `export` |
| `--format` (output) | `--output` / `-o` | `cite` |
| `-f, --format` (edit format) | `--format` (no short) | `edit` |
| `-i, --interactive` | `-t, --tui` | `search` |
| `--uuid` (output mode) | `--uuid-only` | `list`, `search` |
| `--json` (config) | `--output json` / `-o json` | `config show` |
| `config list-keys` | `config keys` | `config` |
| `[cli.interactive]` | `[cli.tui]` | config |

## TDD Workflow

For each step:
1. Write failing test
2. Write minimal implementation to pass
3. Clean up, pass lint/typecheck, verify tests still pass

## Steps

### Step 1: Update add command (`--format` → `--input`)

- [ ] Update test: `src/cli/commands/add.test.ts` - change `--format` to `--input`
- [ ] Update: `src/cli/index.ts` - change option registration
- [ ] Update: `src/cli/commands/add.ts` - update option handling
- [ ] Verify: `npm run test:unit -- add`
- [ ] Lint/Type check: `npm run lint && npm run typecheck`

### Step 2: Update search command (`--interactive` → `--tui`)

- [ ] Update test: `src/cli/commands/search.test.ts`
- [ ] Update: `src/cli/index.ts` - change `-i, --interactive` to `-t, --tui`
- [ ] Update: `src/cli/commands/search.ts` - rename option
- [ ] Verify: `npm run test:unit -- search`
- [ ] Lint/Type check

### Step 3: Update list/search output options (`--uuid` → `--uuid-only`)

- [ ] Update test: `src/cli/commands/list.test.ts`
- [ ] Update test: `src/cli/commands/search.test.ts`
- [ ] Update: `src/cli/index.ts` - add `--uuid-only`, add `--output` option
- [ ] Update: `src/cli/commands/list.ts`
- [ ] Update: `src/cli/commands/search.ts`
- [ ] Verify: `npm run test:unit -- list search`
- [ ] Lint/Type check

### Step 4: Update export command (`-f, --format` → `-o, --output`)

- [ ] Update test: `src/cli/commands/export.test.ts`
- [ ] Update: `src/cli/index.ts`
- [ ] Update: `src/cli/commands/export.ts`
- [ ] Verify: `npm run test:unit -- export`
- [ ] Lint/Type check

### Step 5: Update cite command (`--format` → `-o, --output`)

- [ ] Update test: `src/cli/commands/cite.test.ts`
- [ ] Update: `src/cli/index.ts`
- [ ] Update: `src/cli/commands/cite.ts`
- [ ] Verify: `npm run test:unit -- cite`
- [ ] Lint/Type check

### Step 6: Update edit command (remove `-f` short option for `--format`)

- [ ] Update test: `src/cli/commands/edit.test.ts`
- [ ] Update: `src/cli/index.ts` - remove `-f` from `--format`
- [ ] Verify: `npm run test:unit -- edit`
- [ ] Lint/Type check

### Step 7: Update config command

- [ ] Update test: `src/cli/commands/config.test.ts`
  - Rename `list-keys` to `keys`
  - Change `--json` to `--output json`
- [ ] Update: `src/cli/commands/config.ts`
- [ ] Update: `src/features/config/list-keys.ts` (if filename needs change)
- [ ] Verify: `npm run test:unit -- config`
- [ ] Lint/Type check

### Step 8: Update config schema (`cli.interactive` → `cli.tui`)

- [ ] Update: `src/config/schema.ts` - rename `interactive` to `tui`
- [ ] Update: `src/config/defaults.ts`
- [ ] Update: any references in `src/features/interactive/`
- [ ] Update tests that reference `cli.interactive`
- [ ] Verify: `npm run test:unit`
- [ ] Lint/Type check

### Step 9: Update shell completion

- [ ] Update: `src/cli/completion.ts` - update option definitions
- [ ] Verify shell completion still works

### Step 10: Integration testing

- [ ] Run full test suite: `npm run test`
- [ ] Manual verification of key commands:
  - `ref add -i bibtex file.bib`
  - `ref search -t`
  - `ref list --uuid-only`
  - `ref export -o yaml`
  - `ref cite -o html`
  - `ref config show -o json`
  - `ref config keys`

## Completion Checklist

- [ ] All tests pass (`npm run test`)
- [ ] Lint passes (`npm run lint`)
- [ ] Type check passes (`npm run typecheck`)
- [ ] Build succeeds (`npm run build`)
- [ ] Manual verification completed
- [ ] CHANGELOG.md updated
- [ ] Move this file to `spec/tasks/completed/`
