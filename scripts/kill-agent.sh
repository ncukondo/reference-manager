#!/usr/bin/env bash
set -euo pipefail

# Kill a Claude Code agent running in a tmux pane.
#
# Usage: kill-agent.sh <pane-id> [--keep-pane]
# Example: kill-agent.sh %9
# Example: kill-agent.sh %9 --keep-pane
#
# What it does:
#   1. Sends SIGINT (Ctrl+C) to interrupt any running operation
#   2. Sends /exit to quit Claude Code
#   3. Confirms exit with 'y'
#   4. Verifies Claude has exited
#   5. Kills the pane (unless --keep-pane is specified)
#
# Worktree is always preserved.

PANE_ID="${1:?Usage: kill-agent.sh <pane-id> [--keep-pane]}"
KEEP_PANE=false
if [ "${2:-}" = "--keep-pane" ]; then
  KEEP_PANE=true
fi

# Check pane exists
if ! tmux has-session -t "$PANE_ID" 2>/dev/null; then
  echo "[kill-agent] Pane $PANE_ID does not exist, nothing to do."
  exit 0
fi

echo "[kill-agent] Stopping Claude in pane $PANE_ID..."

# Step 1: Ctrl+C to interrupt any running operation
tmux send-keys -t "$PANE_ID" C-c
sleep 1

# Step 2: Send Escape (in case of a prompt/menu), then /exit
tmux send-keys -t "$PANE_ID" Escape
sleep 0.5
tmux send-keys -t "$PANE_ID" '/exit'
sleep 1
tmux send-keys -t "$PANE_ID" Enter
sleep 2

# Step 3: Confirm exit with 'y'
tmux send-keys -t "$PANE_ID" 'y'
sleep 0.5
tmux send-keys -t "$PANE_ID" Enter
sleep 2

# Step 4: Verify Claude has exited by checking if prompt is bash/zsh
PANE_CMD=$(tmux display-message -t "$PANE_ID" -p '#{pane_current_command}' 2>/dev/null || echo "unknown")
if [ "$PANE_CMD" = "claude" ]; then
  echo "[kill-agent] WARNING: Claude may still be running (command: $PANE_CMD). Sending SIGTERM..."
  # Get the PID of the process in the pane and kill it
  PANE_PID=$(tmux display-message -t "$PANE_ID" -p '#{pane_pid}' 2>/dev/null || echo "")
  if [ -n "$PANE_PID" ]; then
    # Kill child processes (claude) of the shell in the pane
    pkill -TERM -P "$PANE_PID" 2>/dev/null || true
    sleep 2
  fi
fi

# Step 5: Kill pane or keep it
if [ "$KEEP_PANE" = true ]; then
  echo "[kill-agent] Claude stopped. Pane $PANE_ID kept (bash prompt)."
else
  tmux kill-pane -t "$PANE_ID" 2>/dev/null || true
  echo "[kill-agent] Pane $PANE_ID killed."
fi
