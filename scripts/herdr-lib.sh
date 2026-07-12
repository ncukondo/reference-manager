#!/usr/bin/env bash
# Shared helpers for herdr-based agent orchestration.
#
# Source this file from other scripts:
#   source "$SCRIPT_DIR/herdr-lib.sh"
#
# Provides:
#   WORKTREE_BASE                     - base directory for this repo's worktrees
#   worktree_dir_for_branch <branch>  - worktree path for a branch (slashes -> dashes)
#   find_agent_pane_for_dir <dir>     - pane_id of the agent running in <dir>
#   find_agent_pane_for_branch <br>   - pane_id of the agent on a branch's worktree
#   find_main_agent_pane              - pane_id of the agent in the repo root
#   agent_status <target>             - idle|working|blocked|unknown|error
#   pane_exists <pane_id>             - exit 0 if the pane exists
#   ensure_workspace_for_dir <dir>    - open <dir> as a herdr workspace, print workspace_id
#
# Note: herdr CLI commands exit 0 even on failure; errors are reported as
# {"error": {...}} in the JSON response. Always check the payload, not $?.

HERDR_LIB_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
HERDR_LIB_REPO_ROOT="$(cd "$HERDR_LIB_DIR/.." && pwd)"
HERDR_LIB_PROJECT_NAME="$(basename "$HERDR_LIB_REPO_ROOT")"

# herdr's worktree layout: ~/.herdr/worktrees/<repo-name>/<branch-with-dashes>
WORKTREE_BASE="${HOME}/.herdr/worktrees/${HERDR_LIB_PROJECT_NAME}"

worktree_dir_for_branch() {
  local branch="$1"
  echo "$WORKTREE_BASE/$(echo "$branch" | tr '/' '-')"
}

# Print pane_id of the agent whose cwd is exactly <dir> (empty if none).
# Only panes with a detected agent (claude etc.) are listed; plain shell
# panes such as workspace root panes are not.
find_agent_pane_for_dir() {
  local dir="$1"
  herdr agent list 2>/dev/null | \
    jq -r --arg dir "$dir" '.result.agents[]? | select(.cwd == $dir) | .pane_id' | \
    head -1
}

find_agent_pane_for_branch() {
  find_agent_pane_for_dir "$(worktree_dir_for_branch "$1")"
}

find_main_agent_pane() {
  find_agent_pane_for_dir "$HERDR_LIB_REPO_ROOT"
}

# Print agent status for a target (pane_id, agent name, or terminal id).
# Output: idle | working | blocked | done | unknown | error (target not found)
# ("done" = a task finished since the last input; treat like idle)
agent_status() {
  local target="$1" out
  out=$(herdr agent get "$target" 2>/dev/null || true)
  if [ -z "$out" ] || echo "$out" | jq -e '.error' >/dev/null 2>&1; then
    echo "error"
    return
  fi
  echo "$out" | jq -r '.result.agent.agent_status // "unknown"'
}

pane_exists() {
  local out
  out=$(herdr pane get "$1" 2>/dev/null || true)
  [ -n "$out" ] && ! echo "$out" | jq -e '.error' >/dev/null 2>&1
}

# Open <dir> as a herdr workspace (idempotent).
# Prints three tab-separated fields: workspace_id, already_open (true/false),
# and the root pane id. The root pane is a plain shell herdr creates with
# every new workspace; callers that add an agent pane may close it when
# already_open is false (freshly created, so the shell is guaranteed unused).
ensure_workspace_for_dir() {
  local dir="$1" out
  # --cwd anchors the command to the parent repo workspace; without it,
  # re-opening a worktree whose workspace was closed fails with
  # "linked_worktree_source".
  out=$(herdr worktree open --cwd "$HERDR_LIB_REPO_ROOT" --path "$dir" --no-focus --json 2>/dev/null || true)
  if [ -z "$out" ] || echo "$out" | jq -e '.error' >/dev/null 2>&1; then
    echo "herdr worktree open failed for $dir: $(echo "$out" | jq -r '.error.message // "no response"')" >&2
    return 1
  fi
  echo "$out" | jq -r '[.result.workspace.workspace_id, (.result.already_open | tostring), .result.root_pane.pane_id] | @tsv'
}
