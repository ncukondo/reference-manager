# Task: Unify Attachments Directory Configuration

## Purpose

Remove the dead `[fulltext]` config section and unify all attachment/fulltext directory configuration under `[attachments]`. Add `--attachments-dir` CLI global option for runtime override. This eliminates the current inconsistency where `config show` displays `fulltext.directory` but all operations use `attachments.directory`.

Pre-release phase: no backward compatibility needed.

## Background

The `fulltext` command is a shorthand for `attach --role fulltext`. Since Phase 25 (Attachments Architecture), all fulltext operations internally use `config.attachments.directory`. However, the `[fulltext]` config section remains as dead code:

- `config show` displays `fulltext.directory` (not actually used by any operation)
- `config set` only supports `fulltext.directory` (not `attachments.directory`)
- `config init` template generates `[fulltext]` section (not `[attachments]`)
- No CLI global option exists for overriding the attachments directory

## References

- Spec: `spec/features/config-command.md`, `spec/architecture/cli.md`
- Related: `src/config/schema.ts`, `src/config/defaults.ts`, `src/config/loader.ts`
- Related: `src/config/key-parser.ts`, `src/config/toml-writer.ts`
- Related: `src/cli/helpers.ts`, `src/cli/index.ts`
- Related: `src/features/config/show.ts`

## TDD Workflow

For each step, follow the Red-Green-Refactor cycle (see `spec/guidelines/testing.md`).

## Steps

### Step 1: Remove `[fulltext]` config section

Remove the fulltext config section from schema, defaults, and loader. All consumers already use `config.attachments.directory`.

**Files to modify:**

1. `src/config/schema.ts`:
   - Remove `fulltextConfigSchema` constant
   - Remove `fulltext` from `configSchema`
   - Remove `fulltext` from `partialConfigSchema`
   - Remove `FulltextConfig` type export
   - Remove `fulltext` from `DeepPartialConfig`
   - Remove `normalizeFulltextConfig` function
   - Remove `fulltext` from `sectionNormalizers`

2. `src/config/defaults.ts`:
   - Remove `getDefaultFulltextDirectory()` function
   - Remove `fulltext` property from `defaultConfig`

3. `src/config/loader.ts`:
   - Remove `fillFulltextDefaults()` function
   - Remove `fulltext` from config assembly in `buildConfig` (or equivalent)
   - Remove `"fulltext"` from `SECTION_KEYS` array

- [x] Update `schema.ts`
- [x] Update `defaults.ts`
- [x] Update `loader.ts`
- [x] Update tests: `src/config/loader.test.ts` (remove fulltext-specific tests)
- [x] Update tests: `src/config/defaults.test.ts` (remove `getDefaultFulltextDirectory` tests)
- [x] Update `show.ts` (also fixed `config.fulltext` → `config.attachments` for compilation)
- [x] Update `show.test.ts` (updated mock config and assertions)
- [x] Fixed bug: added `attachments` to `mergeConfigs` sectionKeys (was missing)
- [x] Verify Green: `npm run test:unit -- src/config/`
- [x] Lint/Type check: `npm run lint && npm run typecheck`

### Step 2: Add `--attachments-dir` CLI global option

Add `--attachments-dir <path>` global option following the `--backup-dir` pattern.

**Files to modify:**

1. `src/cli/index.ts`:
   - Add `.option("--attachments-dir <path>", "Override attachments directory")` after `--backup-dir`

2. `src/cli/helpers.ts`:
   - Add `attachmentsDir?: string` to `CliOptions` interface
   - Add attachments override logic to `loadConfigWithOverrides`:
     ```
     if (options.attachmentsDir) {
       overrides.attachments = {
         ...config.attachments,
         directory: options.attachmentsDir,
       };
     }
     ```

- [x] Write test: `src/cli/helpers.test.ts` (add test for `--attachments-dir` override)
- [x] Implement: Update `helpers.ts` and `index.ts`
- [x] Verify Green: `npm run test:unit -- src/cli/helpers`
- [x] Lint/Type check: `npm run lint && npm run typecheck`

### Step 3: Fix `config` command UI (show/set/init)

Update user-facing config tools to use `attachments.directory` instead of `fulltext.directory`.

**Files to modify:**

1. `src/features/config/show.ts` (`toSnakeCaseConfig`):
   - Replace `result.fulltext = { directory: config.fulltext.directory }` with
     `result.attachments = { directory: config.attachments.directory }`

2. `src/config/key-parser.ts`:
   - Replace `{ key: "fulltext.directory", ... }` with
     `{ key: "attachments.directory", type: "string", description: "Attachments storage directory" }`

3. `src/config/toml-writer.ts`:
   - Replace `[fulltext]` template section with `[attachments]` section
   - Update comment: `# directory = "~/.local/share/reference-manager/attachments"`

- [x] Update `show.ts` (done in Step 1)
- [x] Update `key-parser.ts`
- [x] Update `toml-writer.ts`
- [x] Update `edit.ts` (config init template)
- [x] Update tests: `src/features/config/show.test.ts` (done in Step 1)
- [x] Update tests: `src/config/key-parser.test.ts` (no fulltext references)
- [x] Update tests: `src/config/toml-writer.test.ts`
- [x] Verify Green: `npm run test:unit -- show.test key-parser.test toml-writer.test`
- [x] Lint/Type check: `npm run lint && npm run typecheck`

### Step 4: Update specs and documentation

Update specification documents and READMEs to reflect the unified configuration.

**Files to modify:**

1. `spec/features/config-command.md`:
   - Replace `fulltext.directory` → `attachments.directory` in config key tables
   - Remove `REFERENCE_MANAGER_FULLTEXT_DIR` from environment variable table
   - Update `[fulltext]` config example → `[attachments]`

2. `spec/architecture/cli.md`:
   - Add `--attachments-dir` to global options table
   - Update directory table: `Fulltext | {data}/fulltext/` → `Attachments | {data}/attachments/`

3. `README.md`:
   - Replace `[fulltext]` config section example with `[attachments]`
   - Update `fulltext.*` config reference to `attachments.*`

4. `README_ja.md`:
   - Same changes as README.md

- [x] Update `spec/features/config-command.md`
- [x] Update `spec/architecture/cli.md`
- [x] Update `README.md`
- [x] Update `README_ja.md`

## Manual Verification

After implementation, verify the following:

Non-TTY tests (automated):
- [x] `ref config show` displays `[attachments]` section (not `[fulltext]`)
- [x] `ref config get attachments.directory` returns correct path
- [x] `ref config set attachments.directory /tmp/test` updates config
- [x] `ref --attachments-dir /tmp/test fulltext get <id>` uses override path
- [x] `REFERENCE_MANAGER_ATTACHMENTS_DIR=/tmp/test ref config show` shows override

## Completion Checklist

- [x] All tests pass (`npm run test`)
- [x] Lint passes (`npm run lint`)
- [x] Type check passes (`npm run typecheck`)
- [x] Build succeeds (`npm run build`)
- [x] CHANGELOG.md updated
- [ ] Move this file to `spec/tasks/completed/`
