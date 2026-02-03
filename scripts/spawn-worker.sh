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
#   1. Creates worktree manually (no workmux)
#   2. Sets role marker in CLAUDE.md
#   3. Appends step scope if provided
#   4. Delegates to launch-agent.sh for pane + Claude setup

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
BRANCH="${1:?Usage: spawn-worker.sh <branch-name> <task-keyword> [step-scope]}"
TASK_KEYWORD="${2:?Usage: spawn-worker.sh <branch-name> <task-keyword> [step-scope]}"
STEP_SCOPE="${3:-}"

WORKTREE_BASE="/workspaces/reference-manager--worktrees"
WORKTREE_DIR="$WORKTREE_BASE/$(echo "$BRANCH" | tr '/' '-')"

# --- 1. Create worktree ---
# All agents run in panes within the current tmux window (no separate windows).
if [ -d "$WORKTREE_DIR" ]; then
  echo "[spawn-worker] Worktree already exists: $WORKTREE_DIR"
else
  echo "[spawn-worker] Creating worktree manually..."
  mkdir -p "$WORKTREE_BASE"
  git worktree add "$WORKTREE_DIR" -b "$BRANCH"
  (cd "$WORKTREE_DIR" && npm install)
fi

# --- 2. Set role marker in CLAUDE.md ---
echo "[spawn-worker] Setting role to 'implement' in CLAUDE.md..."
"$SCRIPT_DIR/set-role.sh" "$WORKTREE_DIR" implement

# --- 3. Append step scope if provided ---
if [ -n "$STEP_SCOPE" ]; then
  echo "[spawn-worker] Appending step scope to CLAUDE.md..."
  # Remove any existing Worker Scope section
  sed -i '/^### Worker Scope$/,/^###/{ /^### Worker Scope$/d; /^###/!d; }' "$WORKTREE_DIR/CLAUDE.md" 2>/dev/null || true

  # Append new scope (before the role marker)
  sed -i "/^<!-- role: implement -->$/i\\
\\
### Worker Scope\\
\\
**This worker is responsible for: $STEP_SCOPE**\\
Do NOT implement steps outside this scope. Other workers handle the rest." "$WORKTREE_DIR/CLAUDE.md"
fi

# --- 4. Delegate to launch-agent.sh ---
export LAUNCH_AGENT_LABEL="spawn-worker"
exec "$SCRIPT_DIR/launch-agent.sh" "$WORKTREE_DIR" "/code-with-task $TASK_KEYWORD"
