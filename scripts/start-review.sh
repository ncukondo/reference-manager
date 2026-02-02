#!/usr/bin/env bash
set -euo pipefail

# Start a review agent for a PR in a tmux pane.
#
# Usage: start-review.sh <pr-number>
# Example: start-review.sh 56
#
# What it does:
#   1. Gets branch name from PR
#   2. Creates worktree if not exists
#   3. Appends review instructions to CLAUDE.md
#   4. Delegates to launch-agent.sh for pane + Claude setup

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PR_NUMBER="${1:?Usage: start-review.sh <pr-number>}"

WORKTREE_BASE="/workspaces/reference-manager--worktrees"

# --- 1. Get branch name from PR ---
echo "[start-review] Fetching PR #$PR_NUMBER info..."
BRANCH=$(gh pr view "$PR_NUMBER" --json headRefName --jq '.headRefName')
if [ -z "$BRANCH" ]; then
  echo "[start-review] ERROR: Could not get branch name for PR #$PR_NUMBER"
  exit 1
fi
echo "[start-review] Branch: $BRANCH"

WORKTREE_DIR="$WORKTREE_BASE/$(echo "$BRANCH" | tr '/' '-')"

# --- 2. Create worktree if not exists ---
if [ -d "$WORKTREE_DIR" ]; then
  echo "[start-review] Worktree already exists: $WORKTREE_DIR"
else
  echo "[start-review] Creating worktree..."
  git fetch origin "$BRANCH"
  git worktree add "$WORKTREE_DIR" "$BRANCH"
  (cd "$WORKTREE_DIR" && npm install)
fi

# --- 3. Append review instructions to CLAUDE.md ---
echo "[start-review] Appending review instructions to CLAUDE.md..."
if ! grep -q '## Review Agent Instructions' "$WORKTREE_DIR/CLAUDE.md" 2>/dev/null; then
  cat >> "$WORKTREE_DIR/CLAUDE.md" << 'CLAUDE_EOF'

## Review Agent Instructions

You are a review agent for a PR in this worktree.

### Responsibilities
- **All PR comments and review bodies MUST be in English**
CLAUDE_EOF
fi

# --- 4. Delegate to launch-agent.sh ---
export LAUNCH_AGENT_LABEL="start-review"
exec "$SCRIPT_DIR/launch-agent.sh" "$WORKTREE_DIR" "/review-pr-local $PR_NUMBER"
