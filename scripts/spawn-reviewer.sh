#!/usr/bin/env bash
set -euo pipefail

# Spawn a reviewer agent for a PR in a new tmux pane.
#
# Usage: spawn-reviewer.sh <pr-number>
# Example: spawn-reviewer.sh 56
#
# What it does:
#   1. Gets branch name from PR
#   2. Creates worktree if not exists (fetches branch from origin)
#   3. Sets role to 'review' in CLAUDE.md
#   4. Delegates to launch-agent.sh for pane + Claude setup

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PR_NUMBER="${1:?Usage: spawn-reviewer.sh <pr-number>}"

WORKTREE_BASE="/workspaces/reference-manager--worktrees"

# --- 1. Get branch name from PR ---
echo "[spawn-reviewer] Fetching PR #$PR_NUMBER info..."
BRANCH=$(gh pr view "$PR_NUMBER" --json headRefName --jq '.headRefName')
if [ -z "$BRANCH" ]; then
  echo "[spawn-reviewer] ERROR: Could not get branch name for PR #$PR_NUMBER" >&2
  exit 1
fi
echo "[spawn-reviewer] Branch: $BRANCH"

WORKTREE_DIR="$WORKTREE_BASE/$(echo "$BRANCH" | tr '/' '-')"

# --- 2. Create worktree if not exists ---
if [ -d "$WORKTREE_DIR" ]; then
  echo "[spawn-reviewer] Worktree already exists: $WORKTREE_DIR"
else
  echo "[spawn-reviewer] Creating worktree..."
  mkdir -p "$WORKTREE_BASE"
  git fetch origin "$BRANCH"
  git worktree add "$WORKTREE_DIR" "$BRANCH"
  (cd "$WORKTREE_DIR" && npm install)
fi

# --- 3. Set role to 'review' ---
echo "[spawn-reviewer] Setting role to 'review' in CLAUDE.md..."
"$SCRIPT_DIR/set-role.sh" "$WORKTREE_DIR" review

# --- 4. Delegate to launch-agent.sh ---
export LAUNCH_AGENT_LABEL="spawn-reviewer"
exec "$SCRIPT_DIR/launch-agent.sh" "$WORKTREE_DIR" "/review-pr $PR_NUMBER"
