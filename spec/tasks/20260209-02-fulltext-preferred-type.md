# Task: Fulltext Preferred Type

## Purpose

Allow users to configure which fulltext type (pdf or markdown) is preferred when type is not explicitly specified in `fulltext open` and `fulltext get` commands. Currently, PDF is always prioritized (hardcoded). This feature adds a 3-layer priority system: config file < environment variable < CLI option (`--prefer`).

## References

- Spec: `spec/features/fulltext-retrieval.md` (Configuration section)
- Spec: `spec/features/attachments.md` (fulltext open/get commands)
- Related: `src/features/operations/fulltext/open.ts`
- Related: `src/features/operations/fulltext/get.ts`
- Related: `src/config/schema.ts`
- Related: `src/config/env-override.ts`

## TDD Workflow

For each step, follow the Red-Green-Refactor cycle (see `spec/guidelines/testing.md`):

1. **Write test**: Create test file with comprehensive test cases
2. **Create stub**: Create implementation file with empty functions (`throw new Error("Not implemented")`)
3. **Verify Red**: Run tests, confirm they fail with "Not implemented"
4. **Implement**: Write actual logic until tests pass (Green)
5. **Refactor**: Clean up code while keeping tests green
6. **Quality checks**: Pass lint/typecheck

## Steps

### Step 1: Config Layer (schema, defaults, loader, env-override, key-parser)

Add `fulltext.preferred_type` to the config schema and wire up environment variable override.

- [x] Write test: `src/config/schema.test.ts` — add tests for `fulltext.preferred_type` field validation (accepts `"pdf"`, `"markdown"`, rejects invalid values, optional/undefined by default)
- [x] Write test: `src/config/env-override.test.ts` — add test for `REFERENCE_MANAGER_FULLTEXT_PREFERRED_TYPE` mapping
- [x] Write test: `src/config/key-parser.test.ts` — add test for `fulltext.preferred_type` key parsing
- [x] Write test: `src/config/loader.test.ts` — add test for loading `fulltext.preferred_type` from config file and env override
- [x] Implement: Update `src/config/schema.ts` — add `preferred_type` to fulltext config schema
- [x] Implement: Update `src/config/env-override.ts` — add `REFERENCE_MANAGER_FULLTEXT_PREFERRED_TYPE` to `ENV_OVERRIDE_MAP`
- [x] Verify Green: `npm run test:unit -- schema.test.ts env-override.test.ts key-parser.test.ts loader.test.ts`
- [x] Lint/Type check: `npm run lint && npm run typecheck`

### Step 2: Operation Layer (open.ts, get.ts)

Update `fulltextOpen` to use `preferred_type` from config when type is not specified. Update `fulltextGet` to order results by preferred type.

- [x] Write test: `src/features/operations/fulltext/open.test.ts` — add tests for `preferred_type` behavior:
  - When both PDF and markdown exist and `preferred_type` is `"markdown"`, opens markdown
  - When both exist and `preferred_type` is `"pdf"`, opens PDF
  - When both exist and `preferred_type` is undefined, opens PDF (backward compatible)
  - When only one type exists, opens that type regardless of preference
  - When explicit type is specified (`--pdf`/`--markdown`), preference is ignored
- [x] Write test: `src/features/operations/fulltext/get.test.ts` — add tests for `preferred_type` behavior:
  - When both types exist and `preferred_type` is `"markdown"`, markdown path is listed first
  - When both types exist and `preferred_type` is undefined, PDF path is listed first (backward compatible)
- [x] Implement: Update `src/features/operations/fulltext/open.ts` — accept `preferredType` option, use it in type resolution
- [x] Implement: Update `src/features/operations/fulltext/get.ts` — accept `preferredType` option, use it for ordering
- [x] Verify Green: `npm run test:unit -- fulltext/open.test.ts fulltext/get.test.ts`
- [x] Lint/Type check: `npm run lint && npm run typecheck`

### Step 3: CLI Layer (fulltext.ts, index.ts)

Add `--prefer <type>` option to `fulltext open` and `fulltext get` CLI commands, passing it through to operations.

- [x] Write test: `src/cli/commands/fulltext.test.ts` — add tests for `--prefer` option:
  - `fulltext open <id> --prefer markdown` passes `preferredType: "markdown"` to operation
  - `fulltext get <id> --prefer pdf` passes `preferredType: "pdf"` to operation
  - Invalid `--prefer` value shows error
  - When `--prefer` not specified, uses config value
- [x] Implement: Update `src/cli/commands/fulltext.ts` — add `--prefer` option to open and get subcommands
- [x] Verify Green: `npm run test:unit -- fulltext.test.ts`
- [x] Lint/Type check: `npm run lint && npm run typecheck`

### Step 4: MCP Layer (fulltext.ts)

Pass config-level `preferred_type` through MCP tool handlers for `fulltext_open` and `fulltext_get`.

- [x] Write test: `src/mcp/tools/fulltext.test.ts` — add tests for config passthrough:
  - `fulltext_open` uses `preferred_type` from config
  - `fulltext_get` uses `preferred_type` from config
- [x] Implement: Update `src/mcp/tools/fulltext.ts` — read `preferred_type` from config and pass to operations
- [x] Verify Green: `npm run test:unit -- mcp/tools/fulltext.test.ts`
- [x] Lint/Type check: `npm run lint && npm run typecheck`

## Manual Verification

**Script**: `test-fixtures/test-fulltext-preferred-type.sh`

Non-TTY tests (automated):
- [ ] `ref fulltext open <id>` with both types attached opens PDF (default behavior)
- [ ] `REFERENCE_MANAGER_FULLTEXT_PREFERRED_TYPE=markdown ref fulltext open <id>` opens markdown
- [ ] `ref fulltext open <id> --prefer markdown` opens markdown
- [ ] `ref fulltext get <id> --prefer markdown` lists markdown path first
- [ ] `ref fulltext open <id> --prefer markdown --pdf` opens PDF (explicit type wins)

## Completion Checklist

- [ ] All tests pass (`npm run test`)
- [ ] Lint passes (`npm run lint`)
- [ ] Type check passes (`npm run typecheck`)
- [ ] Build succeeds (`npm run build`)
- [ ] Manual verification: `./test-fixtures/test-fulltext-preferred-type.sh`
- [ ] CHANGELOG.md updated
- [ ] Move this file to `spec/tasks/completed/`
