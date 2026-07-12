# Development Process

Complete workflow from feature request to implementation.

## Process Overview

**1. Specification → 2. Technical Selection → 3. Roadmap → 4. TDD Implementation**

## 1. Specification Phase

### Create/Update Spec Files

**What**: Define requirements, behavior, constraints

**Where**:
- `spec/features/` for new features
- `spec/core/` for core functionality changes
- `spec/architecture/` for architectural changes

### Questions to Answer

- What problem does this solve?
- What are the inputs and outputs?
- What are the edge cases?
- What should NOT be included? (non-goals)

## 2. Technical Selection Phase

### When to Create an ADR

- Choosing a major library or framework
- Architectural pattern selection
- Data model changes
- Breaking changes to public APIs

### Record Decision

**Where**: `spec/decisions/ADR-NNN-title.md`

See `spec/decisions/README.md` for ADR template.

## 3. Roadmap Phase

### Update spec/tasks/ROADMAP.md

After spec and technical decisions are clear:

1. Add new task with clear acceptance criteria
2. Structure tasks for TDD workflow
3. Organize by priority/dependency
4. Mark current phase

### Task Structure

```markdown
- [ ] **N.M.1**: Task description
  - File: `src/path/module.ts`
  - Acceptance: What "done" means
  - Dependencies: What must be completed first
```

## Git Worktree for Task Implementation

When implementing tasks from `spec/tasks/`, use a dedicated git worktree to isolate work.

### Why Use Worktree

- Isolate task implementation from the main branch
- Allow parallel work on multiple tasks
- Keep main workspace clean for code review

### Create Worktree

```bash
# Create worktree in the dedicated directory (slashes in branch names become dashes)
git worktree add "$HOME/.herdr/worktrees/reference-manager/<branch-dir>" -b <branch-name>

# Example for task 20260108-01-new-feature.md
git worktree add "$HOME/.herdr/worktrees/reference-manager/feature-new-feature" -b feature/new-feature

# Run initial setup in the new worktree
cd "$HOME/.herdr/worktrees/reference-manager/<branch-dir>" && npm install
```

### Worktree Location

