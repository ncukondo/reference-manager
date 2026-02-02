#!/usr/bin/env bash
set -euo pipefail

# Spawn a worker agent in a tmux pane with a worktree.
#
# Usage: spawn-worker.sh <branch-name> <task-keyword>
# Example: spawn-worker.sh feature/clipboard-support clipboard
#
# What it does:
#   1. Creates worktree (via workmux or manually)
#   2. Places .claude/settings.local.json for auto-permission
#   3. Appends worker instructions to CLAUDE.md
#   4. Splits a tmux pane (-d to keep focus)
#   5. Launches claude interactively, waits, sends prompt

BRANCH="${1:?Usage: spawn-worker.sh <branch-name> <task-keyword>}"
TASK_KEYWORD="${2:?Usage: spawn-worker.sh <branch-name> <task-keyword>}"

WORKTREE_BASE="/workspaces/reference-manager--worktrees"
# workmux uses hyphenated directory names
WORKTREE_DIR="$WORKTREE_BASE/$(echo "$BRANCH" | tr '/' '-')"

# --- 1. Create worktree ---
if command -v workmux &>/dev/null; then
  echo "[spawn-worker] Creating worktree via workmux..."
  workmux add "$BRANCH" -b
else
  echo "[spawn-worker] Creating worktree manually..."
  git worktree add "$WORKTREE_DIR" -b "$BRANCH"
  (cd "$WORKTREE_DIR" && npm install)
fi

# --- 2. Auto-permission settings ---
echo "[spawn-worker] Setting up auto-permission..."
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
  },
  "enableAllProjectMcpServers": true,
  "enabledMcpjsonServers": [
    "serena"
  ]
}
SETTINGS_EOF

# --- 3. Append worker instructions to CLAUDE.md ---
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

# --- 4. Split pane ---
if [ -z "${TMUX:-}" ]; then
  echo "[spawn-worker] ERROR: Not in a tmux session. Run: tmux new-session -s main"
  exit 1
fi

echo "[spawn-worker] Splitting tmux pane..."
tmux split-window -h -d -c "$WORKTREE_DIR"

# Get the new pane index (highest index in current window)
PANE_INDEX=$(tmux list-panes -F '#{pane_index}' | sort -n | tail -1)
echo "[spawn-worker] Worker pane: $PANE_INDEX"

# --- 5. Launch Claude and send prompt ---
echo "[spawn-worker] Launching Claude in pane $PANE_INDEX..."
tmux send-keys -t "$PANE_INDEX" 'claude'
sleep 1
tmux send-keys -t "$PANE_INDEX" Enter

echo "[spawn-worker] Waiting for Claude to start..."
for i in $(seq 1 30); do
  sleep 2
  if tmux capture-pane -t "$PANE_INDEX" -p 2>/dev/null | grep -q '? for shortcuts'; then
    echo "[spawn-worker] Claude is ready (after ~$((i * 2))s)"
    break
  fi
  if [ "$i" -eq 30 ]; then
    echo "[spawn-worker] WARNING: Claude startup not detected after 60s."
    echo "[spawn-worker] Send prompt manually:"
    echo "  tmux send-keys -t $PANE_INDEX '/code-with-task $TASK_KEYWORD'"
    echo "  tmux send-keys -t $PANE_INDEX Enter"
    exit 0
  fi
done

echo "[spawn-worker] Sending prompt..."
tmux send-keys -t "$PANE_INDEX" "/code-with-task $TASK_KEYWORD"
sleep 1
tmux send-keys -t "$PANE_INDEX" Enter

echo "[spawn-worker] Done. Worker running in pane $PANE_INDEX."
echo "[spawn-worker] Monitor: tmux capture-pane -t $PANE_INDEX -p | tail -20"
