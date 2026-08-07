# Task: Isolate Config Loader Tests from the Host Environment

## Purpose

`src/config/loader.test.ts` reads the developer's real user-level config
(`~/.config/reference-manager/config.toml`) during tests (issue #105). On any machine where that
file exists, tests that assert default values fail locally — 5 of 95 currently fail on the
maintainer's machine (`url.browserPath`, `citation.cslDirectory`, `fulltext.sources.*`).

CI is unaffected (clean environment), but local full-suite runs fail. Three independent agent
sessions hit this during work on #101 (PR #103) and #12 (PR #104).

Cause: most tests call `loadConfig({ cwd: testDir })` without `userConfigPath`, so the loader falls
back to `getDefaultUserConfigPath()` and reads the real file. A handful of tests already work around
this ad hoc by passing `userConfigPath: join(testDir, "no-user.toml")`.

The same leak affects the two e2e tests that call `loadConfig({ overrides: { library } })` — those
currently pass, but inherit the host's `attachments.directory`, which points at real user storage.

## References

- Issue: #105
- Related: `src/config/loader.test.ts`, `src/config/loader.ts` (`LoadConfigOptions.userConfigPath`),
  `src/cli/performance.e2e.test.ts`, `src/cli/execution-context.e2e.test.ts`

## Approach

Test-only change; no production code is modified. Inject the config-path resolution the loader
already exposes rather than manipulating `XDG_CONFIG_HOME` — `src/config/paths.ts` resolves
`envPaths()` at module load, and the env-var approach does not isolate macOS (env-paths uses
`homedir()` there directly).

1. Add a `loadTestConfig()` helper in `loader.test.ts` that defaults `cwd` to the per-test temp dir
   and `userConfigPath` to a non-existent path inside it. Route all 95 `loadConfig(...)` calls
   through it; explicit options still override the defaults.
2. Clear the saved environment variables in `beforeEach` (they are already saved/restored, but not
   cleared — an ambient `EMAIL`/`PUBMED_EMAIL` in the developer's shell leaks in the same way).
3. Give the two e2e `loadConfig` call sites an isolated `userConfigPath` as well.

## Steps

### Step 1: Isolate `loader.test.ts`

- [x] Add `loadTestConfig()` helper with isolated `cwd` + `userConfigPath` defaults
- [x] Replace all `loadConfig(` call sites in the file with `loadTestConfig(`
- [x] Delete `ENV_VARS_TO_SAVE` entries in `beforeEach` after saving them
- [x] Verify Green: `npm run test:unit -- src/config/loader.test.ts` (95 pass on a machine that has
      a real user config)

### Step 2: Isolate the e2e `loadConfig` call sites

- [x] Pass a non-existent `userConfigPath` in `src/cli/performance.e2e.test.ts` and
      `src/cli/execution-context.e2e.test.ts`
- [x] Verify Green: `npm run test:e2e`

## Manual Verification

The regression only reproduces on a machine that has `~/.config/reference-manager/config.toml`:

- [x] With that file present, `npm test` reports no failures in `src/config/loader.test.ts`
- [x] Temporarily moving the file aside does not change the result (tests are indifferent to it)

## Completion Checklist

- [ ] All tests pass (`npm run test`)
- [ ] Lint passes (`npm run lint`)
- [ ] Type check passes (`npm run typecheck`)
- [ ] Build succeeds (`npm run build`)
- [ ] Close linked issue (include `Closes #105` in PR description)
- [ ] Move this file to `spec/tasks/completed/`
