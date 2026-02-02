#!/usr/bin/env bash
set -euo pipefail

# Launch a Claude agent in a tmux pane for a given worktree.
#
# Usage: launch-agent.sh <worktree-dir> <prompt>
# Example: launch-agent.sh /path/to/worktree "/code-with-task clipboard"
#
# Prerequisites:
#   - Worktree must already exist
#   - Must be inside a tmux session
#
# What it does:
#   1. Writes .claude/settings.local.json for auto-permission
#   2. Splits a tmux pane (-d to keep focus on current pane)
#   3. Launches claude interactively, waits for startup
#   4. Sends the prompt

WORKTREE_DIR="${1:?Usage: launch-agent.sh <worktree-dir> <prompt>}"
PROMPT="${2:?Usage: launch-agent.sh <worktree-dir> <prompt>}"
SCRIPT_NAME="${LAUNCH_AGENT_LABEL:-launch-agent}"

if [ ! -d "$WORKTREE_DIR" ]; then
  echo "[$SCRIPT_NAME] ERROR: Worktree does not exist: $WORKTREE_DIR"
  exit 1
fi

if [ -z "${TMUX:-}" ]; then
  echo "[$SCRIPT_NAME] ERROR: Not in a tmux session. Run: tmux new-session -s main"
  exit 1
fi

# --- 1. Auto-permission settings (always overwrite) ---
echo "[$SCRIPT_NAME] Setting up auto-permission..."
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

# --- 2. Split pane ---
echo "[$SCRIPT_NAME] Splitting tmux pane..."
tmux split-window -h -d -c "$WORKTREE_DIR"

PANE_INDEX=$(tmux list-panes -F '#{pane_index}' | sort -n | tail -1)
echo "[$SCRIPT_NAME] Agent pane: $PANE_INDEX"

# --- 3. Launch Claude interactively ---
echo "[$SCRIPT_NAME] Launching Claude in pane $PANE_INDEX..."
tmux send-keys -t "$PANE_INDEX" 'claude'
sleep 1
tmux send-keys -t "$PANE_INDEX" Enter

echo "[$SCRIPT_NAME] Waiting for Claude to start..."
for i in $(seq 1 30); do
  sleep 2
  if tmux capture-pane -t "$PANE_INDEX" -p 2>/dev/null | grep -q '? for shortcuts'; then
    echo "[$SCRIPT_NAME] Claude is ready (after ~$((i * 2))s)"
    break
  fi
  if [ "$i" -eq 30 ]; then
    echo "[$SCRIPT_NAME] WARNING: Claude startup not detected after 60s."
    echo "[$SCRIPT_NAME] Send prompt manually:"
    echo "  tmux send-keys -t $PANE_INDEX '$PROMPT'"
    echo "  tmux send-keys -t $PANE_INDEX Enter"
    exit 0
  fi
done

# --- 4. Send prompt ---
echo "[$SCRIPT_NAME] Sending prompt..."
tmux send-keys -t "$PANE_INDEX" "$PROMPT"
sleep 1
tmux send-keys -t "$PANE_INDEX" Enter

echo "[$SCRIPT_NAME] Done. Agent running in pane $PANE_INDEX."
echo "[$SCRIPT_NAME] Monitor: tmux capture-pane -t $PANE_INDEX -p | tail -20"
