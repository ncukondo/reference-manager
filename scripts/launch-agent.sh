#!/usr/bin/env bash
set -euo pipefail

# Launch a Claude agent in a herdr pane for a given worktree.
#
# Usage: launch-agent.sh <worktree-dir> [prompt]
# Example: launch-agent.sh ~/.herdr/worktrees/reference-manager/feat-clipboard "/code-with-task clipboard"
#
# Prerequisites:
#   - Worktree must already exist
#   - herdr server must be running (herdr status)
#
# What it does:
#   1. Writes .claude/settings.local.json (MCP enablement; permissions are
#      handled by --permission-mode auto, no allow list needed)
#   2. Opens the worktree as a herdr workspace (idempotent)
#   3. Starts claude via `herdr agent start` with the prompt passed as argv,
#      so there are no send-keys input races
#
# Prints the agent pane id on the last line: "pane: <pane_id>"

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
source "$SCRIPT_DIR/herdr-lib.sh"

WORKTREE_DIR="${1:?Usage: launch-agent.sh <worktree-dir> [prompt]}"
PROMPT="${2:-}"
SCRIPT_NAME="${LAUNCH_AGENT_LABEL:-launch-agent}"

if [ ! -d "$WORKTREE_DIR" ]; then
  echo "[$SCRIPT_NAME] ERROR: Worktree does not exist: $WORKTREE_DIR"
  exit 1
fi

if ! herdr_server_running; then
  echo "[$SCRIPT_NAME] ERROR: herdr server is not running. Start it with: herdr" >&2
  exit 1
fi

WORKTREE_DIR="$(cd "$WORKTREE_DIR" && pwd)"
AGENT_NAME="$(basename "$WORKTREE_DIR")"

# --- 1. Refuse to double-launch (skip for the main repo, where the main
# agent itself is always running) ---
if [ "$WORKTREE_DIR" != "$HERDR_LIB_REPO_ROOT" ]; then
  EXISTING_PANE=$(find_agent_pane_for_dir "$WORKTREE_DIR")
  if [ -n "$EXISTING_PANE" ]; then
    echo "[$SCRIPT_NAME] ERROR: An agent is already running in $WORKTREE_DIR (pane $EXISTING_PANE)"
    exit 1
  fi
fi

# --- 2. Local settings (MCP enablement only) ---
echo "[$SCRIPT_NAME] Writing worktree settings..."
mkdir -p "$WORKTREE_DIR/.claude"
cat > "$WORKTREE_DIR/.claude/settings.local.json" << 'SETTINGS_EOF'
{
  "enableAllProjectMcpServers": true,
  "enabledMcpjsonServers": [
    "serena"
  ]
}
SETTINGS_EOF

# --- 3. Open workspace ---
IFS=$'\t' read -r WORKSPACE_ID ALREADY_OPEN ROOT_PANE <<< "$(ensure_workspace_for_dir "$WORKTREE_DIR")"
if [ -z "$WORKSPACE_ID" ]; then
  echo "[$SCRIPT_NAME] ERROR: Could not open workspace for $WORKTREE_DIR" >&2
  exit 1
fi
echo "[$SCRIPT_NAME] Workspace: $WORKSPACE_ID"

# --- 4. Start claude ---
echo "[$SCRIPT_NAME] Starting Claude agent '$AGENT_NAME'..."
if [ -n "$PROMPT" ]; then
  START_OUT=$(herdr agent start "$AGENT_NAME" \
    --cwd "$WORKTREE_DIR" --workspace "$WORKSPACE_ID" \
    --env CLAUDE_WORKER_ID="$AGENT_NAME" --no-focus \
    -- claude --permission-mode auto "$PROMPT")
else
  START_OUT=$(herdr agent start "$AGENT_NAME" \
    --cwd "$WORKTREE_DIR" --workspace "$WORKSPACE_ID" \
    --env CLAUDE_WORKER_ID="$AGENT_NAME" --no-focus \
    -- claude --permission-mode auto)
fi

if echo "$START_OUT" | jq -e '.error' >/dev/null 2>&1; then
  echo "[$SCRIPT_NAME] ERROR: $(echo "$START_OUT" | jq -r '.error.message')" >&2
  exit 1
fi

PANE_ID=$(echo "$START_OUT" | jq -r '.result.agent.pane_id')

# Close the workspace's root shell pane if we just created the workspace —
# it is an unused shell and only clutters the layout. Never touch it on an
# already-open workspace (the user may be working in it).
if [ "$ALREADY_OPEN" = "false" ] && [ -n "$ROOT_PANE" ] && [ "$ROOT_PANE" != "$PANE_ID" ]; then
  herdr pane close "$ROOT_PANE" >/dev/null 2>&1 || true
fi

# --- 5. Sanity check: agent should start working shortly ---
# A startup dialog (trust/MCP prompt) keeps the agent from working; herdr may
# report it as idle or blocked. Warn so the caller can inspect the pane.
if [ -n "$PROMPT" ]; then
  WAIT_OUT=$(herdr wait agent-status "$PANE_ID" --status working --timeout 30000 2>&1 || true)
  if ! echo "$WAIT_OUT" | grep -q 'agent_status_changed'; then
    # "done" = the task already finished (fast completion), "working" = it
    # started late; both are fine. "idle" without ever working is the
    # startup-dialog signature (dialogs are reported as idle by herdr).
    FINAL_STATE=$(agent_status "$PANE_ID")
    case "$FINAL_STATE" in
      done|working) ;;
      *)
        echo "[$SCRIPT_NAME] WARNING: Agent did not start working within 30s (state: $FINAL_STATE)."
        echo "[$SCRIPT_NAME] It may be stuck on a startup dialog. Inspect with:"
        echo "  herdr agent read $PANE_ID --lines 30"
        echo "  herdr pane send-keys $PANE_ID Enter   # accept a dialog"
        ;;
    esac
  fi
fi

echo "[$SCRIPT_NAME] Done. Agent '$AGENT_NAME' running."
echo "[$SCRIPT_NAME] Monitor: herdr agent read $PANE_ID --lines 20"
echo "pane: $PANE_ID"
