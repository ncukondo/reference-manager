# Task: Self-Upgrade UX (#95)

## Purpose

The recommended install path is the single binary, which has no built-in upgrade channel. Users must currently re-run `curl … | bash` or check GitHub manually to discover updates. This task delivers:

1. A non-intrusive version-check notification on every CLI invocation.
2. A `ref upgrade` subcommand that performs the upgrade for the detected install method.

## References

- Issue: #95
- Spec: `spec/features/self-upgrade.md`
- Related: `install.sh`, `install.ps1`, `src/cli/index.ts`, `src/cli/commands/`

## TDD Workflow

For each step, follow the Red-Green-Refactor cycle (see `spec/guidelines/testing.md`):

1. **Write test**: Create test file with comprehensive test cases
2. **Create stub**: Create implementation file with empty functions (`throw new Error("Not implemented")`)
3. **Verify Red**: Run tests, confirm they fail with "Not implemented"
4. **Implement**: Write actual logic until tests pass (Green)
5. **Refactor**: Clean up code while keeping tests green
6. **Quality checks**: Pass lint/typecheck

## Rollout Strategy

Stage 1 (Steps 1–3) delivers value on its own — users can discover updates even before the self-upgrade command lands. Stage 2 (Steps 4–6) adds `ref upgrade`. Each stage can ship as a separate PR.

## Steps

### Step 1: Update-check cache + GitHub Releases API client

- [ ] Write test: `src/upgrade/check.test.ts`
  - Fresh cache (< 24h): returns cached value without HTTP
  - Stale cache: triggers HTTP fetch, writes new cache
  - No cache: triggers HTTP fetch, writes cache
  - Network failure: returns null, does not crash, does not write cache
  - GitHub API 403 (rate limit): returns null, preserves existing cache
- [ ] Create stub: `src/upgrade/check.ts` exporting `getLatestVersion({ force?: boolean }): Promise<ReleaseInfo | null>` and `ReleaseInfo` type
- [ ] Verify Red: `npm run test:unit -- upgrade/check`
- [ ] Implement: `fetch` against `https://api.github.com/repos/ncukondo/reference-manager/releases/latest`, parse `tag_name` + `html_url`, cache to `{data}/update-check.json`
- [ ] Verify Green
- [ ] Lint/Type check: `npm run lint && npm run typecheck`

### Step 2: Install-method detection

- [ ] Write test: `src/upgrade/detect.test.ts`
  - Path under `~/.local/bin/ref` with no `node_modules/` → `"binary"`
  - Path containing `node_modules/` → `"npm-global"`
  - Symlink into a git worktree → `"dev"`
  - Path under a typical npm cache (`~/.npm/_npx/`) → `"npx"`
- [ ] Create stub: `src/upgrade/detect.ts` exporting `detectInstallMethod(argv1?: string): InstallMethod`
- [ ] Verify Red
- [ ] Implement: `fs.realpathSync(argv1 ?? process.argv[1])` then pattern-match on the resolved path; use test fixtures to avoid touching the real filesystem
- [ ] Verify Green
- [ ] Lint/Type check

### Step 3: Notifier wired into CLI entrypoint

- [ ] Write test: `src/upgrade/notifier.test.ts`
  - Suppressed when stdout is not a TTY
  - Suppressed when `REFERENCE_MANAGER_NO_UPDATE_CHECK=1`
  - Suppressed for `upgrade`, `completion`, `mcp`, `server` commands
  - When newer version available and TTY: prints the expected one-line notice to stderr after the command completes
  - When versions equal: prints nothing
  - Does not delay the user's command: notice is printed via `process.on('exit')` or equivalent
- [ ] Create stub: `src/upgrade/notifier.ts` exporting `maybeStartUpdateCheck(command: string): void` and `flushUpdateNotice(): void`
- [ ] Verify Red
- [ ] Implement: Start async check at CLI entry, register exit hook to print if result arrives in time
- [ ] Wire into `src/cli/index.ts` (call `maybeStartUpdateCheck` before `program.parseAsync`, `flushUpdateNotice` on exit)
- [ ] Verify Green: `npm run test:unit -- upgrade/notifier && npm run test:unit -- cli/index`
- [ ] Lint/Type check

