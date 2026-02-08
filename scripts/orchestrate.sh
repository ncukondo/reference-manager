#!/usr/bin/env bash
set -euo pipefail

# Orchestrate all worker agents - detect events and notify main agent.
#
# Usage: orchestrate.sh [options]
#
# Options:
#   --background, -b    Run in background (detach from terminal)
#   --interval <sec>    Check interval in seconds (default: 15)
#   --main-pane <id>    Main agent pane ID for notifications (auto-detect if omitted)
#
# Model: Detect + Notify only
#   - Detects state changes in worker/reviewer agents
#   - Writes event files to /tmp/claude-orchestrator/events/
#   - Sends a short 1-line notification to main agent pane
#   - Does NOT kill agents, spawn reviewers, or send fix instructions
#   - Main agent reads event files and decides what actions to take

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
PROJECT_NAME="$(basename "$REPO_ROOT")"
PARENT_DIR="$(dirname "$REPO_ROOT")"
WORKTREE_BASE="${PARENT_DIR}/${PROJECT_NAME}--worktrees"

STATE_DIR="/tmp/claude-orchestrator"
EVENTS_DIR="$STATE_DIR/events"
LOG_FILE="$STATE_DIR/orchestrator.log"
PID_FILE="$STATE_DIR/orchestrator.pid"

BACKGROUND=false
INTERVAL=15
MAIN_PANE=""

# Parse arguments
while [[ $# -gt 0 ]]; do
  case "$1" in
    --background|-b)
      BACKGROUND=true
      shift
      ;;
    --interval)
      INTERVAL="$2"
      shift 2
      ;;
    --main-pane)
      MAIN_PANE="$2"
      shift 2
      ;;
    --stop)
      if [ -f "$PID_FILE" ]; then
        kill "$(cat "$PID_FILE")" 2>/dev/null || true
        rm -f "$PID_FILE"
        echo "[orchestrate] Stopped"
      else
        echo "[orchestrate] Not running"
      fi
      exit 0
      ;;
    --status)
      if [ -f "$PID_FILE" ] && kill -0 "$(cat "$PID_FILE")" 2>/dev/null; then
        echo "running (PID: $(cat "$PID_FILE"))"
        echo "Events dir: $EVENTS_DIR"
        if [ -d "$EVENTS_DIR" ]; then
          local_count=$(ls -1 "$EVENTS_DIR" 2>/dev/null | wc -l)
          echo "Event files: $local_count"
        fi
      else
        echo "stopped"
      fi
      exit 0
      ;;
    *)
      echo "Unknown option: $1" >&2
      exit 1
      ;;
  esac
done

# Setup
mkdir -p "$STATE_DIR" "$EVENTS_DIR"

# Auto-detect main pane (the pane running in main repo)
if [ -z "$MAIN_PANE" ]; then
  MAIN_PANE=$(tmux list-panes -a -F "#{pane_id} #{pane_current_path}" 2>/dev/null | \
    grep " ${REPO_ROOT}$" | head -1 | cut -d' ' -f1 || true)
fi

log() {
  local msg="[$(date '+%H:%M:%S')] $*"
  echo "$msg" >> "$LOG_FILE"
  if [ "$BACKGROUND" = false ]; then
    echo "$msg"
  fi
}

# Write an event file and notify main agent
write_event() {
  local branch="$1"
  local event_type="$2"
  local details="$3"
  local next_steps="$4"

  local timestamp
  timestamp=$(date '+%H%M%S')
  local branch_dash
  branch_dash=$(echo "$branch" | tr '/' '-')

  local pr_num="${5:-}"
  local pane_id="${6:-}"

  local event_file="$EVENTS_DIR/${timestamp}-${branch_dash}-${event_type}.md"

  {
    echo "## Event: ${event_type}"
    echo "- **Branch**: ${branch}"
    [ -n "$pr_num" ] && echo "- **PR**: #${pr_num}"
    [ -n "$pane_id" ] && echo "- **Pane**: ${pane_id}"
    echo "- **Time**: $(date '+%H:%M:%S')"
    echo ""
    echo "## Details"
    echo "$details"
    echo ""
    echo "## Next Steps"
    echo '```bash'
    echo "$next_steps"
    echo '```'
  } > "$event_file"

  log "EVENT: ${event_type} for ${branch} -> $(basename "$event_file")"

  # Notify main pane with just the filename
  notify_main "$event_file"
}

