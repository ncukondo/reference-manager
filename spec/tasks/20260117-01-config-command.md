# Task: Config Command

## Purpose

Add `config` command to view and modify configuration settings via CLI. Enables users to manage configuration without manually editing TOML files, with validation and environment variable override warnings.

## References

- Spec: `spec/features/config-command.md`
- Related: `src/config/`, `src/cli/`

## TDD Workflow

For each step:
1. Write failing test
2. Write minimal implementation to pass
3. Clean up, pass lint/typecheck, verify tests still pass

## Steps

### Step 1: TOML writer utility

- [x] Write test: `src/config/toml-writer.test.ts`
  - Test writing simple key-value pairs
  - Test writing nested sections
  - Test preserving existing content
  - Test creating new file with template
  - Test updating existing values
- [x] Implement: `src/config/toml-writer.ts`
- [x] Verify: `npm run test:unit`
- [x] Lint/Type check: `npm run lint && npm run typecheck`

### Step 2: Config key parser

- [x] Write test: `src/config/key-parser.test.ts`
  - Test parsing simple keys (`library`, `log_level`)
  - Test parsing nested keys (`citation.default_style`)
  - Test parsing deeply nested keys (`cli.interactive.limit`)
  - Test invalid key detection
  - Test key existence validation against schema
- [x] Implement: `src/config/key-parser.ts`
- [x] Verify: `npm run test:unit`
- [x] Lint/Type check: `npm run lint && npm run typecheck`

### Step 3: Config value validator

- [x] Write test: `src/config/value-validator.test.ts`
  - Test string validation
  - Test number validation (integer, non-negative)
  - Test boolean validation
  - Test enum validation (log_level, sort, order, format)
  - Test array validation (csl_directory)
  - Test error message formatting
- [x] Implement: `src/config/value-validator.ts`
- [x] Verify: `npm run test:unit`
- [x] Lint/Type check: `npm run lint && npm run typecheck`

### Step 4: Environment variable override detector

- [x] Write test: `src/config/env-override.test.ts`
  - Test detecting REFERENCE_MANAGER_LIBRARY override
  - Test detecting PUBMED_EMAIL override
  - Test detecting PUBMED_API_KEY override
  - Test detecting REFERENCE_MANAGER_FULLTEXT_DIR override
  - Test detecting REFERENCE_MANAGER_CLI_DEFAULT_LIMIT override
  - Test detecting REFERENCE_MANAGER_MCP_DEFAULT_LIMIT override
  - Test returning null when no override
- [x] Implement: `src/config/env-override.ts`
- [x] Verify: `npm run test:unit`
- [x] Lint/Type check: `npm run lint && npm run typecheck`

### Step 5: Config show subcommand

- [x] Write test: `src/features/config/show.test.ts`
  - Test TOML output format
  - Test JSON output format (--json)
  - Test section filter (--section)
  - Test source annotation (--sources)
  - Test environment override annotation
- [x] Implement: `src/features/config/show.ts`
- [x] Verify: `npm run test:unit`
- [x] Lint/Type check: `npm run lint && npm run typecheck`

### Step 6: Config get subcommand

- [x] Write test: `src/features/config/get.test.ts`
  - Test getting simple value
  - Test getting nested value
  - Test getting deeply nested value
  - Test --config-only flag (ignore env override)
  - Test exit code 1 for missing key
  - Test exit code 1 for unset value
- [x] Implement: `src/features/config/get.ts`
- [x] Verify: `npm run test:unit`
- [x] Lint/Type check: `npm run lint && npm run typecheck`

### Step 7: Config set subcommand

- [x] Write test: `src/features/config/set.test.ts`
  - Test setting string value
  - Test setting number value
  - Test setting boolean value
  - Test setting array value (comma-separated)
  - Test --local flag (write to current dir config)
  - Test validation error handling
  - Test environment override warning
  - Test creating config file if not exists
- [x] Implement: `src/features/config/set.ts`
- [x] Verify: `npm run test:unit`
- [x] Lint/Type check: `npm run lint && npm run typecheck`

### Step 8: Config unset subcommand

- [x] Write test: `src/features/config/unset.test.ts`
  - Test removing simple key
  - Test removing nested key
  - Test --local flag
  - Test no error when key not in file
- [x] Implement: `src/features/config/unset.ts`
- [x] Verify: `npm run test:unit`
- [x] Lint/Type check: `npm run lint && npm run typecheck`

### Step 9: Config list-keys subcommand

