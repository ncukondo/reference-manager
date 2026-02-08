#!/usr/bin/env bash
set -euo pipefail

# Merge a PR and clean up worktree/branch safely.
#
# Usage: merge-pr.sh <pr-number> [options]
#
# Options:
#   --squash       Use squash merge (default)
#   --merge        Use merge commit
#   --rebase       Use rebase merge
#   --no-task      Skip task file management
#   --dry-run      Show what would be done without doing it
#
# This script handles all the edge cases:
#   - Worktree exists: removes it before branch deletion
#   - Currently in worktree: switches to main first
#   - Branch already deleted remotely: handles gracefully
#   - Locked worktree: force removes
#
# Example:
#   ./scripts/merge-pr.sh 123
#   ./scripts/merge-pr.sh 123 --merge --no-task

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
PROJECT_NAME="$(basename "$REPO_ROOT")"
PARENT_DIR="$(dirname "$REPO_ROOT")"
WORKTREE_BASE="${PARENT_DIR}/${PROJECT_NAME}--worktrees"

PR_NUM="${1:?Usage: merge-pr.sh <pr-number> [options]}"
MERGE_METHOD="--squash"
SKIP_TASK=false
DRY_RUN=false

shift || true
while [[ $# -gt 0 ]]; do
  case "$1" in
    --squash)  MERGE_METHOD="--squash"; shift ;;
    --merge)   MERGE_METHOD="--merge"; shift ;;
    --rebase)  MERGE_METHOD="--rebase"; shift ;;
    --no-task) SKIP_TASK=true; shift ;;
    --dry-run) DRY_RUN=true; shift ;;
    *) echo "Unknown option: $1" >&2; exit 1 ;;
  esac
done

log() { echo "[merge-pr] $*"; }
err() { echo "[merge-pr] ERROR: $*" >&2; }
run() {
  if [ "$DRY_RUN" = true ]; then
    echo "[dry-run] $*"
  else
    "$@"
  fi
}

# Get PR info
log "Fetching PR #$PR_NUM info..."
PR_JSON=$(gh pr view "$PR_NUM" --json headRefName,state,mergeable,mergeStateStatus 2>/dev/null) || {
  err "Failed to fetch PR #$PR_NUM"
  exit 1
}

BRANCH=$(echo "$PR_JSON" | jq -r '.headRefName')
STATE=$(echo "$PR_JSON" | jq -r '.state')
MERGEABLE=$(echo "$PR_JSON" | jq -r '.mergeable')

log "Branch: $BRANCH"
log "State: $STATE"
log "Mergeable: $MERGEABLE"

if [ "$STATE" = "MERGED" ]; then
  log "PR already merged. Proceeding to cleanup..."
elif [ "$STATE" = "CLOSED" ]; then
  err "PR is closed (not merged). Cannot proceed."
  exit 1
elif [ "$STATE" = "OPEN" ]; then
  # Check CI status
  log "Checking CI status..."
  CI_STATUS=$(gh pr checks "$PR_NUM" --json state --jq 'all(.state == "SUCCESS" or .state == "SKIPPED")' 2>/dev/null || echo "false")

  if [ "$CI_STATUS" != "true" ]; then
    log "Waiting for CI to complete..."
    for i in {1..60}; do
      sleep 10
      CI_STATUS=$(gh pr checks "$PR_NUM" --json state --jq 'all(.state == "SUCCESS" or .state == "SKIPPED")' 2>/dev/null || echo "false")
      if [ "$CI_STATUS" = "true" ]; then
        log "CI passed!"
        break
      fi
      echo -ne "\r[merge-pr] Waiting for CI... ($((i * 10))s)    "
    done
    echo ""

    if [ "$CI_STATUS" != "true" ]; then
      err "CI did not pass within timeout"
      exit 1
    fi
  fi

  # Merge the PR
  log "Merging PR #$PR_NUM with $MERGE_METHOD..."
  run gh pr merge "$PR_NUM" "$MERGE_METHOD" || {
    err "Failed to merge PR. Check if it's approved and CI passes."
    exit 1
  }
  log "PR merged successfully!"
