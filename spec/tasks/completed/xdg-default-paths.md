# Task: XDG-Compliant Default Paths with env-paths

## Purpose

Change default paths for config, data, and cache directories to follow platform conventions using `env-paths`:
- Linux: XDG Base Directory Specification
- macOS: `~/Library/...`
- Windows: `%APPDATA%`, `%LOCALAPPDATA%`

This is a **breaking change**. Pre-release phase, no migration needed.

## References

- Package: [env-paths](https://github.com/sindresorhus/env-paths)
- Related: `src/config/defaults.ts`

### Affected Specs

- `spec/architecture/cli.md`
- `spec/architecture/directory-structure.md`
- `spec/architecture/http-server.md`
- `spec/architecture/mcp-server.md`
- `spec/core/data-model.md`
- `spec/features/citation.md`
- `spec/features/fulltext.md`
- `spec/features/write-safety.md`

### Affected Documentation

- `README.md`
- `README_ja.md`
- `CHANGELOG.md`

## Current vs New Paths

### Current (all platforms)
| Purpose | Path |
|---------|------|
| User config | `~/.reference-manager/config.toml` |
| Library | `~/.reference-manager/csl.library.json` |
| CSL styles | `~/.reference-manager/csl/` |
| Fulltext | `~/.reference-manager/fulltext/` |
| Backup | `/tmp/reference-manager/backups/` |

### New (Linux)
| Purpose | Path |
|---------|------|
| User config | `~/.config/reference-manager/config.toml` |
| Library | `~/.local/share/reference-manager/library.json` |
| CSL styles | `~/.local/share/reference-manager/csl/` |
| Fulltext | `~/.local/share/reference-manager/fulltext/` |
| Backup | `~/.cache/reference-manager/backups/` |

### New (macOS)
| Purpose | Path |
|---------|------|
| User config | `~/Library/Preferences/reference-manager/config.toml` |
| Library | `~/Library/Application Support/reference-manager/library.json` |
| CSL styles | `~/Library/Application Support/reference-manager/csl/` |
| Fulltext | `~/Library/Application Support/reference-manager/fulltext/` |
| Backup | `~/Library/Caches/reference-manager/backups/` |

### New (Windows)
| Purpose | Path |
|---------|------|
| User config | `%APPDATA%\reference-manager\Config\config.toml` |
| Library | `%LOCALAPPDATA%\reference-manager\Data\library.json` |
| CSL styles | `%LOCALAPPDATA%\reference-manager\Data\csl\` |
| Fulltext | `%LOCALAPPDATA%\reference-manager\Data\fulltext\` |
| Backup | `%LOCALAPPDATA%\reference-manager\Cache\backups\` |

## TDD Workflow

For each step:
1. Write failing test
2. Write minimal implementation to pass
3. Clean up, pass lint/typecheck, verify tests still pass

## Steps

### Step 1: Add env-paths dependency

- [x] Install: `npm install env-paths`
- [x] Verify package.json updated

### Step 2: Create paths module

- [x] Write test: `src/config/paths.test.ts`
  - Test that `getPaths()` returns object with config, data, cache properties
  - Test paths are non-empty strings
- [x] Implement: `src/config/paths.ts`
  - Export `getPaths()` using env-paths
- [x] Verify: `npm run test:unit`
- [x] Lint/Type check: `npm run lint && npm run typecheck`

### Step 3: Update defaults.ts

- [x] Write test: Update `src/config/defaults.test.ts`
  - Test `getDefaultUserConfigPath()` uses config path
  - Test `getDefaultLibraryPath()` uses data path
  - Test `getDefaultCslDirectory()` uses data path
  - Test `getDefaultFulltextDirectory()` uses data path
  - Test `getDefaultBackupDirectory()` uses cache path
- [x] Implement: Update `src/config/defaults.ts`
  - Use `getPaths()` instead of `homedir()` + `.reference-manager`
  - Rename library file from `csl.library.json` to `library.json` (optional, cleaner)
- [x] Verify: `npm run test:unit`
- [x] Lint/Type check: `npm run lint && npm run typecheck`

### Step 4: Update specs

Update path references in affected spec files:

- [x] `spec/architecture/cli.md` - config file paths
- [x] `spec/architecture/directory-structure.md` - no changes needed (source structure only)
- [x] `spec/architecture/http-server.md` - portfile/config paths
- [x] `spec/architecture/mcp-server.md` - no changes needed (paths not hardcoded)
- [x] `spec/core/data-model.md` - no changes needed (example filename only)
- [x] `spec/features/citation.md` - CSL directory path
- [x] `spec/features/fulltext.md` - fulltext directory path
- [x] `spec/features/write-safety.md` - backup directory path

### Step 5: Update documentation

- [x] Update `README.md` with new default paths
- [x] Update `README_ja.md` with new default paths
- [x] Add breaking change note to `CHANGELOG.md`

## Completion Checklist

- [x] All tests pass (`npm run test`)
- [x] Lint passes (`npm run lint`)
- [x] Type check passes (`npm run typecheck`)
- [x] Build succeeds (`npm run build`)
- [x] Manual verification on current platform
- [x] Specs updated with new paths
- [x] README.md updated
- [x] README_ja.md updated
- [x] CHANGELOG.md updated with breaking change
- [x] Move this file to `spec/tasks/completed/`