- [x] Write test: `src/features/config/list-keys.test.ts`
  - Test listing all keys with types
  - Test --section filter
  - Test output format (key, type, description)
- [x] Implement: `src/features/config/list-keys.ts`
- [x] Verify: `npm run test:unit`
- [x] Lint/Type check: `npm run lint && npm run typecheck`

### Step 10: Config path subcommand

- [x] Write test: `src/features/config/path.test.ts`
  - Test showing all paths with existence status
  - Test --user flag
  - Test --local flag
  - Test showing REFERENCE_MANAGER_CONFIG env path
- [x] Implement: `src/features/config/path.ts`
- [x] Verify: `npm run test:unit`
- [x] Lint/Type check: `npm run lint && npm run typecheck`

### Step 11: Config edit subcommand

- [x] Write test: `src/features/config/edit.test.ts`
  - Test opening existing config file
  - Test creating template for new file
  - Test --local flag
  - Test editor resolution (same as edit command)
  - Test TTY requirement
- [x] Implement: `src/features/config/edit.ts`
- [x] Verify: `npm run test:unit`
- [x] Lint/Type check: `npm run lint && npm run typecheck`

### Step 12: CLI command integration

- [ ] Write test: `src/cli/commands/config.test.ts`
  - Test subcommand routing
  - Test option parsing for each subcommand
  - Test help output
- [ ] Implement: `src/cli/commands/config.ts`
- [ ] Register in `src/cli/index.ts`
- [ ] Verify: `npm run test:unit`
- [ ] Lint/Type check: `npm run lint && npm run typecheck`

### Step 13: Shell completion support

- [ ] Update `src/cli/completion.ts`
  - Add config subcommand completions
  - Add option completions for each subcommand
- [ ] Verify completion works manually

### Step 14: E2E tests

**Important**: E2E tests must be implemented even if unit tests cover similar scenarios. E2E tests verify the actual CLI behavior with real file I/O and process execution.

#### Test Environment Setup

```typescript
// Pattern for config E2E tests
let testDir: string;
let configPath: string;

beforeEach(async () => {
  // Create isolated test directory
  testDir = path.join(os.tmpdir(), `config-e2e-${Date.now()}`);
  await fs.mkdir(testDir, { recursive: true });

  // Config file path within test directory
  configPath = path.join(testDir, "config.toml");
});

afterEach(async () => {
  await fs.rm(testDir, { recursive: true, force: true });
});

// Run CLI with isolated config via environment variable
const runCli = (args: string[]): Promise<{exitCode: number; stdout: string; stderr: string}> =>
  new Promise((resolve) => {
    const proc = spawn("node", [CLI_PATH, ...args], {
      env: {
        ...process.env,
        NODE_ENV: "test",
        REFERENCE_MANAGER_CONFIG: configPath,  // Isolate config file
      },
    });
    // ... collect stdout/stderr
  });

// Helper to read and parse config file
const readConfig = async (): Promise<object> => {
  const content = await fs.readFile(configPath, "utf-8");
  return parseTOML(content);
};

// Helper to verify config file content
const expectConfigValue = async (key: string, expected: unknown) => {
  const config = await readConfig();
  // Navigate to nested key and assert
};
```

#### E2E Test Cases

- [ ] Write E2E test: `src/cli/config.e2e.test.ts`

**config show:**
- [ ] Test `config show` outputs valid TOML with default values
- [ ] Test `config show --json` outputs valid JSON
- [ ] Test `config show --section citation` shows only citation section
- [ ] Test `config show --sources` shows source annotations

**config get:**
- [ ] Test `config get log_level` returns default value
- [ ] Test `config get citation.default_style` returns nested value
- [ ] Test `config get nonexistent.key` exits with code 1
- [ ] Test `config get` with environment override returns env value
- [ ] Test `config get --config-only` ignores environment override

**config set (file creation and updates):**
- [ ] Test `config set log_level debug` creates config file with correct content
  ```typescript
  await runCli(["config", "set", "log_level", "debug"]);
  const config = await readConfig();
  expect(config.log_level).toBe("debug");
  ```
- [ ] Test `config set citation.default_style ieee` creates nested section
  ```typescript
  await runCli(["config", "set", "citation.default_style", "ieee"]);
  const config = await readConfig();
  expect(config.citation.default_style).toBe("ieee");
  ```
