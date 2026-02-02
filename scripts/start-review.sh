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
#   3. Places .claude/settings.local.json for auto-permission
#   4. Splits a tmux pane (-d to keep focus)
#   5. Launches claude interactively, waits, sends review prompt

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

# --- 3. Auto-permission settings (always overwrite) ---
echo "[start-review] Setting up auto-permission..."
mkdir -p "$WORKTREE_DIR/.claude"
cat > "$WORKTREE_DIR/.claude/settings.local.json" << 'SETTINGS_EOF'
{
  "permissions": {
    "allow": [
      "Bash(*)",
      "Read(*)",
      "Write(*)",
      "Edit(*)",
      "Grep(*)",
      "Glob(*)",
      "mcp__serena__*"
    ]
  }
}
SETTINGS_EOF

# --- 4. Split pane ---
if [ -z "${TMUX:-}" ]; then
  echo "[start-review] ERROR: Not in a tmux session. Run: tmux new-session -s main"
  exit 1
fi

echo "[start-review] Splitting tmux pane..."
tmux split-window -h -d -c "$WORKTREE_DIR"

PANE_INDEX=$(tmux list-panes -F '#{pane_index}' | sort -n | tail -1)
echo "[start-review] Review pane: $PANE_INDEX"

# --- 5. Launch Claude and send review prompt ---
echo "[start-review] Launching Claude in pane $PANE_INDEX..."
tmux send-keys -t "$PANE_INDEX" 'claude'
sleep 1
tmux send-keys -t "$PANE_INDEX" Enter

echo "[start-review] Waiting for Claude to start..."
for i in $(seq 1 30); do
  sleep 2
  if tmux capture-pane -t "$PANE_INDEX" -p 2>/dev/null | grep -q '? for shortcuts'; then
    echo "[start-review] Claude is ready (after ~$((i * 2))s)"
    break
  fi
  if [ "$i" -eq 30 ]; then
    echo "[start-review] WARNING: Claude startup not detected after 60s."
    echo "[start-review] Send prompt manually:"
    echo "  tmux send-keys -t $PANE_INDEX '/review-pr-local $PR_NUMBER'"
    echo "  tmux send-keys -t $PANE_INDEX Enter"
    exit 0
  fi
done

echo "[start-review] Sending review prompt..."
tmux send-keys -t "$PANE_INDEX" "/review-pr-local $PR_NUMBER"
sleep 1
tmux send-keys -t "$PANE_INDEX" Enter

echo "[start-review] Done. Reviewer running in pane $PANE_INDEX."
echo "[start-review] Monitor: tmux capture-pane -t $PANE_INDEX -p | tail -20"
