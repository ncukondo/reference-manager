#!/usr/bin/env bash
set -euo pipefail

# Spawn a generic Claude agent in a worktree.
#
# Usage:
#   spawn-agent.sh <branch-or-pr> [options] [-- <prompt>]
#
# Examples:
#   # Research agent on existing worktree
#   spawn-agent.sh feat/my-feature -- "このコードベースの認証フローを調査してください"
#
#   # PR comment response agent
#   spawn-agent.sh --pr 123 -- "PR #123 のコメントに対応してください"
#
#   # Create worktree and start with custom prompt
#   spawn-agent.sh feat/new-feature --create -- "新機能の設計を検討してください"
#
#   # Interactive mode (no prompt, just open Claude)
#   spawn-agent.sh feat/my-feature
#
# Options:
#   --pr <number>    Use PR number (auto-detect branch, auto-create worktree)
#   --create         Create worktree if it doesn't exist
#   --role <role>    Set role in CLAUDE.md (default: none)
#   --main           Use main repo instead of worktree
#
# If no prompt is given after --, Claude starts in interactive mode.

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
source "$SCRIPT_DIR/herdr-lib.sh"
REPO_ROOT="$HERDR_LIB_REPO_ROOT"

BRANCH=""
PR_NUMBER=""
CREATE_WORKTREE=false
ROLE=""
USE_MAIN=false
PROMPT=""

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
    --role)
      ROLE="$2"
      shift 2
      ;;
    --main)
      USE_MAIN=true
      shift
      ;;
    --)
      shift
      PROMPT="$*"
      break
      ;;
    -*)
      echo "Unknown option: $1" >&2
      exit 1
      ;;
    *)
      if [ -z "$BRANCH" ]; then
        BRANCH="$1"
      else
        echo "Unexpected argument: $1" >&2
        exit 1
      fi
      shift
      ;;
  esac
done

# Determine working directory
if [ "$USE_MAIN" = true ]; then
  WORK_DIR="$REPO_ROOT"
  echo "[spawn-agent] Using main repo: $WORK_DIR"
elif [ -n "$PR_NUMBER" ]; then
  # Get branch from PR
  echo "[spawn-agent] Fetching branch from PR #$PR_NUMBER..."
  BRANCH=$(gh pr view "$PR_NUMBER" --json headRefName --jq '.headRefName' 2>/dev/null) || {
    echo "[spawn-agent] ERROR: Could not get branch for PR #$PR_NUMBER" >&2
    exit 1
  }
  CREATE_WORKTREE=true
  WORK_DIR="$(worktree_dir_for_branch "$BRANCH")"
  echo "[spawn-agent] Branch: $BRANCH"
elif [ -n "$BRANCH" ]; then
  WORK_DIR="$(worktree_dir_for_branch "$BRANCH")"
else
  echo "Usage: spawn-agent.sh <branch-or-pr> [options] [-- <prompt>]" >&2
  echo "       spawn-agent.sh --main [-- <prompt>]" >&2
  exit 1
fi

# Create worktree if needed
if [ "$USE_MAIN" = false ]; then
  if [ ! -d "$WORK_DIR" ]; then
    if [ "$CREATE_WORKTREE" = true ]; then
      echo "[spawn-agent] Creating worktree: $WORK_DIR"
      mkdir -p "$WORKTREE_BASE"

      # Fetch branch
      git fetch origin "$BRANCH" 2>/dev/null || true

      # Add worktree
      if git show-ref --verify --quiet "refs/heads/$BRANCH" 2>/dev/null; then
        git worktree add "$WORK_DIR" "$BRANCH"
      elif git show-ref --verify --quiet "refs/remotes/origin/$BRANCH" 2>/dev/null; then
        git worktree add "$WORK_DIR" "$BRANCH"
      else
        # Create new branch
        echo "[spawn-agent] Creating new branch: $BRANCH"
        git worktree add "$WORK_DIR" -b "$BRANCH"
      fi

      echo "[spawn-agent] Running npm install..."
      (cd "$WORK_DIR" && npm install)
    else
      echo "[spawn-agent] ERROR: Worktree does not exist: $WORK_DIR" >&2
      echo "[spawn-agent] Use --create to auto-create" >&2
      exit 1
    fi
  else
    echo "[spawn-agent] Using existing worktree: $WORK_DIR"
  fi
fi

# Set role if specified
if [ -n "$ROLE" ]; then
  echo "[spawn-agent] Setting role to '$ROLE'..."
  "$SCRIPT_DIR/set-role.sh" "$WORK_DIR" "$ROLE"
fi

if [ -z "$PROMPT" ]; then
  echo "[spawn-agent] Starting Claude in interactive mode..."
else
  echo "[spawn-agent] Starting Claude with prompt..."
fi

# Launch agent (launch-agent.sh handles empty prompt = interactive mode)
export LAUNCH_AGENT_LABEL="spawn-agent"
exec "$SCRIPT_DIR/launch-agent.sh" "$WORK_DIR" "$PROMPT"