- [ ] Test `config set cli.interactive.limit 50` creates deeply nested section
- [ ] Test multiple `config set` commands preserve existing values
  ```typescript
  await runCli(["config", "set", "log_level", "debug"]);
  await runCli(["config", "set", "citation.default_style", "ieee"]);
  const config = await readConfig();
  expect(config.log_level).toBe("debug");  // Still preserved
  expect(config.citation.default_style).toBe("ieee");
  ```
- [ ] Test `config set server.auto_start true` handles boolean correctly
- [ ] Test `config set cli.default_limit 100` handles number correctly
- [ ] Test `config set citation.csl_directory "/a,/b"` handles array correctly

**config set (validation errors):**
- [ ] Test `config set log_level invalid` fails with validation error
- [ ] Test `config set cli.default_limit abc` fails with type error
- [ ] Test `config set cli.default_limit -1` fails with range error
- [ ] Test `config set nonexistent.key value` fails with unknown key error

**config set (environment override warning):**
- [ ] Test warning appears when setting env-overridden key
  ```typescript
  const result = await runCli(["config", "set", "library", "/new/path"], {
    env: {
      ...process.env,
      REFERENCE_MANAGER_CONFIG: configPath,
      REFERENCE_MANAGER_LIBRARY: "/env/path",  // Override active
    },
  });
  expect(result.stderr).toContain("Warning");
  expect(result.stderr).toContain("REFERENCE_MANAGER_LIBRARY");
  // But value is still saved
  const config = await readConfig();
  expect(config.library).toBe("/new/path");
  ```

**config unset:**
- [ ] Test `config unset log_level` removes key from file
  ```typescript
  await runCli(["config", "set", "log_level", "debug"]);
  await runCli(["config", "unset", "log_level"]);
  const config = await readConfig();
  expect(config.log_level).toBeUndefined();
  ```
- [ ] Test `config unset citation.default_style` removes nested key
- [ ] Test `config unset` preserves other values in same section
- [ ] Test `config unset nonexistent` succeeds (no error)

**config --local (current directory config):**
- [ ] Test `config set --local` writes to `.reference-manager.config.toml` in cwd
  ```typescript
  const proc = spawn("node", [CLI_PATH, "config", "set", "--local", "log_level", "debug"], {
    cwd: testDir,  // Run in test directory
    env: { ...process.env, NODE_ENV: "test" },
  });
  // Verify file exists at testDir/.reference-manager.config.toml
  const localConfigPath = path.join(testDir, ".reference-manager.config.toml");
  expect(await fs.access(localConfigPath).then(() => true).catch(() => false)).toBe(true);
  ```

**config path:**
- [ ] Test `config path` shows all paths with existence status
- [ ] Test `config path --user` shows only user config path
- [ ] Test `config path --local` shows only local config path

**config list-keys:**
- [ ] Test `config list-keys` outputs all available keys
- [ ] Test `config list-keys --section citation` filters by section

**Full workflow integration:**
- [ ] Test complete workflow: set → get → show → unset → get (not found)
  ```typescript
  // Set value
  let result = await runCli(["config", "set", "citation.default_style", "ieee"]);
  expect(result.exitCode).toBe(0);

  // Get value
  result = await runCli(["config", "get", "citation.default_style"]);
  expect(result.exitCode).toBe(0);
  expect(result.stdout.trim()).toBe("ieee");

  // Show includes value
  result = await runCli(["config", "show", "--section", "citation"]);
  expect(result.stdout).toContain("ieee");

  // Unset value
  result = await runCli(["config", "unset", "citation.default_style"]);
  expect(result.exitCode).toBe(0);

  // Get returns not found
  result = await runCli(["config", "get", "citation.default_style"]);
  expect(result.exitCode).toBe(1);
  ```

- [ ] Verify: `npm run test:e2e`

## Completion Checklist

- [ ] All tests pass (`npm run test`)
- [ ] Lint passes (`npm run lint`)
- [ ] Type check passes (`npm run typecheck`)
- [ ] Build succeeds (`npm run build`)
- [ ] Manual verification
  - [ ] `ref config show` displays current config
  - [ ] `ref config get citation.default_style` returns value
  - [ ] `ref config set citation.default_style ieee` updates config
  - [ ] `ref config unset citation.default_style` removes value
  - [ ] `ref config list-keys` shows all available keys
  - [ ] `ref config path` shows file locations
  - [ ] `ref config edit` opens editor
  - [ ] Environment override warning appears when applicable
- [ ] CHANGELOG.md updated
- [ ] Move this file to `spec/tasks/completed/`