# Notify main agent about an event (short 1-line notification)
notify_main() {
  local event_file="$1"

  if [ -n "$MAIN_PANE" ] && tmux has-session -t "$MAIN_PANE" 2>/dev/null; then
    tmux send-keys -t "$MAIN_PANE" "# [ORCH] $(basename "$event_file")" 2>/dev/null || true
    sleep 0.5
    tmux send-keys -t "$MAIN_PANE" Enter 2>/dev/null || true
  fi
}

# Get all active worktree branches (excluding main)
get_active_branches() {
  git worktree list --porcelain 2>/dev/null | \
    grep "^branch refs/heads/" | \
    sed 's|^branch refs/heads/||' | \
    grep -v "^main$" || true
}

# Find pane ID for a branch
find_pane_for_branch() {
  local branch="$1"
  local branch_dash
  branch_dash=$(echo "$branch" | tr '/' '-')
  local worktree_path="$WORKTREE_BASE/$branch_dash"

  # Find pane with matching cwd
  tmux list-panes -a -F "#{pane_id} #{pane_current_path}" 2>/dev/null | \
    grep " $worktree_path$" | head -1 | cut -d' ' -f1 || true
}

# Get current role from CLAUDE.md
get_current_role() {
  local branch="$1"
  local branch_dash
  branch_dash=$(echo "$branch" | tr '/' '-')
  local claude_md="$WORKTREE_BASE/$branch_dash/CLAUDE.md"

  if [ -f "$claude_md" ]; then
    grep "^<!-- role:" "$claude_md" | sed 's/<!-- role: \(.*\) -->/\1/' || echo "unknown"
  else
    echo "unknown"
  fi
}

# Track branch states to detect changes
declare -A BRANCH_STATES
declare -A BRANCH_LAST_ACTIVITY

# Process a single branch
process_branch() {
  local branch="$1"
  local pane_id
  pane_id=$(find_pane_for_branch "$branch")

  if [ -z "$pane_id" ]; then
    # No pane found - might be cleaned up or not yet started
    return
  fi

  # Check if pane still exists
  if ! tmux has-session -t "$pane_id" 2>/dev/null; then
    log "Branch $branch: pane $pane_id no longer exists"
    return
  fi

  # Get agent state
  local agent_state
  agent_state=$("$SCRIPT_DIR/check-agent-state.sh" "$pane_id" 2>/dev/null || echo "error")

  local role
  role=$(get_current_role "$branch")

  local state_key="${branch}:${role}"
  local prev_state="${BRANCH_STATES[$state_key]:-unknown}"

  # Handle error state
  if [ "$agent_state" = "error" ]; then
    if [ "$prev_state" != "error" ]; then
      local pr_num
      pr_num=$(gh pr list --head "$branch" --json number --jq '.[0].number' 2>/dev/null || true)

      write_event "$branch" "agent-error" \
        "Agent in error state (role: $role)" \
        "# Check agent state
./scripts/check-agent-state.sh $pane_id
# Restart if needed
./scripts/kill-agent.sh $pane_id" \
        "$pr_num" "$pane_id"

      BRANCH_STATES[$state_key]="error"
    fi
    return
  fi

  # Only process when agent becomes idle
  if [ "$agent_state" != "idle" ]; then
    # Don't overwrite terminal states (already processed)
    case "${BRANCH_STATES[$state_key]:-}" in
      transitioning|transitioned|approved|fix-requested|commented) ;;
      *) BRANCH_STATES[$state_key]="$agent_state" ;;
    esac
    BRANCH_LAST_ACTIVITY[$branch]=$(date +%s)
    return
  fi

  # Agent is idle - skip if already in terminal state
  case "${BRANCH_STATES[$state_key]:-}" in
    transitioning|transitioned|approved|fix-requested|commented)
      return
      ;;
  esac

  # Agent is idle - check what to do based on role
  case "$role" in
    implement)
      process_implement_completion "$branch" "$pane_id"
      ;;
    review)
      process_review_completion "$branch" "$pane_id"
      ;;
    *)
      # Unknown role - just log
      if [ "$prev_state" != "idle-$role" ]; then
        log "Branch $branch: idle with unknown role '$role'"
        BRANCH_STATES[$state_key]="idle-$role"
      fi
      ;;
  esac
}

