# Task: Upgrade Hardening (fetch timeout, atomic replace, checksum, semver notify)

## Purpose

Harden the self-upgrade feature based on review findings from the search-hub port (issue #101, ncukondo/search-hub#153). Four issues: update-check fetch can hang the event loop, Unix binary replacement has a non-atomic window, downloaded assets are not checksum-verified, and the update notification fires on any version mismatch (including when local is ahead).

## References

- Issue: #101
- Spec: `spec/features/self-upgrade.md`
- Related: `src/upgrade/check.ts`, `src/upgrade/apply-binary.ts`, `src/upgrade/notifier.ts`, `.github/workflows/` (release workflow)

## Current Behavior (verified)

- `src/upgrade/check.ts`: fetch has no timeout/AbortSignal.
- `src/upgrade/apply-binary.ts` (non-win32 branch): `rmSync(destPath)` then `renameSync(tmpPath, destPath)` — a crash in between leaves no binary. POSIX `renameSync` alone overwrites atomically.
- No SHA256SUMS verification of downloaded assets (only `{tmp} --version` execution check).
- `src/upgrade/notifier.ts:99`: `if (result.latest === currentVersion) return;` — notifies when local is *ahead* of latest (e.g. pre-release version bump).

## TDD Workflow

For each step, follow the Red-Green-Refactor cycle (see `spec/guidelines/testing.md`).

## Steps

### Step 1: Fetch timeout in update check

- [x] Write test: `src/upgrade/check.test.ts` — fetch aborts after timeout (mock a hanging fetch); successful fetch unaffected
- [x] Implement: pass `AbortSignal.timeout(3000)` (or similar) to the notifier-path fetch in `check.ts`; treat abort as "check failed" (silent, non-fatal)
- [x] Verify Green, lint/typecheck

### Step 2: Atomic binary replacement on Unix

- [x] Write test: `src/upgrade/apply-binary.test.ts` — non-win32 replacement does NOT call `rmSync(destPath)` before rename; rename overwrites existing file
- [x] Implement: drop the pre-`rmSync` in the non-win32 branch (keep win32 `.old` dance as-is); align the module comment with reality
- [x] Verify Green, lint/typecheck

### Step 3: Semver-aware notification

- [x] Write test: `src/upgrade/notifier.test.ts` — no notification when `currentVersion` >= `latest` (local ahead); notification when `latest` is newer
- [x] Implement: replace strict-inequality check with a semver comparison (a small local compare is fine; avoid new deps if possible)
- [x] Verify Green, lint/typecheck

### Step 4: Checksum verification (SHA256SUMS)

- [ ] Update release workflow to generate and upload a `SHA256SUMS` asset alongside binaries
- [ ] Write test: download path verifies the binary's SHA256 against SHA256SUMS when the asset exists; clear error on mismatch; graceful skip (with notice) when SHA256SUMS is absent (older releases)
- [ ] Implement verification in the binary upgrade path (`node:crypto`)
- [ ] Verify Green, lint/typecheck

## Completion Checklist

- [ ] All tests pass (`npm run test`)
- [ ] Lint passes (`npm run lint`)
- [ ] Type check passes (`npm run typecheck`)
- [ ] Build succeeds (`npm run build`)
- [ ] CHANGELOG.md updated
- [ ] Close linked issue (include `Closes #101` in PR description)
- [ ] Move this file to `spec/tasks/completed/`
