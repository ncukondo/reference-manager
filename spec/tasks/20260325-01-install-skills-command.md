# Task: Install Skills Command & AI Agent Onboarding

## Purpose

Add `ref install --skills` command that installs Agent Skills (SKILL.md) for AI coding agents, and create `llms-install.md` for agent-guided onboarding. This enables users to set up reference-manager via any AI coding agent (Claude Code, Codex CLI, Gemini CLI, Cursor, etc.) by providing a single URL.

GitHub Issue: TBD

## Background

- Agent Skills is an open standard (agentskills.io) supported by 16+ tools
- Skills are more token-efficient than MCP for coding agents
- Standard discovery path: `.agents/skills/` (cross-client), `.claude/skills/` (Claude Code)
- `ref install --skills` places skill files in `$PWD/.agents/skills/ref/` and creates a symlink/junction at `$PWD/.claude/skills/ref` for Claude Code compatibility

## References

- Standard: https://agentskills.io/specification
- Precedent: https://github.com/microsoft/playwright-cli (skills-based CLI)
- Related: `src/cli/commands/` (existing command patterns)
- Related: `install.sh`, `install.ps1` (existing installer scripts)

## Design Decisions

### Directory layout after `ref install --skills`

```
$PWD/.agents/skills/ref/          ← actual files
├── SKILL.md
└── references/
    ├── systematic-review.md
    ├── manuscript-writing.md
    └── fulltext.md

$PWD/.claude/skills/ref           ← link to .agents/skills/ref
  - Linux/macOS: symlink
  - Windows: directory junction (no admin rights needed)
```

### Skill templates storage

Skill templates are embedded in source code under `src/cli/commands/install/skill-templates/` and bundled into the single binary at build time via Vite raw import.

### `llms-install.md`

A file at the repository root that AI agents read via raw GitHub URL. It guides:
1. What reference-manager is
2. How to install (single binary)
3. `ref install --skills` execution
4. Interactive initial configuration via `ref config set`
5. `ref --help` for self-discovery

## TDD Workflow

For each step, follow the Red-Green-Refactor cycle (see `spec/guidelines/testing.md`):

1. **Write test**: Create test file with comprehensive test cases
2. **Create stub**: Create implementation file with empty functions (`throw new Error("Not implemented")`)
3. **Verify Red**: Run tests, confirm they fail with "Not implemented"
4. **Implement**: Write actual logic until tests pass (Green)
5. **Refactor**: Clean up code while keeping tests green
6. **Quality checks**: Pass lint/typecheck

## Steps

### Step 1: Skill template content

Create the skill template files that will be embedded in the binary.

- [ ] Create `src/cli/commands/install/skill-templates/SKILL.md` — main skill with frontmatter (name, description, allowed-tools) and CLI reference
- [ ] Create `src/cli/commands/install/skill-templates/references/systematic-review.md`
- [ ] Create `src/cli/commands/install/skill-templates/references/manuscript-writing.md`
- [ ] Create `src/cli/commands/install/skill-templates/references/fulltext.md`
- [ ] Ensure SKILL.md follows agentskills.io spec (name: lowercase+hyphens, description: max 1024 chars, etc.)

### Step 2: Install command — skill file writer

- [ ] Write test: `src/features/install/write-skills.test.ts`
  - Writes skill files to target directory
  - Creates `.agents/skills/ref/` structure
  - Creates symlink on Linux/macOS
  - Creates junction on Windows
  - Handles existing files (skip by default, overwrite with `--force`)
  - Handles missing `.claude/skills/` parent directory (create it)
- [ ] Create stub: `src/features/install/write-skills.ts`
- [ ] Verify Red
- [ ] Implement
- [ ] Verify Green
- [ ] Lint/Type check

### Step 3: Install CLI command registration

- [ ] Write test: `src/cli/commands/install.test.ts`
  - `ref install --skills` calls write-skills with `$PWD`
  - `ref install --skills --user` calls write-skills with `~/.agents/skills/`
  - `ref install --skills --force` overwrites existing files
  - Output messages confirm what was installed and where
- [ ] Create stub: `src/cli/commands/install.ts`
- [ ] Verify Red
- [ ] Implement: Register command with commander, wire to write-skills
- [ ] Verify Green
- [ ] Lint/Type check

### Step 4: Vite build configuration for template embedding

- [ ] Ensure skill template files are importable as raw strings in the build
- [ ] Verify templates are included in the single binary output
- [ ] Test that built binary can write skill files correctly

### Step 5: `llms-install.md`

- [ ] Create `llms-install.md` at repository root
- [ ] Content: tool description, install instructions (single binary), `ref install --skills`, interactive config guidance, `ref --help` reference
- [ ] Written as instructions TO the AI agent (not for human reading)

## Manual Verification

**Script**: `test-fixtures/test-install-skills.sh`

Non-TTY tests (automated):
- [ ] `ref install --skills` creates `.agents/skills/ref/SKILL.md` in current directory
- [ ] `.claude/skills/ref` link exists and points to `.agents/skills/ref`
- [ ] `ref install --skills --force` overwrites existing files
- [ ] `ref install --skills` with existing files shows skip message

TTY-required tests (run manually):
- [ ] Verify skill is discovered by Claude Code (run `claude` in the directory, check `/ref` is available)

## Completion Checklist

- [ ] All tests pass (`npm run test`)
- [ ] Lint passes (`npm run lint`)
- [ ] Type check passes (`npm run typecheck`)
- [ ] Build succeeds (`npm run build`)
- [ ] Manual verification: `./test-fixtures/test-install-skills.sh`
- [ ] CHANGELOG.md updated
- [ ] Close linked issue (include `Closes #XX` in PR description)
- [ ] Move this file to `spec/tasks/completed/`