process_implement_completion() {
  local branch="$1"
  local pane_id="$2"

  local task_status
  task_status=$("$SCRIPT_DIR/check-task-completion.sh" "$branch" pr-creation 2>/dev/null || echo "error")

  case "$task_status" in
    completed)
      local pr_num
      pr_num=$(gh pr list --head "$branch" --json number --jq '.[0].number' 2>/dev/null || true)

      if [ -n "$pr_num" ]; then
        log "Branch $branch: Worker completed, PR #$pr_num, CI passed."

        write_event "$branch" "worker-completed" \
          "Worker finished implementation. PR #$pr_num created and CI passed." \
          "# 1. Kill worker and spawn reviewer
./scripts/kill-agent.sh $pane_id && sleep 2 && ./scripts/spawn-reviewer.sh $branch $pr_num
# 2. Or spawn reviewer while keeping worker alive
./scripts/spawn-reviewer.sh $branch $pr_num" \
          "$pr_num" "$pane_id"

        BRANCH_STATES["${branch}:implement"]="transitioned"
      else
        if [ "${BRANCH_STATES["${branch}:implement"]:-}" != "no-pr-notified" ]; then
          write_event "$branch" "worker-completed" \
            "Worker completed but could not find PR number for branch $branch." \
            "# Check PR manually
gh pr list --head $branch" \
            "" "$pane_id"

          BRANCH_STATES["${branch}:implement"]="no-pr-notified"
        fi
      fi
      ;;

    ci-pending)
      # Still waiting - no action needed
      ;;

    ci-failed)
      local state_key="${branch}:implement:ci-failed"
      if [ "${BRANCH_STATES[$state_key]:-}" != "notified" ]; then
        local pr_num
        pr_num=$(gh pr list --head "$branch" --json number --jq '.[0].number' 2>/dev/null || true)

        write_event "$branch" "ci-failed" \
          "CI checks failed for branch $branch." \
          "# Send fix instruction to worker
./scripts/send-to-agent.sh $pane_id \"CIが失敗しています。修正してpushしてください。\"
# Or check CI status manually
gh pr checks ${pr_num:-\"<pr-number>\"}" \
          "$pr_num" "$pane_id"

        BRANCH_STATES[$state_key]="notified"
      fi
      ;;

    pending)
      # No PR yet - worker still working or idle without completion
      ;;

    error|*)
      if [ "${BRANCH_STATES["${branch}:implement:error"]:-}" != "notified" ]; then
        write_event "$branch" "agent-error" \
          "Unexpected task status for branch $branch: $task_status" \
          "# Check agent state
./scripts/check-agent-state.sh $pane_id" \
          "" "$pane_id"

        BRANCH_STATES["${branch}:implement:error"]="notified"
      fi
      ;;
  esac
}

process_review_completion() {
  local branch="$1"
  local pane_id="$2"

  local pr_num
  pr_num=$(gh pr list --head "$branch" --json number --jq '.[0].number' 2>/dev/null || true)

  if [ -z "$pr_num" ]; then
    write_event "$branch" "agent-error" \
      "Reviewer active but no PR found for branch $branch." \
      "# Check PRs
gh pr list --head $branch" \
      "" "$pane_id"
    return
  fi

  local review_status
  review_status=$("$SCRIPT_DIR/check-task-completion.sh" "$branch" review "$pr_num" 2>/dev/null || echo "error")

  # Skip if already processed (idempotency guard)
  local current_review_state="${BRANCH_STATES["${branch}:review"]:-}"
  case "$current_review_state" in
    approved|fix-requested|commented) return ;;
  esac

  local branch_dash
  branch_dash=$(echo "$branch" | tr '/' '-')

  case "$review_status" in
    approved)
      write_event "$branch" "review-approved" \
        "PR #$pr_num has been approved by the reviewer." \
        "# Kill reviewer and merge PR
