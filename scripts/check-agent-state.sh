#!/usr/bin/env bash
set -euo pipefail

# Check the state of a Claude Code agent running in a tmux pane.
#
# Usage: check-agent-state.sh <pane-id>
# Output: "trust", "permission", "idle", or "working"
#
# States:
#   permission - Permission prompt is displayed, needs approval
#   trust      - Trust prompt is displayed, needs Enter to accept
#   idle       - Agent is ready for input (prompt ❯ visible)
#   working    - Agent is processing a task
#   starting   - Agent is starting up
#
# Detection methods (in priority order):
#   1. Hooks-based state file (/tmp/claude-agent-states/<pane-id>)
#   2. tmux capture-pane fallback (for non-script-launched agents)

PANE="${1:?Usage: check-agent-state.sh <pane-id>}"
WORKER_STATE_DIR="/tmp/claude-agent-states"
STATE_FILE="$WORKER_STATE_DIR/$PANE"

# Track if we're in starting state (used to relax working indicator detection)
IS_STARTING=false

# --- Method 1: Hooks-based state file (highest priority) ---
if [[ -f "$STATE_FILE" ]]; then
  # Check file age - if older than 120s, consider it stale
  if [[ "$(uname)" == "Darwin" ]]; then
    # macOS
    FILE_MTIME=$(stat -f %m "$STATE_FILE" 2>/dev/null || echo 0)
  else
    # Linux
    FILE_MTIME=$(stat -c %Y "$STATE_FILE" 2>/dev/null || echo 0)
  fi
  NOW=$(date +%s)
  AGE=$((NOW - FILE_MTIME))

  if [[ $AGE -lt 120 ]]; then
    STATE=$(cat "$STATE_FILE" 2>/dev/null || echo "")
    if [[ -n "$STATE" ]]; then
      # "starting" state means hooks are set up but idle_prompt hasn't fired yet
      # (idle_prompt only fires after 60s of idle). Fall through to tmux detection.
      if [[ "$STATE" == "starting" ]]; then
        IS_STARTING=true
        # Fall through to tmux detection below
      # Map "permission" to "trust" for backward compatibility with callers
      # that expect "trust" for any permission-related prompt
      elif [[ "$STATE" == "permission" ]]; then
        echo "trust"
        exit 0
      else
        echo "$STATE"
        exit 0
      fi
    fi
  fi
fi

# --- Method 2: tmux capture-pane fallback ---
# Check pane exists
if ! tmux has-session -t "$PANE" 2>/dev/null; then
  echo "error: pane not found"
  exit 1
fi

# Capture pane content (include scroll-back to ensure we get content)
# Note: Don't use tail here - narrow panes or short content may push ❯ outside the range
CONTENT=$(tmux capture-pane -t "$PANE" -p -S -50 2>/dev/null)

# Trust prompt detection:
#   - Contains "folder" (from "trust this folder" prompt)
#   - Contains "confirm" (from "Enter to confirm")
#   Note: We use short keywords because narrow panes cause line wrapping
#   that can split longer phrases across lines.
if echo "$CONTENT" | grep -q 'folder' && \
   echo "$CONTENT" | grep -q 'confirm'; then
  echo "trust"
  exit 0
fi

# Idle detection:
#   - Has input prompt "❯" (with or without suggestion text)
#   - The prompt line itself has no spinner characters
#   Note: In narrow panes, "❯" may not be at line start due to wrapping.
#   We check for "❯" anywhere, then check if the PROMPT LINE has spinners.
#   This avoids false positives from MCP server connection spinners that appear
#   above the prompt line during startup.
if echo "$CONTENT" | grep -q '❯'; then
  # Get the last line containing ❯ (the actual input prompt line)
  PROMPT_LINE=$(echo "$CONTENT" | grep '❯' | tail -1)

  # Check for spinner characters only on the prompt line itself
  if echo "$PROMPT_LINE" | grep -qE '(⠋|⠙|⠹|⠸|⠼|⠴|⠦|⠧|⠇|⠏)'; then
    echo "working"
  else
    echo "idle"
  fi
  exit 0
fi

# No "❯" prompt found
# If state file says "starting", return "starting" (Claude may still be initializing,
# or tmux capture-pane hasn't caught up with the display yet)
if [[ "$IS_STARTING" == "true" ]]; then
  echo "starting"
  exit 0
fi

# Otherwise, agent is working
echo "working"
