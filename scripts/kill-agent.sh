#!/usr/bin/env bash
set -euo pipefail

# Stop a Claude agent running in a herdr pane.
#
# Usage: kill-agent.sh <target> [--keep-pane]
#   target: herdr pane id (e.g. w13:p2) or unique agent name
#
# Default: closes the pane (terminates claude with it).
# --keep-pane: exits claude gracefully with /exit but keeps the shell pane.
#
# Worktree and workspace are always preserved (merge-pr.sh removes them).

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
source "$SCRIPT_DIR/herdr-lib.sh"

TARGET="${1:?Usage: kill-agent.sh <target> [--keep-pane]}"
KEEP_PANE=false
if [ "${2:-}" = "--keep-pane" ]; then
  KEEP_PANE=true
fi

# Resolve target to a pane id (fall back to treating the target as a pane id
# when no agent is detected, e.g. claude already exited)
AGENT_JSON=$(herdr agent get "$TARGET" 2>/dev/null || true)
if [ -n "$AGENT_JSON" ] && ! echo "$AGENT_JSON" | jq -e '.error' >/dev/null 2>&1; then
  PANE_ID=$(echo "$AGENT_JSON" | jq -r '.result.agent.pane_id')
else
  PANE_ID="$TARGET"
fi

if ! pane_exists "$PANE_ID"; then
  echo "[kill-agent] Pane $PANE_ID does not exist, nothing to do."
  exit 0
fi

if [ "$KEEP_PANE" = true ]; then
  echo "[kill-agent] Exiting Claude gracefully in pane $PANE_ID..."
  # Escape interrupts any running operation / dismisses menus
  herdr pane send-keys "$PANE_ID" Escape >/dev/null 2>&1 || true
  sleep 1
  herdr pane run "$PANE_ID" "/exit" >/dev/null 2>&1 || true
  sleep 2
  echo "[kill-agent] Claude stopped. Pane $PANE_ID kept."
else
  echo "[kill-agent] Closing pane $PANE_ID..."
  herdr pane close "$PANE_ID" >/dev/null 2>&1 || true
  echo "[kill-agent] Pane $PANE_ID closed."
fi
