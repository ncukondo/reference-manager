# Self-Upgrade

## Purpose

Make it effortless for users to discover and apply new releases, regardless of install method. The recommended single-binary install path (`install.sh` → `~/.local/bin/ref`) has no built-in upgrade channel, so users currently have no way to notice new versions short of checking GitHub manually.

Goals (priority order):

1. **Users notice new versions** without manual checks.
2. **Upgrading is one command** on every supported install path.

Non-goals:

- Auto-applying upgrades without user action
- Scheduled/background update checks outside CLI invocations
- Telemetry of any kind
- Downgrading (use `--version <tag>` to pin an older release)

## Scope

- **Interfaces**: CLI only (not MCP server, not HTTP server)
- **Install methods covered**:
  - Single binary (`install.sh` / `install.ps1`, default `~/.local/bin/ref`)
  - npm global (`npm i -g @ncukondo/reference-manager`)
  - Dev (`npm link`, `npx`) — detected and handled with guidance only
- **Release source**: GitHub Releases (`ncukondo/reference-manager`)

## Behavior

### 1. Update notification

On every CLI invocation, an async check compares the running version against the latest GitHub release. If a newer version is available, a one-line notice is printed **after** the user's command completes.

```
>>> New version available: 0.33.4 -> 0.34.0
    Run: ref upgrade
```

The notice uses ASCII-only characters so it renders legibly on legacy
Windows terminals (cmd.exe / PowerShell with non-UTF-8 code pages) where
fancy glyphs like `✨` and the unicode arrow can come out as mojibake.

#### Suppression rules

The check is skipped entirely (no network, no cache write) when any of:

- stdout is not a TTY
- `REFERENCE_MANAGER_NO_UPDATE_CHECK=1` in env
- `--no-update-check` flag passed
- The running command is `upgrade` itself (would be redundant)
- The running command is `completion` (completions must be silent and fast)
- The running command is `mcp` or `server` (long-running / machine-facing)

Network failure is silent. The user's command output is never delayed by the check.

#### Cache

Result is cached at `{data}/update-check.json`:

```json
{
  "checkedAt": "2026-04-20T12:34:56Z",
  "latest": "0.34.0",
  "url": "https://github.com/ncukondo/reference-manager/releases/tag/v0.34.0"
}
```

- TTL: 24 hours
- `{data}` resolves to the same platform-specific data dir used by the library (see `spec/architecture/cli.md`)
- Cache is consulted before any network call; a fresh cache means no HTTP request
- **The cache applies to the passive notifier only.** An explicit `ref upgrade` (including
  `--check`) always queries the live GitHub Releases API (`getLatestVersion({ force: true })`)
  so it never reports "already up to date" from a stale cache. A successful forced check
  still refreshes the cache file.

### 2. `ref upgrade` command

```bash
ref upgrade [options]
```

Detects the install method from `fs.realpathSync(process.argv[1])` and applies the appropriate strategy.

#### bunfs / `execPath` resolution (Bun single-file executables)

Inside a Bun single-file executable, `process.argv[1]` points into a virtual read-only
filesystem (`/$bunfs/root/...` on POSIX, `B:\~BUN\root\...` on Windows). Those paths do not
exist on disk and cannot be written to; the real on-disk binary is `process.execPath`.
Before realpath/pattern-matching, both install-method detection and destination resolution
substitute `process.execPath` when `argv[1]` is a bunfs virtual path (`isBunfsPath` /
`resolveEntrypoint` in `src/upgrade/detect.ts`). `--install-dir` still takes precedence over
the resolved destination. Non-bunfs invocations (node, npm-global, dev) are unaffected.

| Install method | Detection heuristic | Action |
|---|---|---|
| Single binary | Resolved path does **not** contain a `node_modules/` segment AND is not a symlink into the repo | Download the latest binary for the current platform and atomically replace the running binary (same `.tmp` → `mv` pattern as `install.sh`) |
| npm global | Resolved path contains `node_modules/` | Print the exact `npm i -g @ncukondo/reference-manager@latest` command; optionally auto-run with `--yes` |
| Dev (`npm link` / `npx`) | Resolved path is inside a git worktree or npm cache | Print guidance, exit 0 without acting |

