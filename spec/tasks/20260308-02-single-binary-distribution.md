# Task: Single-Binary Distribution via Bun Compile (#79)

## Purpose

Provide a single-binary distribution of reference-manager using `bun build --compile`, along with an installer script for easy installation. This removes the Node.js dependency for end users, simplifies installation to a one-liner, and makes the tool accessible in PATH-restricted environments (e.g., VSCode Claude Code extension).

## References

- Issue: #79
- Related: `bin/cli.js`, `vite.config.ts`, `package.json`
- Related: `.devcontainer/Dockerfile`

## TDD Workflow

For each step, follow the Red-Green-Refactor cycle (see `spec/guidelines/testing.md`):

1. **Write test**: Create test file with comprehensive test cases
2. **Create stub**: Create implementation file with empty functions (`throw new Error("Not implemented")`)
3. **Verify Red**: Run tests, confirm they fail with "Not implemented"
4. **Implement**: Write actual logic until tests pass (Green)
5. **Refactor**: Clean up code while keeping tests green
6. **Quality checks**: Pass lint/typecheck

## Steps

### Step 1: Devcontainer Setup

- [x] Add bun installation to `.devcontainer/Dockerfile`
- [x] Rebuild devcontainer and verify `bun --version` works

### Step 2: Bun Compile Entry Point

Create a dedicated entry point for bun compile that imports directly from source.

- [x] Create `src/cli/entry-bun.ts` (thin wrapper calling `main(process.argv)`)
- [x] Verify `bun run src/cli/entry-bun.ts --help` works
- [x] Lint/Type check: `npm run lint && npm run typecheck`

### Step 3: Bun Compile Build

- [x] Create `scripts/build-binary.sh` that runs `bun build --compile`
- [x] Test: built binary runs `ref --help` without Node.js on PATH
- [x] Test: built binary can perform basic operations (list, search, add)
- [ ] Verify ink/React TUI works in the compiled binary (requires manual TTY test)
- [x] Add cross-compilation targets (linux-x64, linux-arm64, windows-x64)

### Step 4: Installer Script

- [x] Create `install.sh` with:
  - Platform/architecture detection
  - Download from GitHub Releases
  - Install to `~/.local/bin/ref`
  - PATH configuration for bash/zsh/fish
  - Verification of installed binary
- [x] Test on Linux (native)
- [x] Test on WSL

### Step 5: GitHub Actions Release Workflow

- [ ] Create `.github/workflows/release-binary.yml`
  - Trigger on version tags (`v*`)
  - Build binaries for linux-x64, linux-arm64, windows-x64
  - Upload to GitHub Releases
  - Include `install.sh` in release assets

### Step 6: Documentation Update

- [ ] Update README.md with new installation instructions
  - Add `curl | bash` one-liner as primary method
  - Keep npm as alternative method
  - Document manual binary download
- [ ] Update CHANGELOG.md

## Manual Verification

**Script**: `test-fixtures/test-binary-distribution.sh`

Non-TTY tests (automated):
- [ ] `./ref --version` outputs version number
- [ ] `./ref list` works with a test library
- [ ] `./ref search test` works with a test library
- [ ] `./ref add --help` shows help text

TTY-required tests (run manually in a terminal):
- [ ] `./ref` launches TUI search mode
- [ ] `./ref search --tui` works interactively

## Completion Checklist

- [ ] All tests pass (`npm run test`)
- [ ] Lint passes (`npm run lint`)
- [ ] Type check passes (`npm run typecheck`)
- [ ] Build succeeds (`npm run build`)
- [ ] Binary build succeeds (`scripts/build-binary.sh`)
- [ ] Manual verification: `./test-fixtures/test-binary-distribution.sh` (if applicable)
- [ ] CHANGELOG.md updated
- [ ] README.md updated with new installation instructions
- [ ] Close issue #79 (or include `Closes #79` in PR description)
- [ ] Move this file to `spec/tasks/completed/`