**Stage 1 checkpoint**: Ship Steps 1–3 as a standalone PR. Users get update notifications without the self-upgrade command.

### Step 4: Binary upgrade strategy

- [ ] Write test: `src/upgrade/apply-binary.test.ts`
  - Computes correct asset name per platform (`ref-linux-x64`, `ref-darwin-arm64`, `ref-windows-x64.exe`)
  - Downloads to `{dest}.tmp.{pid}`, verifies `--version`, moves into place
  - On verification failure: leaves `.tmp` or `.old` in place, returns error
  - On download 404: surfaces the release URL in the error
  - `--version <tag>` overrides the detected latest
- [ ] Create stub: `src/upgrade/apply-binary.ts` exporting `upgradeBinary(options): Promise<UpgradeResult>`
- [ ] Verify Red
- [ ] Implement: port the download + atomic replace logic from `install.sh:59-84`; use `child_process.execFileSync` to verify the downloaded binary
- [ ] Verify Green
- [ ] Lint/Type check

### Step 5: npm-global upgrade strategy

- [ ] Write test: `src/upgrade/apply-npm.test.ts`
  - `--check` mode prints the recommended command and exits
  - `--yes` mode runs `npm i -g @ncukondo/reference-manager@latest` (mock `execa`/`child_process`)
  - Handles non-zero npm exit code
- [ ] Create stub: `src/upgrade/apply-npm.ts` exporting `upgradeNpmGlobal(options): Promise<UpgradeResult>`
- [ ] Verify Red
- [ ] Implement
- [ ] Verify Green
- [ ] Lint/Type check

### Step 6: `ref upgrade` subcommand

- [ ] Write test: `src/cli/commands/upgrade.test.ts`
  - Dispatches to binary strategy when install method is `"binary"`
  - Dispatches to npm strategy when `"npm-global"`
  - Prints guidance and exits 2 for `"dev"` / `"npx"`
  - `--check` runs without mutating anything
  - `--no-update-check` env respected (skip the same-version fast path if explicitly checking)
- [ ] Create stub: `src/cli/commands/upgrade.ts` with Commander wiring and `runUpgrade(options)` handler
- [ ] Verify Red
- [ ] Implement: register command in `src/cli/commands/index.ts`; share version-info fetching with Step 1
- [ ] **Call `detectInstallMethod()` from `src/upgrade/detect.ts`** to pick the strategy — Stage 1 exported this but never wired it in; Step 4 / Step 6 is where it actually runs in production (see also the `TODO(stage2)` comment at the top of `src/upgrade/detect.ts`)
- [ ] Verify Green
- [ ] Lint/Type check

**Stage 2 checkpoint**: Ship Steps 4–6 as a second PR closing #95.

## Manual Verification

**Script**: `test-fixtures/test-self-upgrade.sh`

Non-TTY tests (automated):

- [ ] `REFERENCE_MANAGER_NO_UPDATE_CHECK=1 ref list | grep -v 'New version'` — no notice printed
- [ ] `ref list > /dev/null 2>&1` (redirected stderr) — no notice printed
- [ ] `ref upgrade --check --version v0.0.0` prints "up to date" against a fake pinned version
- [ ] `ref upgrade --check` prints current vs. latest without writing anything

TTY-required tests (run manually in a terminal):

- [ ] Run `ref list` against a dev build tagged with an older version — verify the one-line notice appears after the command output
- [ ] Run `ref upgrade` on a `~/.local/bin/ref` install — verify atomic replace completes and `ref --version` reports the new version
- [ ] Run `ref upgrade` on a `npm i -g` install — verify the npm command is shown (and executed with `--yes`)
- [ ] Run `ref upgrade` inside a `npm link`'d repo — verify it exits 2 with guidance

## Completion Checklist

- [ ] All tests pass (`npm run test`)
- [ ] Lint passes (`npm run lint`)
- [ ] Type check passes (`npm run typecheck`)
- [ ] Build succeeds (`npm run build`)
- [ ] Manual verification: `./test-fixtures/test-self-upgrade.sh`
- [ ] README updated with `ref upgrade` command
- [ ] CHANGELOG.md updated
- [ ] Close linked issue (include `Closes #95` in the final PR description)
- [ ] Move this file to `spec/tasks/completed/`
