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
PANE_ID=$(tmux split-window -h -d -c "$WORKTREE_DIR" -P -F '#{pane_id}')
echo "[$SCRIPT_NAME] Agent pane: $PANE_ID"

# --- 3. Launch Claude interactively ---
# NOTE: text and Enter must be separate send-keys calls (sleep 1 between).
echo "[$SCRIPT_NAME] Launching Claude in pane $PANE_ID..."
tmux send-keys -t "$PANE_ID" 'claude'
sleep 1
tmux send-keys -t "$PANE_ID" Enter

echo "[$SCRIPT_NAME] Waiting for Claude to start..."
TRUST_HANDLED=false
# Timeout: 45 iterations × 2s = 90s (extra headroom for parallel launches)
for i in $(seq 1 45); do
  sleep 2
  PANE_CONTENT=$(tmux capture-pane -t "$PANE_ID" -p 2>/dev/null || true)

  # Handle "Trust this folder?" prompt (appears on first launch in new directories)
  if [ "$TRUST_HANDLED" = false ] && echo "$PANE_CONTENT" | grep -q 'Yes, I trust this folder'; then
    echo "[$SCRIPT_NAME] Trust prompt detected, auto-accepting..."
    tmux send-keys -t "$PANE_ID" Enter
    TRUST_HANDLED=true
    continue
  fi

  # Detect Claude ready state via multiple patterns (robust against format changes)
  # - "❯" or ">" prompt character: always shown when Claude is waiting for input
  # - "? for shortcuts": shown in some Claude Code versions
  # - 'Try "': hint text shown on idle prompt
  if echo "$PANE_CONTENT" | grep -qE '(❯|^> |[?] for shortcuts|Try ")'; then
    echo "[$SCRIPT_NAME] Claude is ready (after ~$((i * 2))s)"
    break
  fi
  if [ "$i" -eq 45 ]; then
    echo "[$SCRIPT_NAME] WARNING: Claude startup not detected after 90s."
    echo "[$SCRIPT_NAME] Send prompt manually:"
    echo "  tmux send-keys -t $PANE_ID '$PROMPT'"
    echo "  sleep 1"
    echo "  tmux send-keys -t $PANE_ID Enter"
    exit 0
  fi
done

# --- 4. Send prompt ---
# NOTE: Always send text and Enter as separate send-keys calls with sleep 1
# in between. Combining them (e.g. 'text' Enter) can cause input races.
echo "[$SCRIPT_NAME] Sending prompt..."
tmux send-keys -t "$PANE_ID" "$PROMPT"
sleep 1
tmux send-keys -t "$PANE_ID" Enter

# NOTE: This script does NOT call tmux select-layout. The caller is
# responsible for applying the desired layout after all workers are launched
# (e.g. via scripts/apply-layout.sh).
echo "[$SCRIPT_NAME] Done. Agent running in pane $PANE_ID."
echo "[$SCRIPT_NAME] Monitor: tmux capture-pane -t $PANE_ID -p | tail -20"
