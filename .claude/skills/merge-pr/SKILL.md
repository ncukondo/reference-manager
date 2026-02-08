---
name: merge-pr
description: Merges a PR with automatic cleanup of worktree and branch. Handles all edge cases. Use when merging approved PRs.
---

# Merge PR #$ARGUMENTS

PR #$ARGUMENTS のマージ処理を行います。

## PR Status
!`gh pr view $ARGUMENTS --json headRefName,state,mergeable,reviewDecision --jq '"Branch: \(.headRefName)\nState: \(.state)\nMergeable: \(.mergeable)\nReview: \(.reviewDecision)"' 2>/dev/null`

## CI Status
!`gh pr checks $ARGUMENTS 2>/dev/null`

## Worktree Status
!`git worktree list`

## One-Command Merge

**Recommended**: Use the merge script that handles all edge cases:

```bash
./scripts/merge-pr.sh $ARGUMENTS
```

This script automatically:
1. Waits for CI if still running
2. Merges the PR (squash by default)
3. Switches to main if currently in worktree
4. Kills any agents running in the worktree
5. Removes the worktree (force if locked)
6. Deletes local and remote branches
7. Moves task file to completed (if found)

### Options

```bash
# Squash merge (default)
./scripts/merge-pr.sh $ARGUMENTS --squash

# Regular merge commit
./scripts/merge-pr.sh $ARGUMENTS --merge

# Rebase merge
./scripts/merge-pr.sh $ARGUMENTS --rebase

# Skip task file management
./scripts/merge-pr.sh $ARGUMENTS --no-task

# Preview what would happen
./scripts/merge-pr.sh $ARGUMENTS --dry-run
```

## Batch Merge

For multiple PRs, run sequentially:

```bash
./scripts/merge-pr.sh 123
./scripts/merge-pr.sh 124
./scripts/merge-pr.sh 125
```

Or parallel (if no conflicts expected):

```bash
./scripts/merge-pr.sh 123 &
./scripts/merge-pr.sh 124 &
./scripts/merge-pr.sh 125 &
wait
```

## Post-Merge Tasks

After merge, update ROADMAP if needed:

1. Open `spec/tasks/ROADMAP.md`
2. Change task status to "Done"
3. Commit: `git add spec/tasks/ROADMAP.md && git commit -m "chore(tasks): complete task X"`
4. Push: `git push`

## Troubleshooting

### "Worktree locked"
The script handles this with `--force`, but if it still fails:
```bash
PARENT_DIR="$(cd "$(git rev-parse --show-toplevel)/.." && pwd)"
rm -rf "${PARENT_DIR}/reference-manager--worktrees/<branch-dir>"
git worktree prune
```

### "Branch not fully merged"
Use `-D` (force delete):
```bash
git branch -D <branch-name>
```

### "Cannot delete current branch"
You're still in the worktree. Switch first:
```bash
cd "$(git rev-parse --show-toplevel)"
git checkout main
```

### Agent still running in worktree
Kill it first:
```bash
./scripts/kill-agent.sh <pane-id>
```
