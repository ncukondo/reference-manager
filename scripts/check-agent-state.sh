#!/usr/bin/env bash
set -euo pipefail

# Check the state of a Claude agent managed by herdr.
#
# Usage: check-agent-state.sh <target>
#   target: herdr pane id (e.g. w13:p2), unique agent name, or terminal id
#
# Output: "idle", "working", "permission", or "starting"
#   idle       - Agent is ready for input (herdr: idle or done)
#   working    - Agent is processing a task
#   permission - Agent is blocked on a prompt/dialog, needs attention
#   starting   - Agent detected but state not yet known
#
# Exits 1 with "error: agent not found" if the target has no detected agent.
#
# Note: startup dialogs (MCP server confirmation etc.) may be reported as
# "idle" by herdr. Do not treat "idle" alone as proof of task completion;
# combine with output checks (herdr agent read) or gh-based verification.

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
source "$SCRIPT_DIR/herdr-lib.sh"

TARGET="${1:?Usage: check-agent-state.sh <target>}"

STATUS=$(agent_status "$TARGET")

case "$STATUS" in
  done)
    # herdr reports "done" after a task completes; treat as ready for input
    echo "idle"
    ;;
  idle|working)
    echo "$STATUS"
    ;;
  blocked)
    echo "permission"
    ;;
  unknown)
    echo "starting"
    ;;
  *)
    echo "error: agent not found" >&2
    exit 1
    ;;
esac
