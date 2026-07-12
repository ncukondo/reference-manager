# Task: Fix `ref upgrade` stale-cache check and bunfs destPath resolution

## Purpose

Two bugs prevent `ref upgrade` from actually upgrading an installed single-binary `ref`.
Both were reproduced on a real install (`~/.local/bin/ref`, Bun single-file ELF binary, 0.34.0 installed, v0.35.0 released):

1. **Stale-cache bug**: `ref upgrade` reported `Already up to date (0.34.0)` even though v0.35.0 was
   released, because the explicit upgrade command reuses the 24h update-notifier cache
   (`{data}/update-check.json`). `upgradeBinary` (`src/upgrade/apply-binary.ts:132`) and
   `upgradeNpmGlobal` (`src/upgrade/apply-npm.ts:87`) call `getLatest()` without `force`.
   An explicit `ref upgrade` / `ref upgrade --check` must always query the live GitHub Releases API
   (`getLatestVersion({ force: true })`). The passive startup notifier must keep using the cache as-is.

2. **bunfs destPath bug**: after clearing the cache, `ref upgrade` failed with
   `Failed to write downloaded binary: ENOENT: no such file or directory, open '/$bunfs/root/ref-linux-x64.tmp.<pid>'`.
   Inside a Bun single-file executable, `process.argv[1]` resolves to a virtual read-only path
   (`/$bunfs/root/...`), so `resolveDestPath` (`src/cli/commands/upgrade.ts:43`) picks an unwritable
   virtual destination. The real on-disk binary path is `process.execPath`. Both destination
   resolution and install-method detection (`detectInstallMethod` in `src/upgrade/detect.ts:76`,
   which currently only falls through to "binary" by luck for bunfs paths) must use `process.execPath`
   when `argv[1]` points into the bunfs virtual filesystem (path starts with `/$bunfs/` on POSIX,
   `B:\~BUN\` or similar bunfs marker on Windows — check Bun docs/behavior and normalize).

Workaround confirmed working: `rm {data}/update-check.json && ref upgrade --install-dir ~/.local/bin`
upgraded 0.34.0 -> 0.35.0, so download/verify/atomic-replace machinery is sound. Only target
resolution (cache) and destination resolution (bunfs) need fixing.

## References

- Spec: `spec/features/self-upgrade.md` (update it where behavior is clarified: explicit upgrade bypasses cache; bunfs/execPath resolution)
- Related: `src/upgrade/check.ts`, `src/upgrade/apply-binary.ts`, `src/upgrade/apply-npm.ts`, `src/upgrade/detect.ts`, `src/cli/commands/upgrade.ts`

## TDD Workflow

For each step, follow the Red-Green-Refactor cycle (see `spec/guidelines/testing.md`):

1. **Write test**: Create/extend test file with comprehensive test cases
2. **Create stub**: Stub new functions (`throw new Error("Not implemented")`) where applicable
3. **Verify Red**: Run tests, confirm they fail
4. **Implement**: Write actual logic until tests pass (Green)
5. **Refactor**: Clean up code while keeping tests green
6. **Quality checks**: Pass lint/typecheck

## Steps

### Step 1: Explicit upgrade bypasses the 24h cache

- [x] Write test: extend `src/upgrade/apply-binary.test.ts` and `src/upgrade/apply-npm.test.ts` —
      assert `getLatest` is invoked with `{ force: true }` (or that a fresh cache is ignored) when the
      upgrade command resolves the target version without a pinned `--version`
- [x] Verify Red
- [x] Implement: pass `force: true` through `upgradeBinary`/`upgradeNpmGlobal` default `getLatest`
      (keep the injected-`getLatest` test seam working; the notifier path must remain cache-first)
- [x] Verify Green: `npm run test:unit -- upgrade`
- [x] Lint/Type check: `npm run lint && npm run typecheck`

### Step 2: Resolve real binary path inside Bun single-file executables

- [x] Write test: extend `src/upgrade/detect.test.ts` and `src/cli/commands/upgrade.test.ts` —
      given `argv1 = "/$bunfs/root/ref-linux-x64"` and an `execPath` like `/home/user/.local/bin/ref`,
      detection returns `"binary"` deliberately (not by fall-through) and destPath resolves to the
      execPath location; non-bunfs behavior unchanged
- [x] Verify Red
- [x] Implement: add a bunfs-aware resolution helper (e.g. in `src/upgrade/detect.ts` or a shared
      util): if `argv[1]` is a bunfs virtual path, substitute `process.execPath` before realpath /
      pattern-matching; wire into both `detectInstallMethod` and `resolveDestPath`; make `execPath`
      injectable for tests
- [x] Verify Green: `npm run test:unit -- upgrade detect`
- [x] Lint/Type check: `npm run lint && npm run typecheck`

### Step 3: Spec update

- [x] Update `spec/features/self-upgrade.md`: explicit `ref upgrade`/`--check` always bypasses the
      cache (notifier keeps 24h TTL); document bunfs/execPath destination resolution

## Manual Verification

Not scriptable in CI (requires a compiled Bun binary). Document in the PR body:
the two reproduced failure outputs and, if feasible, a local `bun build --compile` smoke test
showing `ref upgrade --check` reports the live latest version and resolves a writable destPath.
