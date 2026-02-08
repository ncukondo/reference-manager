---
name: fix-reviews
description: Detects PRs with changes requested and spawns fixer agents. Use when addressing review feedback.
---

# Fix Review Requests

レビューで修正要求（changes requested）のあるPRを検出し、修正エージェントを起動します。

## Current PRs Needing Fixes
!`gh pr list --state open --json number,headRefName,title,reviewDecision --jq '.[] | select(.reviewDecision == "CHANGES_REQUESTED") | "PR #\(.number): \(.title) (\(.headRefName))"' 2>/dev/null`

## Steps

### 1. Detect PRs with Changes Requested

```bash
gh pr list --state open --json number,headRefName,title,reviewDecision
```

Filter: `reviewDecision == "CHANGES_REQUESTED"`

### 2. Get Review Comments

For each PR:
```bash
gh pr view <pr-number> --comments
gh api repos/{owner}/{repo}/pulls/<pr-number>/reviews --jq '.[] | select(.state == "CHANGES_REQUESTED") | .body'
```

### 3. Verify Worktrees

Check/create worktree for each PR:
```bash
PARENT_DIR="$(cd "$(git rev-parse --show-toplevel)/.." && pwd)"
git worktree add "${PARENT_DIR}/reference-manager--worktrees/<branch-dir>" <branch-name>
```

### 4. Spawn Fixer Agents

**Pane limit: max 4 fixers** (main + 4 fixers = 5 panes).
Before spawning, check current pane count:
```bash
tmux list-panes | wc -l  # Must be < 5
```
If more PRs than available slots, fix sequentially — wait for one to finish before spawning the next.

For each PR:
```bash
./scripts/spawn-worker.sh <branch-name> <task-keyword> &
```

Or if task keyword is unknown:
1. `./scripts/set-role.sh <worktree-dir> implement`
2. `./scripts/launch-agent.sh <worktree-dir> "<fix instructions>"`

### 5. Apply Layout

```bash
./scripts/apply-layout.sh
```

### 6. Start Orchestration (optional)

```bash
./scripts/orchestrate.sh --background
```

## Output

Report:
- List of spawned agents (PR number, branch, pane ID)
- Summary of requested changes for each PR

## Notes

- If no PRs need fixes, report that and exit
- Include full review comments in fix instructions
- Use separate text and Enter when sending tmux keys (with sleep 1 between)
