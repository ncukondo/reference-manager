#!/usr/bin/env bash
set -euo pipefail

# Spawn a reviewer agent for a PR.
#
# Usage:
#   spawn-reviewer.sh <branch-name> <pr-number>
#   spawn-reviewer.sh --pr <pr-number>
#
# Examples:
#   spawn-reviewer.sh feat/session-diff 40
#   spawn-reviewer.sh --pr 40
#
# Options:
#   --pr <number>    Specify PR number only (branch is auto-detected)
#   --create         Create worktree if it doesn't exist (default: error if missing)
#
# What it does:
#   1. Locates or creates the worktree
#   2. Sets role marker to 'review' in CLAUDE.md
#   3. Delegates to launch-agent.sh with /review-pr prompt

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
PROJECT_NAME="$(basename "$REPO_ROOT")"
PARENT_DIR="$(dirname "$REPO_ROOT")"
WORKTREE_BASE="${PARENT_DIR}/${PROJECT_NAME}--worktrees"

BRANCH=""
PR_NUMBER=""
CREATE_WORKTREE=false

# Parse arguments
while [[ $# -gt 0 ]]; do
  case "$1" in
    --pr)
      PR_NUMBER="$2"
      shift 2
      ;;
    --create)
      CREATE_WORKTREE=true
      shift
      ;;
    -*)
      echo "Unknown option: $1" >&2
      exit 1
      ;;
    *)
      if [ -z "$BRANCH" ]; then
        BRANCH="$1"
      elif [ -z "$PR_NUMBER" ]; then
        PR_NUMBER="$1"
      else
        echo "Too many arguments" >&2
        exit 1
      fi
      shift
      ;;
  esac
done

# Validate arguments
if [ -z "$PR_NUMBER" ]; then
  echo "Usage: spawn-reviewer.sh <branch-name> <pr-number>" >&2
  echo "       spawn-reviewer.sh --pr <pr-number>" >&2
  exit 1
fi

# If branch not provided, get it from PR
if [ -z "$BRANCH" ]; then
  echo "[spawn-reviewer] Fetching branch name from PR #$PR_NUMBER..."
  BRANCH=$(gh pr view "$PR_NUMBER" --json headRefName --jq '.headRefName' 2>/dev/null) || {
    echo "[spawn-reviewer] ERROR: Could not get branch name for PR #$PR_NUMBER" >&2
    exit 1
  }
  CREATE_WORKTREE=true  # Auto-create when using --pr
fi

echo "[spawn-reviewer] Branch: $BRANCH"
echo "[spawn-reviewer] PR: #$PR_NUMBER"

BRANCH_DIR=$(echo "$BRANCH" | tr '/' '-')
WORKTREE_DIR="$WORKTREE_BASE/$BRANCH_DIR"

# --- 0. Duplicate reviewer check ---
# Skip if a review-role agent is already running for this branch
if [ -d "$WORKTREE_DIR" ]; then
  CLAUDE_MD="$WORKTREE_DIR/CLAUDE.md"
  if [ -f "$CLAUDE_MD" ] && grep -q '^<!-- role: review -->' "$CLAUDE_MD"; then
    # Role is already review - check if an agent pane exists for this worktree
    EXISTING_PANE=$(tmux list-panes -a -F "#{pane_id} #{pane_current_path}" 2>/dev/null | \
      grep " ${WORKTREE_DIR}$" | head -1 | cut -d' ' -f1 || true)
    if [ -n "$EXISTING_PANE" ] && tmux has-session -t "$EXISTING_PANE" 2>/dev/null; then
      echo "[spawn-reviewer] WARNING: Review agent already running for branch $BRANCH in pane $EXISTING_PANE. Skipping."
      exit 0
    fi
  fi
fi

# --- 1. Check/create worktree ---
if [ ! -d "$WORKTREE_DIR" ]; then
  if [ "$CREATE_WORKTREE" = true ]; then
    echo "[spawn-reviewer] Creating worktree: $WORKTREE_DIR"
    mkdir -p "$WORKTREE_BASE"

    # Fetch the branch first
    git fetch origin "$BRANCH" 2>/dev/null || true

    # Try to add worktree (existing branch or create new)
    if git show-ref --verify --quiet "refs/heads/$BRANCH" 2>/dev/null; then
      git worktree add "$WORKTREE_DIR" "$BRANCH"
    elif git show-ref --verify --quiet "refs/remotes/origin/$BRANCH" 2>/dev/null; then
      git worktree add "$WORKTREE_DIR" "$BRANCH"
    else
      echo "[spawn-reviewer] ERROR: Branch '$BRANCH' not found locally or remotely" >&2
      exit 1
    fi

    # Install dependencies
    echo "[spawn-reviewer] Running npm install..."
    (cd "$WORKTREE_DIR" && npm install)
  else
    echo "[spawn-reviewer] ERROR: Worktree does not exist: $WORKTREE_DIR" >&2
    echo "[spawn-reviewer] Use --create to auto-create, or create manually:" >&2
    echo "  git worktree add $WORKTREE_DIR $BRANCH && (cd $WORKTREE_DIR && npm install)" >&2
    exit 1
  fi
else
  echo "[spawn-reviewer] Using existing worktree: $WORKTREE_DIR"
fi

# --- 2. Set role marker in CLAUDE.md ---
echo "[spawn-reviewer] Setting role to 'review' in CLAUDE.md..."
"$SCRIPT_DIR/set-role.sh" "$WORKTREE_DIR" review

# --- 3. Delegate to launch-agent.sh ---
export LAUNCH_AGENT_LABEL="spawn-reviewer"
exec "$SCRIPT_DIR/launch-agent.sh" "$WORKTREE_DIR" "/review-pr $PR_NUMBER"
