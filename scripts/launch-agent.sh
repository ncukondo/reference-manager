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
#   1. Writes .claude/settings.local.json for auto-permission + state hooks
#   2. Splits a tmux pane (-d to keep focus on current pane)
#   3. Launches claude interactively, waits for startup
#   4. Sends the prompt

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
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

# State file directory for hook-based state tracking
WORKER_STATE_DIR="/tmp/claude-agent-states"
mkdir -p "$WORKER_STATE_DIR"

# --- 2. Split pane ---
echo "[$SCRIPT_NAME] Splitting tmux pane..."
PANE_ID=$(tmux split-window -h -d -c "$WORKTREE_DIR" -P -F '#{pane_id}')
echo "[$SCRIPT_NAME] Agent pane: $PANE_ID"

# --- 2b. Write settings with hooks (now that we have PANE_ID) ---
# State file path uses PANE_ID (e.g., %5 -> /tmp/claude-agent-states/%5)
STATE_FILE="$WORKER_STATE_DIR/$PANE_ID"
echo "[$SCRIPT_NAME] State file: $STATE_FILE"

cat > "$WORKTREE_DIR/.claude/settings.local.json" << SETTINGS_EOF
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
  ],
  "hooks": {
    "Stop": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "echo idle > '$STATE_FILE'"
          }
        ]
      }
    ],
    "PreToolUse": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "echo working > '$STATE_FILE'",
            "async": true
          }
        ]
      }
    ],
    "Notification": [
      {
        "matcher": "permission_prompt",
        "hooks": [
          {
            "type": "command",
            "command": "echo permission > '$STATE_FILE'"
          }
        ]
      },
      {
        "matcher": "idle_prompt",
        "hooks": [
          {
            "type": "command",
            "command": "echo idle > '$STATE_FILE'"
          }
        ]
      }
    ],
    "SessionStart": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "mkdir -p '$WORKER_STATE_DIR' && echo starting > '$STATE_FILE'"
          }
        ]
      }
    ],
    "SessionEnd": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "rm -f '$STATE_FILE'"
          }
        ]
      }
    ]
  }
}
SETTINGS_EOF

# Initialize state file
echo "starting" > "$STATE_FILE"

# --- 3. Launch Claude interactively ---
# NOTE: text and Enter must be separate send-keys calls (sleep 1 between).
# Set CLAUDE_WORKER_ID to identify this agent
echo "[$SCRIPT_NAME] Launching Claude in pane $PANE_ID..."
tmux send-keys -t "$PANE_ID" "CLAUDE_WORKER_ID='$PANE_ID' claude"
sleep 1
tmux send-keys -t "$PANE_ID" Enter

echo "[$SCRIPT_NAME] Waiting for Claude to start..."
DETECTED=false
# Timeout: 45 iterations × 2s = 90s (extra headroom for parallel launches)
for i in $(seq 1 45); do
  sleep 2

  # Use check-agent-state.sh for robust state detection
  # This handles narrow panes (via -J) and distinguishes Trust prompt from input prompt
  STATE=$("$SCRIPT_DIR/check-agent-state.sh" "$PANE_ID" 2>/dev/null || echo "error")

  case "$STATE" in
    trust)
      echo "[$SCRIPT_NAME] Trust prompt detected, auto-accepting..."
      tmux send-keys -t "$PANE_ID" Enter
      # Continue waiting for idle state after accepting trust
      ;;
    idle)
      echo "[$SCRIPT_NAME] Claude is ready (after ~$((i * 2))s)"
      DETECTED=true
      break
      ;;
    working)
      # Agent is initializing, keep waiting
      ;;
    *)
      # Error or unexpected state, keep waiting
      ;;
  esac
done

if [ "$DETECTED" = false ]; then
  echo "[$SCRIPT_NAME] WARNING: Claude startup not detected after 90s. Sending prompt anyway as fallback."
fi

# --- 4. Send prompt ---
# NOTE: Always send text and Enter as separate send-keys calls with sleep 1
# in between. Combining them (e.g. 'text' Enter) can cause input races.
# This runs on both success and timeout — if Claude isn't ready yet,
# the keys will wait in the input buffer and be processed once it starts.
echo "[$SCRIPT_NAME] Sending prompt..."
tmux send-keys -t "$PANE_ID" "$PROMPT"
sleep 1
tmux send-keys -t "$PANE_ID" Enter

# NOTE: This script does NOT call tmux select-layout. The caller is
# responsible for applying the desired layout after all workers are launched
# (e.g. via scripts/apply-layout.sh).
echo "[$SCRIPT_NAME] Done. Agent running in pane $PANE_ID."
echo "[$SCRIPT_NAME] Monitor: tmux capture-pane -t $PANE_ID -p | tail -20"
