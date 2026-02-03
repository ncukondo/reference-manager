#!/usr/bin/env bash
set -euo pipefail

# Monitor all Claude agents by scanning state files.
#
# Usage: monitor-agents.sh [--watch] [--wait-change] [--json]
#
# Options:
#   --watch        Continuously monitor (refresh every 5s, heartbeat every 60s)
#   --wait-change  Wait for state change, output once, then exit
#   --json         Output as JSON instead of table
#
# Output columns:
#   PANE   - tmux pane ID (e.g., %42)
#   STATE  - Agent state (idle/working/trust)
#   AGE    - Time since last state change

STATE_DIR="/tmp/claude-agent-states"
WATCH=false
WAIT_CHANGE=false
JSON_OUTPUT=false

while [[ $# -gt 0 ]]; do
  case "$1" in
    --watch|-w)
      WATCH=true
      shift
      ;;
    --wait-change|-c)
      WAIT_CHANGE=true
      shift
      ;;
    --json|-j)
      JSON_OUTPUT=true
      shift
      ;;
    *)
      echo "Unknown option: $1" >&2
      exit 1
      ;;
  esac
done

# Get list of existing tmux panes
get_existing_panes() {
  tmux list-panes -a -F "#{pane_id}" 2>/dev/null || true
}

# Format age from seconds to human readable
format_age() {
  local seconds="$1"
  if [ "$seconds" -lt 60 ]; then
    echo "${seconds}s"
  elif [ "$seconds" -lt 3600 ]; then
    echo "$((seconds / 60))m"
  else
    echo "$((seconds / 3600))h"
  fi
}

# Get current state signature (pane:state pairs, sorted)
# This is used for change detection in watch mode
get_state_signature() {
  if [ ! -d "$STATE_DIR" ]; then
    echo ""
    return
  fi

  local existing_panes
  existing_panes=$(get_existing_panes)

  local sig=""
  for state_file in "$STATE_DIR"/*; do
    [ -f "$state_file" ] || continue

    local pane_id
    pane_id=$(basename "$state_file")

    # Check if pane still exists
    if ! echo "$existing_panes" | grep -qx "$pane_id"; then
      rm -f "$state_file"
      continue
    fi

    local state
    state=$(cat "$state_file" 2>/dev/null || echo "unknown")
    sig+="$pane_id:$state "
  done

  echo "$sig" | tr ' ' '\n' | sort | tr '\n' ' '
}

print_status() {
  # Check if state directory exists
  if [ ! -d "$STATE_DIR" ]; then
    echo "No agent states found (directory $STATE_DIR does not exist)."
    return
  fi

  # Get existing panes
  local existing_panes
  existing_panes=$(get_existing_panes)

  # Collect agent data
  local agents=()
  local now
  now=$(date +%s)

  for state_file in "$STATE_DIR"/*; do
    [ -f "$state_file" ] || continue

    local pane_id
    pane_id=$(basename "$state_file")

    # Check if pane still exists
    if ! echo "$existing_panes" | grep -qx "$pane_id"; then
      # Clean up stale state file
      rm -f "$state_file"
      continue
    fi

    local state
    state=$(cat "$state_file" 2>/dev/null || echo "unknown")

    local mtime age_seconds
    mtime=$(stat -c %Y "$state_file" 2>/dev/null || echo "$now")
    age_seconds=$((now - mtime))

    agents+=("$pane_id|$state|$age_seconds")
  done

  if [ ${#agents[@]} -eq 0 ]; then
    echo "No active agents found."
    return
  fi

  if [ "$JSON_OUTPUT" = true ]; then
    # JSON output
    local json_array="["
    local first=true
    for agent in "${agents[@]}"; do
      IFS='|' read -r pane_id state age_seconds <<< "$agent"
      if [ "$first" = true ]; then
        first=false
      else
        json_array+=","
      fi
      json_array+="{\"pane\":\"$pane_id\",\"state\":\"$state\",\"age_seconds\":$age_seconds}"
    done
    json_array+="]"
    echo "$json_array" | jq '.'
  else
    # Table output
    printf "%-8s %-10s %-8s\n" "PANE" "STATE" "AGE"
    printf "%-8s %-10s %-8s\n" "--------" "----------" "--------"

    for agent in "${agents[@]}"; do
      IFS='|' read -r pane_id state age_seconds <<< "$agent"
      local age_display
      age_display=$(format_age "$age_seconds")
      printf "%-8s %-10s %-8s\n" "$pane_id" "$state" "$age_display"
    done
  fi
}

if [ "$WAIT_CHANGE" = true ]; then
  # Wait for state change, output once, then exit
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
    time_since_output=$((now - last_output_time))

    if [ "$current_sig" != "$prev_sig" ]; then
      # State changed - show full output
      echo "=== $(date '+%H:%M:%S') ==="
      print_status
      echo ""
      prev_sig="$current_sig"
      last_output_time=$now
    elif [ "$time_since_output" -ge "$HEARTBEAT_INTERVAL" ]; then
      # Heartbeat - show status even without change
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
