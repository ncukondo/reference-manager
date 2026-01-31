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
# Create worktree in the dedicated directory
git worktree add /workspaces/reference-manager--worktrees/<branch-name> -b <branch-name>

# Example for task 20260108-01-new-feature.md
git worktree add /workspaces/reference-manager--worktrees/feature/new-feature -b feature/new-feature

# Run initial setup in the new worktree
cd /workspaces/reference-manager--worktrees/<branch-name> && npm install
```

### Worktree Location

- **All worktrees must be created under `/workspaces/reference-manager--worktrees/`**
- This is enforced by the `validate-worktree-path.sh` hook in `.claude/hooks/`
- The devcontainer is configured to allow this (`postCreateCommand` sets ownership)
- Use branch name as subdirectory name

### Parallel Work Rules

To avoid conflicts when multiple worktrees are active:

- **In worktree**: Implementation, tests, and PR creation only
- **On main branch (after merge)**: ROADMAP.md updates and moving task files to `completed/`

This separation ensures that shared files (`ROADMAP.md`, `spec/tasks/`) are only modified on main, preventing merge conflicts between parallel branches.

### After Completion

```bash
# After merging, remove worktree and branch
git worktree remove /workspaces/reference-manager--worktrees/<branch-name>
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
