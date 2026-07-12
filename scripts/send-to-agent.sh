#!/usr/bin/env bash
set -euo pipefail

# Send a prompt/instruction to a running Claude agent via herdr.
#
# Usage: send-to-agent.sh <target> <prompt>
#   target: herdr pane id (e.g. w13:p2) or unique agent name
#
# Example: send-to-agent.sh feat-clipboard "/review-pr 44"
# Example: send-to-agent.sh w13:p2 "Fix the failing test in results.test.ts"
#
# Prerequisites:
#   - Agent must be in "idle" or "starting" state
#
# `herdr pane run` submits the text and Enter atomically, so there are no
# input races (unlike tmux send-keys).

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
source "$SCRIPT_DIR/herdr-lib.sh"

TARGET="${1:?Usage: send-to-agent.sh <target> <prompt>}"
PROMPT="${2:?Usage: send-to-agent.sh <target> <prompt>}"

# Resolve target to a pane id and verify the agent exists
AGENT_JSON=$(herdr agent get "$TARGET" 2>/dev/null || true)
if [ -z "$AGENT_JSON" ] || echo "$AGENT_JSON" | jq -e '.error' >/dev/null 2>&1; then
  echo "[send-to-agent] ERROR: Agent not found: $TARGET" >&2
  exit 1
fi
PANE_ID=$(echo "$AGENT_JSON" | jq -r '.result.agent.pane_id')
STATE=$(echo "$AGENT_JSON" | jq -r '.result.agent.agent_status')

if [ "$STATE" != "idle" ] && [ "$STATE" != "done" ] && [ "$STATE" != "unknown" ]; then
  echo "[send-to-agent] ERROR: Agent is not ready for input (state: $STATE)" >&2
  echo "[send-to-agent] Wait for the agent to finish its current task" >&2
  exit 1
fi

echo "[send-to-agent] Sending prompt to pane $PANE_ID..."
herdr pane run "$PANE_ID" "$PROMPT" >/dev/null

echo "[send-to-agent] Prompt sent successfully"