#### Options

| Option | Description |
|---|---|
| `--check` | Report current vs. latest; perform no upgrade |
| `--version <tag>` | Pin to a specific release tag (e.g. `--version v0.33.4`). Mirrors `REF_VERSION` in `install.sh` |
| `--yes`, `-y` | Skip confirmation prompts |
| `--install-dir <path>` | Override install dir for single-binary mode (default: directory of the currently running binary) |

#### Exit codes

| Code | Meaning |
|---|---|
| 0 | Already up to date, or upgrade completed successfully |
| 1 | Upgrade failed (network, permissions, verification) |
| 2 | Install method cannot be upgraded automatically (dev/npx) |

### Platform matrix for single-binary upgrade

| OS | Arch | Binary name | Path pattern |
|---|---|---|---|
| Linux | x64 | `ref-linux-x64` | `~/.local/bin/ref` |
| Linux | arm64 | `ref-linux-arm64` | `~/.local/bin/ref` |
| macOS | x64 | `ref-darwin-x64` | `~/.local/bin/ref` |
| macOS | arm64 | `ref-darwin-arm64` | `~/.local/bin/ref` |
| Windows | x64 | `ref-windows-x64.exe` | `%USERPROFILE%\.local\bin\ref.exe` (TBD — see Open Questions) |

Platform detection reuses the same logic as `install.sh`: `process.platform` → os, `process.arch` → arch.

### Atomic replace (single binary)

Replacing the running binary on Unix is safe because the kernel keeps the inode alive until all open file descriptors close. The procedure:

1. Download to `{dest}.tmp.{pid}`
2. Verify the download: run `{tmp} --version` and confirm non-empty output matching `vX.Y.Z`
3. `chmod +x {tmp}`
4. `mv {tmp} {dest}` — POSIX `rename()` overwrites the destination atomically. No `rm` beforehand: deleting first would open a crash window with no binary installed at all.

On Windows the running `.exe` cannot be deleted. Strategy: rename the running binary to `{dest}.old`, move the new binary to `{dest}`, best-effort delete `{dest}.old` on next run.

## Error handling

| Scenario | Behavior |
|---|---|
| GitHub API unreachable | Silent for notification; clear error for `ref upgrade` |
| GitHub API rate-limited | Treat as transient; fall back to cache if present |
| Binary download 404 | Error with the release URL so the user can investigate |
| `--version` tag has no matching asset for platform | Error listing available assets |
| Write permission denied on install dir | Error with the resolved path and suggestion |
| Verification (`--version`) fails after move | Leave `{dest}.old` in place; report the failure |

## Configuration

No config keys initially. Environment variables only:

| Variable | Description |
|---|---|
| `REFERENCE_MANAGER_NO_UPDATE_CHECK` | If `1`, disable the async notification |
| `REF_VERSION` | Pin `ref upgrade` to a specific tag (same semantics as `install.sh`) |

## Implementation sketch

```
src/
├── upgrade/
│   ├── check.ts          # GitHub Releases API + cache
│   ├── check.test.ts
│   ├── detect.ts         # Install method detection (argv[1] realpath → enum)
│   ├── detect.test.ts
│   ├── apply-binary.ts   # Download + atomic replace
│   ├── apply-binary.test.ts
│   ├── apply-npm.ts      # npm global guidance / auto-run
│   └── notifier.ts       # Background check + post-command print
└── cli/commands/
    ├── upgrade.ts        # `ref upgrade` subcommand
    └── upgrade.test.ts
```

The notifier hooks into the CLI entrypoint (`src/cli/index.ts`): start the async check before command dispatch, register an `exit` or equivalent hook to print the notice after the command handler resolves.

## Related

- `install.sh` — single-binary installer (shell equivalent of the binary upgrade path)
- `install.ps1` — Windows installer
- `spec/architecture/cli.md` — CLI structure
- `spec/architecture/runtime.md` — Node.js / Bun distribution
- Issue #95 — tracking issue for this feature
