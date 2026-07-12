#!/usr/bin/env bash
set -euo pipefail

# Monitor all Claude agents of this repo via herdr.
#
# Usage: monitor-agents.sh [--watch] [--wait-change] [--json] [--all]
#
# Options:
#   --watch        Continuously monitor (refresh every 5s, heartbeat every 60s)
#   --wait-change  Wait for state change, output once, then exit
#   --json         Output as JSON instead of table
#   --all          Include agents outside this repo's worktrees
#
# Output columns:
#   PANE   - herdr pane ID (e.g., w13:p2)
#   NAME   - agent name (worktree dir name, or "main")
#   STATE  - idle | working | blocked | unknown
#   CWD    - working directory

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
source "$SCRIPT_DIR/herdr-lib.sh"

WATCH=false
WAIT_CHANGE=false
JSON_OUTPUT=false
ALL=false

while [[ $# -gt 0 ]]; do
  case "$1" in
    --watch|-w) WATCH=true; shift ;;
    --wait-change|-c) WAIT_CHANGE=true; shift ;;
    --json|-j) JSON_OUTPUT=true; shift ;;
    --all|-a) ALL=true; shift ;;
    *) echo "Unknown option: $1" >&2; exit 1 ;;
  esac
done

# Print filtered agent list as JSON array:
# [{pane, name, state, cwd}, ...]
get_agents_json() {
  local filter='.'
  if [ "$ALL" = false ]; then
    filter='select((.cwd | startswith($base + "/")) or .cwd == $root)'
  fi
  herdr agent list 2>/dev/null | jq -c \
    --arg base "$WORKTREE_BASE" --arg root "$HERDR_LIB_REPO_ROOT" \
    "[.result.agents[]? | $filter | {
       pane: .pane_id,
       name: (if .cwd == \$root then \"main\" else (.name // (.cwd | split(\"/\") | last)) end),
       state: .agent_status,
       cwd: .cwd
     }]"
}

print_status() {
  local agents_json
  agents_json=$(get_agents_json)

  if [ "$agents_json" = "[]" ] || [ -z "$agents_json" ]; then
    echo "No active agents found."
    return
  fi

  if [ "$JSON_OUTPUT" = true ]; then
    echo "$agents_json" | jq '.'
  else
    {
      printf "%s\t%s\t%s\t%s\n" "PANE" "NAME" "STATE" "CWD"
      echo "$agents_json" | jq -r '.[] | [.pane, .name, .state, .cwd] | @tsv'
    } | column -t -s$'\t'
  fi
}

get_state_signature() {
  get_agents_json | jq -r '.[] | "\(.pane):\(.state)"' | sort | tr '\n' ' '
}

if [ "$WAIT_CHANGE" = true ]; then
  prev_sig=$(get_state_signature)
  while true; do
    sleep 5
    current_sig=$(get_state_signature)
    if [ "$current_sig" != "$prev_sig" ]; then
      echo "=== $(date '+%H:%M:%S') (state changed) ==="
      print_status
      exit 0
    fi
  done
elif [ "$WATCH" = true ]; then
  echo "Watching agent states... (output on state change, heartbeat every 60s)"
  echo ""
  prev_sig=""
  last_output_time=$(date +%s)
  HEARTBEAT_INTERVAL=60
  while true; do
    current_sig=$(get_state_signature)
    now=$(date +%s)
    if [ "$current_sig" != "$prev_sig" ]; then
      echo "=== $(date '+%H:%M:%S') ==="
      print_status
      echo ""
      prev_sig="$current_sig"
      last_output_time=$now
    elif [ $((now - last_output_time)) -ge "$HEARTBEAT_INTERVAL" ]; then
      echo "=== $(date '+%H:%M:%S') (heartbeat) ==="
      print_status
      echo ""
      last_output_time=$now
    fi
    sleep 5
  done
else
  print_status
fi