else
  err "Unknown PR state: $STATE"
  exit 1
fi

# Ensure we're not in the worktree directory
CURRENT_DIR=$(pwd)
BRANCH_DIR=$(echo "$BRANCH" | tr '/' '-')
WORKTREE_PATH="$WORKTREE_BASE/$BRANCH_DIR"

if [[ "$CURRENT_DIR" == "$WORKTREE_PATH"* ]]; then
  log "Currently in worktree directory. Switching to repo root..."
  cd "$REPO_ROOT"
fi

# Switch to main and pull
log "Updating main branch..."
run git checkout main 2>/dev/null || true
run git pull --ff-only origin main || {
  # If fast-forward fails, try regular pull
  run git pull origin main
}

# Remove worktree if exists
if [ -d "$WORKTREE_PATH" ]; then
  log "Removing worktree: $WORKTREE_PATH"

  # Kill any Claude agents running in this worktree
  PANE_ID=$(tmux list-panes -a -F "#{pane_id} #{pane_current_path}" 2>/dev/null | \
    grep " $WORKTREE_PATH$" | head -1 | cut -d' ' -f1 || true)

  if [ -n "$PANE_ID" ]; then
    log "Killing agent in pane $PANE_ID..."
    "$SCRIPT_DIR/kill-agent.sh" "$PANE_ID" 2>/dev/null || true
  fi

  # Remove worktree (force if locked)
  run git worktree remove "$WORKTREE_PATH" 2>/dev/null || \
    run git worktree remove "$WORKTREE_PATH" --force 2>/dev/null || {
      log "Worktree removal failed, trying manual cleanup..."
      rm -rf "$WORKTREE_PATH" 2>/dev/null || true
      run git worktree prune
    }

  log "Worktree removed."
else
  log "No worktree found at $WORKTREE_PATH"
fi

# Prune worktrees (clean up any stale entries)
run git worktree prune

# Delete local branch
log "Deleting local branch: $BRANCH"
if git branch --list "$BRANCH" | grep -q "$BRANCH"; then
  run git branch -D "$BRANCH" 2>/dev/null || {
    log "Branch deletion with -D failed, trying -d..."
    run git branch -d "$BRANCH" 2>/dev/null || true
  }
  log "Local branch deleted."
else
  log "Local branch already deleted."
fi

# Verify remote branch is gone (gh pr merge should have deleted it)
if git ls-remote --heads origin "$BRANCH" 2>/dev/null | grep -q "$BRANCH"; then
  log "Remote branch still exists. Deleting..."
  run git push origin --delete "$BRANCH" 2>/dev/null || true
fi

# Task file management
if [ "$SKIP_TASK" = false ]; then
  log "Looking for task file..."

  # Try to find task file matching the branch name
  TASK_FILE=$(find spec/tasks -maxdepth 1 \( -name "*${BRANCH_DIR}*" -o -name "*$(echo "$BRANCH" | sed 's/feat\///' | sed 's/fix\///')*" \) 2>/dev/null | head -1 || true)

  if [ -n "$TASK_FILE" ] && [ -f "$TASK_FILE" ]; then
    TASK_BASENAME=$(basename "$TASK_FILE")
    log "Found task file: $TASK_FILE"
    log "Moving to completed..."

    mkdir -p spec/tasks/completed
    run mv "$TASK_FILE" "spec/tasks/completed/$TASK_BASENAME"

    log "Updating ROADMAP.md..."
    # This is a hint for the agent to update ROADMAP manually if needed
    echo "[merge-pr] Task file moved. Please update ROADMAP.md status to 'Done' if needed."
  else
    log "No matching task file found in spec/tasks/"
  fi
fi

log ""
log "=== Merge Complete ==="
log "PR:      #$PR_NUM"
log "Branch:  $BRANCH (deleted)"
log "Worktree: $WORKTREE_PATH (removed)"
log ""
log "Remaining worktrees:"
git worktree list
