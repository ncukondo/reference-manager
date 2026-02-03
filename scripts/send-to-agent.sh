#!/usr/bin/env bash
set -euo pipefail

# Send a prompt/instruction to a Claude agent in a tmux pane.
#
# Usage: send-to-agent.sh <pane-id> <prompt>
# Example: send-to-agent.sh %31 "/review-pr 44"
# Example: send-to-agent.sh %31 "Fix the failing test in results.test.ts"
#
# Prerequisites:
#   - Agent must be in "idle" or "starting" state
#   - Pane must exist
#
# This script:
#   1. Verifies the agent is ready for input (idle or starting)
#   2. Sends the prompt text
#   3. Waits 1 second (important for tmux input handling)
#   4. Sends Enter to execute
#
# Note: Text and Enter MUST be sent separately with sleep 1 in between
# to avoid input races (per tmux send-keys best practices).

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PANE="${1:?Usage: send-to-agent.sh <pane-id> <prompt>}"
PROMPT="${2:?Usage: send-to-agent.sh <pane-id> <prompt>}"

# Check pane exists
if ! tmux has-session -t "$PANE" 2>/dev/null; then
  echo "[send-to-agent] ERROR: Pane $PANE does not exist" >&2
  exit 1
fi

# Check agent state
# Accept both "idle" and "starting" - starting means Claude is up but idle_prompt
# hook hasn't fired yet (it fires after 60s of idle). The agent can still accept input.
STATE=$("$SCRIPT_DIR/check-agent-state.sh" "$PANE" 2>/dev/null || echo "error")

if [ "$STATE" = "error" ]; then
  echo "[send-to-agent] ERROR: Could not determine agent state" >&2
  exit 1
fi

if [ "$STATE" != "idle" ] && [ "$STATE" != "starting" ]; then
  echo "[send-to-agent] ERROR: Agent is not ready for input (state: $STATE)" >&2
  echo "[send-to-agent] Wait for the agent to finish its current task" >&2
  exit 1
fi

# Send the prompt
# NOTE: Always send text and Enter separately with sleep in between
# to avoid input races (per tmux send-keys best practices)
echo "[send-to-agent] Sending prompt to pane $PANE..."
tmux send-keys -t "$PANE" "$PROMPT"
sleep 1
tmux send-keys -t "$PANE" Enter

echo "[send-to-agent] Prompt sent successfully"
