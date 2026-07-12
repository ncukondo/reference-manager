---
name: review
description: Detects all open PRs and spawns reviewer agents for each. Use when starting batch review.
---

# Batch Review

全てのオープンPRを検出し、レビューエージェントを一括起動します。

## Open PRs
!`gh pr list --state open --json number,headRefName,title --jq '.[] | "PR #\(.number): \(.title) (\(.headRefName))"' 2>/dev/null`

## Active Reviewers
!`./scripts/monitor-agents.sh 2>/dev/null`

## Steps

### 1. Detect Open PRs

```bash
gh pr list --state open --json number,headRefName,title
```

### 2. Spawn Reviewers

**Reviewer limit: max 4 reviewers** (plus the main agent).
Before spawning, check current agent count:
```bash
./scripts/monitor-agents.sh  # reviewers (non-main rows) must be < 4
```
If more PRs than available slots, review sequentially — wait for one to finish before spawning the next.

For each PR (parallel, up to pane limit). Worktrees are auto-created:
```bash
./scripts/spawn-reviewer.sh --pr <pr-number> &
# ... more PRs ...
wait
```

Or with explicit branch names:
```bash
./scripts/spawn-reviewer.sh <branch-name> <pr-number> --create &
```

### 5. Start Orchestration

```bash
./scripts/orchestrate.sh --background
```

### 6. Report

List spawned agents:
- PR number
- Branch name
- Pane ID

Monitor command:
```bash
./scripts/monitor-agents.sh --watch
```

## Notes

- If no open PRs, report that and exit
- Verify herdr server is running before spawning (`herdr status`)
- Agents autonomously review and post results to GitHub
- Orchestrator handles transitions after review completion
