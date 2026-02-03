#!/usr/bin/env bash
set -euo pipefail

# Check the state of a Claude agent in a tmux pane.
#
# Usage: check-agent-state.sh <pane-id>
# Example: check-agent-state.sh %42
#
# Output:
#   idle     - Agent is waiting for input (prompt visible)
#   working  - Agent is executing a task
#   trust    - Trust prompt is displayed
#   starting - Agent is starting up
#   unknown  - Cannot determine state
#
# State file location: /tmp/claude-agent-states/<pane-id>

STATE_DIR="/tmp/claude-agent-states"
PANE="${1:?Usage: check-agent-state.sh <pane-id>}"

# Check if pane exists
if ! tmux has-session -t "$PANE" 2>/dev/null; then
  echo "error"
  exit 1
fi

# First, check the state file (hook-based state tracking)
STATE_FILE="$STATE_DIR/$PANE"
if [ -f "$STATE_FILE" ]; then
  STATE=$(cat "$STATE_FILE" 2>/dev/null || echo "unknown")
  if [ -n "$STATE" ] && [ "$STATE" != "unknown" ]; then
    echo "$STATE"
    exit 0
  fi
fi

# Fallback: parse tmux pane content
# Use -J to join wrapped lines (handles narrow panes)
CONTENT=$(tmux capture-pane -t "$PANE" -p -J 2>/dev/null || true)

if [ -z "$CONTENT" ]; then
  echo "unknown"
  exit 0
fi

# Check for Trust prompt (appears on first launch in new directories)
if echo "$CONTENT" | grep -q 'Yes, I trust this folder'; then
  echo "trust"
  exit 0
fi

# Check for idle state (input prompt visible)
# Multiple patterns for different Claude Code versions
if echo "$CONTENT" | grep -qE '(^|\s)(❯|>)\s*$'; then
  echo "idle"
  exit 0
fi

if echo "$CONTENT" | grep -qE '\? for shortcuts'; then
  echo "idle"
  exit 0
fi

if echo "$CONTENT" | grep -qE 'Try "'; then
  echo "idle"
  exit 0
fi

# Check for permission prompt
if echo "$CONTENT" | grep -qE '(Allow|Deny|Trust).*\?'; then
  echo "permission"
  exit 0
fi

# Default: assume working
echo "working"
