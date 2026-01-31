# Task: Citation Key Output Format

## Purpose

Add Pandoc and LaTeX citation key output formats to `list`/`search` commands, with a
configurable default for the `--key` convenience flag and TUI action menu.

Researchers frequently need citation keys in format-specific syntax:
- Pandoc: `@smith2023`
- LaTeX: `\cite{smith2023}`

## References

- Spec: `spec/architecture/cli.md` (output formats)
- Spec: `spec/features/interactive-search.md` (action menu)
- Format module: `src/features/format/items.ts` (`ItemFormat`, `formatItems`)
- Search command: `src/cli/commands/search.ts` (`getOutputFormat`, `SearchCommandOptions`)
- List command: `src/cli/commands/list.ts`
- Config schema: `src/config/`
- Action menu: `src/features/interactive/action-menu.ts` (`generateOutput`)

## Design Decisions

### Output Formats

| Format | Single item | Multiple items (CLI, `\n` separated) | Multiple items (TUI) |
|--------|-------------|--------------------------------------|----------------------|
| `pandoc-key` | `@smith2023` | `@smith2023\n@jones2024` | `@smith2023; @jones2024` |
| `latex-key` | `\cite{smith2023}` | `\cite{smith2023}\n\cite{jones2024}` | `\cite{smith2023,jones2024}` |

CLI outputs one item per line (composable). TUI outputs in format-native multi-cite syntax.

### CLI Interface

```bash
ref search "smith" --output pandoc-key   # explicit pandoc
ref search "smith" --output latex-key    # explicit latex
ref search "smith" --key                 # uses citation.default_key_format
ref list --key                           # same for list
```

### Configuration

```toml
[citation]
default_key_format = "pandoc"   # "pandoc" | "latex"
```

### TUI Action Menu Label

Dynamic label based on `citation.default_key_format`:
- `"pandoc"` → `Citation key (Pandoc)`
- `"latex"` → `Citation key (LaTeX)`

## TDD Workflow

For each step, follow the Red-Green-Refactor cycle (see `spec/guidelines/testing.md`).

## Steps

### Step 1: Extend ItemFormat and formatItems

Add `pandoc-key` and `latex-key` to the format module.

**Changes:**
- Add `"pandoc-key" | "latex-key"` to `ItemFormat` type
- Add cases in `formatItems`:
  - `pandoc-key`: `items.map(item => "@" + item.id)`
  - `latex-key`: `items.map(item => "\\cite{" + item.id + "}")`

**Files:**
- `src/features/format/items.ts`

**Tests:**
- [ ] Write test: `src/features/format/items.test.ts` — `formatItems` returns correct pandoc-key and latex-key formats
- [ ] Implement
- [ ] Verify Green
- [ ] Lint/Type check

### Step 2: Add --key flag and --output values to search/list commands

**Changes:**
- Add `"pandoc-key" | "latex-key"` to `SearchCommandOptions.output` union
- Add `key?: boolean` to `SearchCommandOptions`
- Update `getOutputFormat`: when `options.key`, resolve via config `citation.default_key_format`
- Register `--key` flag and new `--output` choices in Commander setup
- Same changes for list command

**Files:**
- `src/cli/commands/search.ts`
- `src/cli/commands/list.ts`
- `src/cli/index.ts` (Commander option registration)

**Tests:**
- [ ] Write test: `getOutputFormat` resolves `--key` flag using config
- [ ] Write test: `formatSearchOutput` works with pandoc-key/latex-key formats
- [ ] Implement
- [ ] Verify Green
- [ ] Lint/Type check

### Step 3: Add citation.default_key_format config

**Changes:**
- Add `default_key_format` to citation config schema (default: `"pandoc"`)
- Update config validation (Zod schema)
- Register in config keys list

**Files:**
- `src/config/` (schema, defaults)

**Tests:**
- [ ] Write test: config schema accepts `default_key_format` with valid values
- [ ] Write test: config defaults to `"pandoc"`
- [ ] Implement
- [ ] Verify Green
- [ ] Lint/Type check

### Step 4: Add citation key to TUI action menu generateOutput

**Changes:**
- Add `"key-default"` to `ActionType`
- Add case in `generateOutput`:
  - pandoc: `items.map(i => "@" + i.id).join("; ")`
  - latex: `"\\cite{" + items.map(i => i.id).join(",") + "}"`
- Pass `defaultKeyFormat` from config through to `generateOutput`

**Files:**
- `src/features/interactive/action-menu.ts`

**Tests:**
- [ ] Write test: `generateOutput("key-default", items)` with pandoc config returns `@id1; @id2`
- [ ] Write test: `generateOutput("key-default", items)` with latex config returns `\cite{id1,id2}`
- [ ] Implement
- [ ] Verify Green
- [ ] Lint/Type check

## Manual Verification

**Script**: `test-fixtures/test-citation-key-format.sh`

Non-TTY tests (automated):
- [ ] `ref search "test" --output pandoc-key` outputs `@id` per line
- [ ] `ref search "test" --output latex-key` outputs `\cite{id}` per line
- [ ] `ref list --key` uses config default

## Completion Checklist

- [ ] All tests pass (`npm run test`)
- [ ] Lint passes (`npm run lint`)
- [ ] Type check passes (`npm run typecheck`)
- [ ] Build succeeds (`npm run build`)
- [ ] Spec updated: `spec/architecture/cli.md` (output formats)
- [ ] CHANGELOG.md updated
- [ ] Move this file to `spec/tasks/completed/`
