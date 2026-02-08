---
name: status
description: Shows current project status including tasks, tests, and worktrees. Use when checking project health.
---

# Project Status

プロジェクトの現在のステータスを確認します。

## Quick Status

### Git
!`git branch --show-current`
!`git status --short`

### Worktrees
!`git worktree list`

### Active Agents
!`./scripts/monitor-agents.sh 2>/dev/null`

### Orchestrator
!`./scripts/orchestrate.sh --status 2>/dev/null`

### Open PRs
!`gh pr list --state open --json number,title,headRefName --jq '.[] | "PR #\(.number): \(.title) (\(.headRefName))"' 2>/dev/null`

## Full Status Check

### 1. ROADMAP Progress

```bash
# Count tasks by status
grep -E "^\|" spec/tasks/ROADMAP.md | grep -c "Done" | xargs echo "Done:"
grep -E "^\|" spec/tasks/ROADMAP.md | grep -c "In Progress" | xargs echo "In Progress:"
grep -E "^\|" spec/tasks/ROADMAP.md | grep -c "Pending" | xargs echo "Pending:"
```

### 2. Tests

```bash
npm run test:all
```

### 3. Build

```bash
npm run build
```

### 4. Uncommitted Changes

```bash
git status
```

### 5. Worktree Status

```bash
git worktree list
```

## Output Format

```markdown
## Project Status

### Task Progress
- Done: X
- In Progress: X
- Pending: X
- Next priority: [task name](spec/tasks/xxx.md)

### Tests
- passed: X / failed: X / skipped: X

### Build
- Success / Failure

### Git
- Branch: xxx
- Uncommitted changes: yes / no

### Worktrees
- (list of active worktrees)

### Agents
- (list of running agents with states)

### Open PRs
- (PR list)
```
