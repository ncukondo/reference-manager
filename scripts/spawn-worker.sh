#!/usr/bin/env bash
set -euo pipefail

# Spawn a worker agent for a task in a new worktree.
#
# Usage: spawn-worker.sh <branch-name> <task-keyword> [step-scope]
# Example: spawn-worker.sh feature/clipboard-support clipboard
# Example: spawn-worker.sh feature/sync-role sync-interactive "Steps 1 and 2 only"
#
# Arguments:
#   branch-name:  Git branch to create/use
#   task-keyword: Keyword to match task file in spec/tasks/
#   step-scope:   (Optional) Specific steps this worker should handle.
#                 Appended to CLAUDE.md so the worker knows its scope.
#
# What it does:
#   1. Creates worktree (via workmux or manually)
#   2. Appends worker instructions to CLAUDE.md (with optional step scope)
#   3. Delegates to launch-agent.sh for pane + Claude setup

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
BRANCH="${1:?Usage: spawn-worker.sh <branch-name> <task-keyword> [step-scope]}"
TASK_KEYWORD="${2:?Usage: spawn-worker.sh <branch-name> <task-keyword> [step-scope]}"
STEP_SCOPE="${3:-}"

WORKTREE_BASE="/workspaces/reference-manager--worktrees"
WORKTREE_DIR="$WORKTREE_BASE/$(echo "$BRANCH" | tr '/' '-')"

# --- 1. Create worktree ---
if [ -d "$WORKTREE_DIR" ]; then
  echo "[spawn-worker] Worktree already exists: $WORKTREE_DIR"
else
  if command -v workmux &>/dev/null; then
    echo "[spawn-worker] Creating worktree via workmux..."
    workmux add "$BRANCH" -b
  else
    echo "[spawn-worker] Creating worktree manually..."
    mkdir -p "$WORKTREE_BASE"
    git worktree add "$WORKTREE_DIR" -b "$BRANCH"
    (cd "$WORKTREE_DIR" && npm install)
  fi
fi

# --- 2. Append worker instructions to CLAUDE.md ---
echo "[spawn-worker] Appending worker instructions to CLAUDE.md..."
if ! grep -q '## Worker Agent Instructions' "$WORKTREE_DIR/CLAUDE.md" 2>/dev/null; then
  cat >> "$WORKTREE_DIR/CLAUDE.md" << 'CLAUDE_EOF'

## Worker Agent Instructions

You are a worker agent implementing a task in a worktree.

### Responsibilities
- Follow TDD (Red -> Green -> Refactor)
- Update task file checkboxes after each step and commit
- Write .worker-status.json at worktree root with current progress
- Create PR when all steps complete
- Work scope: implementation + tests + PR only (ROADMAP changes are done on main after merge)
- **All commit messages, PR titles/bodies, and PR comments MUST be in English**

### Compact Recovery
If context was compacted, re-read these before continuing:
1. Task file in spec/tasks/ (check completed steps)
2. git log --oneline -10 (recent commits)
3. git status and git diff (uncommitted work)
CLAUDE_EOF
fi

# Append step scope if provided
if [ -n "$STEP_SCOPE" ]; then
  echo "" >> "$WORKTREE_DIR/CLAUDE.md"
  echo "### Worker Scope" >> "$WORKTREE_DIR/CLAUDE.md"
  echo "" >> "$WORKTREE_DIR/CLAUDE.md"
  echo "**This worker is responsible for: $STEP_SCOPE**" >> "$WORKTREE_DIR/CLAUDE.md"
  echo "Do NOT implement steps outside this scope. Other workers handle the rest." >> "$WORKTREE_DIR/CLAUDE.md"
fi

# --- 3. Delegate to launch-agent.sh ---
export LAUNCH_AGENT_LABEL="spawn-worker"
exec "$SCRIPT_DIR/launch-agent.sh" "$WORKTREE_DIR" "/code-with-task $TASK_KEYWORD"
