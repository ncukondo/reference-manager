# Task: Fulltext Retrieval Configuration

## Purpose

Add configuration and environment variable support for OA fulltext retrieval sources (Unpaywall, CORE), enabling the `fulltext discover/fetch/convert` commands to be configured.

## References

- Spec: `spec/features/fulltext-retrieval.md`
- Related: `src/config/schema.ts`, `src/config/loader.ts`, `src/config/env-override.ts`
- Pattern: `pubmedConfigSchema` / `PUBMED_EMAIL` / `PUBMED_API_KEY`

## TDD Workflow

For each step, follow the Red-Green-Refactor cycle (see `spec/guidelines/testing.md`):

1. **Write test**: Create test file with comprehensive test cases
2. **Create stub**: Create implementation file with empty functions (`throw new Error("Not implemented")`)
3. **Verify Red**: Run tests, confirm they fail with "Not implemented"
4. **Implement**: Write actual logic until tests pass (Green)
5. **Refactor**: Clean up code while keeping tests green
6. **Quality checks**: Pass lint/typecheck

## Steps

### Step 1: Config Schema - Add `fulltext` section

Add `fulltextConfigSchema` to `configSchema` with:
- `preferSources`: `z.array(z.enum(["pmc", "arxiv", "unpaywall", "core"])).default(["pmc", "arxiv", "unpaywall", "core"])`
- `sources.unpaywallEmail`: `z.string().optional()`
- `sources.coreApiKey`: `z.string().optional()`

- [ ] Write test: `src/config/schema.test.ts` (add cases for fulltext config validation)
- [ ] Implement: Add schema to `src/config/schema.ts`
- [ ] Verify Green: `npm run test:unit -- schema.test.ts`
- [ ] Lint/Type check: `npm run lint && npm run typecheck`

### Step 2: Config Loader - Add `fillFulltextDefaults()`

Add loader logic following `fillPubmedDefaults()` pattern. Environment variables take priority over config file values.

- [ ] Write test: `src/config/loader.test.ts` (add cases for fulltext config loading, env var priority)
- [ ] Implement: Add `fillFulltextDefaults()` to `src/config/loader.ts`
- [ ] Verify Green: `npm run test:unit -- loader.test.ts`
- [ ] Lint/Type check: `npm run lint && npm run typecheck`

### Step 3: Environment Variable Overrides

Add to `ENV_OVERRIDE_MAP`:
- `UNPAYWALL_EMAIL` -> `fulltext.sources.unpaywall_email`
- `CORE_API_KEY` -> `fulltext.sources.core_api_key`

- [ ] Write test: `src/config/env-override.test.ts` (add cases for new env vars)
- [ ] Implement: Update `src/config/env-override.ts`
- [ ] Verify Green: `npm run test:unit -- env-override.test.ts`
- [ ] Lint/Type check: `npm run lint && npm run typecheck`

### Step 4: Config Command Integration

Ensure `ref config show/get/set` works with the new fulltext keys. Add to config-command's key list if needed.

- [ ] Verify: `ref config list-keys` includes fulltext keys
- [ ] Verify: `ref config get fulltext.sources.unpaywall_email` works
- [ ] Verify: `ref config set fulltext.sources.unpaywall_email "user@example.com"` works
- [ ] Lint/Type check: `npm run lint && npm run typecheck`

## Completion Checklist

- [ ] All tests pass (`npm run test`)
- [ ] Lint passes (`npm run lint`)
- [ ] Type check passes (`npm run typecheck`)
- [ ] Build succeeds (`npm run build`)
- [ ] CHANGELOG.md updated
- [ ] Move this file to `spec/tasks/completed/`