- **All worktrees must be created under `~/.herdr/worktrees/reference-manager/`** (herdr's worktree base)
- This is enforced by the `validate-worktree-path.sh` hook in `.claude/hooks/`
- Use branch name with slashes converted to dashes as subdirectory name (herdr convention)

### Parallel Work Rules

To avoid conflicts when multiple worktrees are active:

- **In worktree**: Implementation, tests, and PR creation only
- **On main branch (after merge)**: ROADMAP.md updates and moving task files to `completed/`

This separation ensures that shared files (`ROADMAP.md`, `spec/tasks/`) are only modified on main, preventing merge conflicts between parallel branches.

### After Completion

```bash
# After merging, remove worktree and branch (merge-pr.sh does this automatically)
git worktree remove "$HOME/.herdr/worktrees/reference-manager/<branch-dir>"
git branch -d <branch-name>
```

## Parallel Agent Orchestration

Agents run in [herdr](https://herdr.dev) panes, one workspace per worktree. herdr detects each agent's state (idle/working/blocked) automatically and exposes a socket API used by the scripts below.

### Prerequisites

- `herdr` installed, server running (`herdr status`)
- Claude integration installed (`herdr integration install claude`) — enables agent state detection

### Agent Scripts

Scripts in `scripts/` automate agent lifecycle. All share a common base (`launch-agent.sh`).

| Script | Usage | Purpose |
|--------|-------|---------|
| `launch-agent.sh` | `<worktree-dir> [prompt]` | Base: settings, herdr workspace, Claude launch (`--permission-mode auto`) |
| `spawn-worker.sh` | `<branch> <task-keyword> [step-scope]` | Creates worktree + sets implement role, then delegates |
| `spawn-reviewer.sh` | `--pr <pr-number>` | Creates worktree + sets review role, then delegates |

```bash
# Implementation worker
./scripts/spawn-worker.sh feature/<name> <task-keyword>

# Implementation worker with step scope (restricts which steps the worker handles)
./scripts/spawn-worker.sh feature/<name> <task-keyword> "Steps 1 and 2 only"

# PR review
./scripts/spawn-reviewer.sh --pr <pr-number>

# Ad-hoc agent (existing worktree, custom prompt)
./scripts/launch-agent.sh /path/to/worktree "your prompt here"
```

If auto-launch fails, the scripts print manual commands to run.

### Monitoring Scripts

| Script | Usage | Purpose |
|--------|-------|---------|
| `monitor-agents.sh` | `[--watch] [--json] [--all]` | List this repo's agent states |
| `check-agent-state.sh` | `<pane\|name>` | Check single agent's state |
| `check-task-completion.sh` | `<branch> <task-type> [pr]` | Check PR/CI/review status via GitHub API |
| `send-to-agent.sh` | `<pane\|name> <prompt>` | Send prompt to idle agent |

### Parallel Task Analysis

When splitting a task into parallel workers:

1. **Check file conflicts**: If two steps modify the same source/test files, assign them to the same worker
2. **Use step scope**: Pass the third argument to `spawn-worker.sh` to restrict each worker's scope
3. **Review after implementation**: Use `spawn-reviewer.sh` to spawn review agents

### State Tracking

Agent states come from herdr's agent detection (`herdr agent get <target>`):
- `starting` - Agent detected but state not yet known (herdr: `unknown`)
- `working` - Agent is executing a task
- `idle` - Agent is waiting for input
- `permission` - Agent is blocked on a prompt/dialog (herdr: `blocked`)

Caveat: startup dialogs (MCP confirmation etc.) may be reported as `idle`. Never treat `idle` alone as task completion; verify with `herdr agent read <pane>` or `check-task-completion.sh` (GitHub state).

### Monitoring

```bash
# Monitor all agents continuously
./scripts/monitor-agents.sh --watch

# List all agents
herdr agent list

# Inspect specific pane
herdr agent read <pane-id> --lines 20

# Block until an agent finishes its task (herdr reports "done" on completion)
herdr wait agent-status <pane-id> --status done --timeout 600000

# Send prompt to idle agent
./scripts/send-to-agent.sh <pane-id> "your instruction"
```

### Cleanup

Agent scripts modify `CLAUDE.md` in the worktree (not committed). Restore it before removing the worktree to avoid `--force`:

```bash
# Restore CLAUDE.md modified by agent scripts
cd "$HOME/.herdr/worktrees/reference-manager/<branch-dir>" && git checkout -- CLAUDE.md

# Remove worktree and branch
git worktree remove "$HOME/.herdr/worktrees/reference-manager/<branch-dir>"
git branch -d <branch-name>
```

## 4. TDD Implementation Phase

**Must follow** `spec/guidelines/testing.md` strictly.

### Red-Green-Refactor Cycle

1. **Write Tests (Red)**: Create comprehensive tests
2. **Empty Implementation**: `throw new Error("Not implemented")`
3. **Verify Failure**: Run tests, confirm they fail
4. **Implement (Green)**: Write code to pass tests
5. **Refactor**: Clean up while keeping tests green

### Quality Checks

**All checks must pass** before task completion:

```bash
npm run typecheck  # No TypeScript errors
npm run lint       # No lint issues
npm run format     # Apply formatting
npm test           # All tests pass
```

### Commit and Update

After each task:

1. Update `spec/tasks/ROADMAP.md` - Mark task complete
2. Update specs if behavior changed
3. Commit with descriptive message
4. Push to remote

### Pull Request and Issue Linking

When a task has an associated GitHub issue, include `Closes #XX` in the PR description so the issue is automatically closed on merge.

```markdown
## Summary

- Implemented feature X

Closes #42
```

If a PR addresses multiple issues, list each one (`Closes #42, Closes #43`).

## Quality Gates

Every implementation must pass:

- All tests pass
- No TypeScript errors
- No lint errors
- Code formatted
- spec/tasks/ROADMAP.md updated
- Specs updated (if needed)

## Common Patterns

### Adding a New Feature

1. Read `spec/_index.md` → identify relevant specs
2. Create `spec/features/new-feature.md`
3. If new tech needed → create ADR
4. Update `spec/tasks/ROADMAP.md` with tasks
5. Follow TDD process
6. Run quality checks
7. Update docs and commit

### Fixing a Bug

1. Read relevant spec
2. Write failing test that reproduces the bug
3. Fix the implementation
4. Verify test passes
5. Run quality checks
6. Commit

### Refactoring

1. Ensure full test coverage exists
2. Refactor code
3. Verify all tests still pass
4. Run quality checks
5. Update specs if behavior changed
6. Commit

## Pre-release Notes

**Current phase: Pre-release (Alpha)**

- Breaking changes are acceptable
- Focus on clean, simple design
- No backward compatibility required
- Refactor aggressively for clarity

**Post-release** (future):
- Follow semantic versioning
- Maintain backward compatibility
- Provide migration guides