./scripts/kill-agent.sh $pane_id
./scripts/merge-pr.sh $pr_num" \
        "$pr_num" "$pane_id"

      BRANCH_STATES["${branch}:review"]="approved"
      ;;

    changes_requested)
      local review_body
      review_body=$(gh pr view "$pr_num" --json reviews --jq '.reviews[-1].body // "No details"' 2>/dev/null | head -c 500 || echo "")

      write_event "$branch" "review-changes-requested" \
        "PR #$pr_num has changes requested.

## Review Feedback
$review_body" \
        "# Switch role to implement and send fix instructions
./scripts/set-role.sh $WORKTREE_BASE/$branch_dash implement
./scripts/send-to-agent.sh $pane_id \"/pr-comments $pr_num\"" \
        "$pr_num" "$pane_id"

      BRANCH_STATES["${branch}:review"]="fix-requested"

      # Clear implement terminal states to allow re-processing after fix
      unset 'BRANCH_STATES["${branch}:implement"]' 2>/dev/null || true
      unset 'BRANCH_STATES["${branch}:implement:ci-failed"]' 2>/dev/null || true
      unset 'BRANCH_STATES["${branch}:implement:error"]' 2>/dev/null || true
      ;;

    commented)
      local review_body
      review_body=$(gh pr view "$pr_num" --json reviews --jq '.reviews[-1].body // "No details"' 2>/dev/null | head -c 500 || echo "")

      write_event "$branch" "review-commented" \
        "PR #$pr_num has a comment-only review (no approve/reject).

## Review Comment
$review_body" \
        "# Check comment details
gh pr view $pr_num --comments" \
        "$pr_num" "$pane_id"

      BRANCH_STATES["${branch}:review"]="commented"
      ;;

    pending)
      # Review not yet posted - still working
      ;;

    error|*)
      if [ "${BRANCH_STATES["${branch}:review:error"]:-}" != "notified" ]; then
        write_event "$branch" "agent-error" \
          "Unexpected review status for branch $branch: $review_status" \
          "# Check agent state
./scripts/check-agent-state.sh $pane_id" \
          "$pr_num" "$pane_id"

        BRANCH_STATES["${branch}:review:error"]="notified"
      fi
      ;;
  esac
}

# Main loop
main_loop() {
  log "Orchestrator started (interval: ${INTERVAL}s, main pane: ${MAIN_PANE:-none}, events: $EVENTS_DIR)"

  while true; do
    # Main agent liveness check
    if [ -n "$MAIN_PANE" ] && ! tmux has-session -t "$MAIN_PANE" 2>/dev/null; then
      log "Main agent pane $MAIN_PANE no longer exists. Stopping orchestrator."
      rm -f "$PID_FILE"
      exit 0
    fi

    for branch in $(get_active_branches); do
      process_branch "$branch"
    done

    sleep "$INTERVAL"
  done
}

# Run
if [ "$BACKGROUND" = true ]; then
  # Daemonize
  echo $$ > "$PID_FILE"
  exec >> "$LOG_FILE" 2>&1
  main_loop &
  disown
  echo "[orchestrate] Started in background (PID: $$)"
  echo "[orchestrate] Log: $LOG_FILE"
  echo "[orchestrate] Events: $EVENTS_DIR"
  echo "[orchestrate] Stop: $0 --stop"
else
  # Foreground
  echo $$ > "$PID_FILE"
  trap 'rm -f "$PID_FILE"; exit 0' INT TERM
  main_loop
fi
