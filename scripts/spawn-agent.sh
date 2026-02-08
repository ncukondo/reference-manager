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
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
PROJECT_NAME="$(basename "$REPO_ROOT")"
PARENT_DIR="$(dirname "$REPO_ROOT")"
WORKTREE_BASE="${PARENT_DIR}/${PROJECT_NAME}--worktrees"

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
  BRANCH_DIR=$(echo "$BRANCH" | tr '/' '-')
  WORK_DIR="$WORKTREE_BASE/$BRANCH_DIR"
  echo "[spawn-agent] Branch: $BRANCH"
elif [ -n "$BRANCH" ]; then
  BRANCH_DIR=$(echo "$BRANCH" | tr '/' '-')
  WORK_DIR="$WORKTREE_BASE/$BRANCH_DIR"
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

# Determine prompt
if [ -z "$PROMPT" ]; then
  # Interactive mode - just start Claude
  PROMPT=""
  echo "[spawn-agent] Starting Claude in interactive mode..."
else
  echo "[spawn-agent] Starting Claude with prompt..."
fi

# Launch agent
export LAUNCH_AGENT_LABEL="spawn-agent"

if [ -z "$PROMPT" ]; then
  # For interactive mode, launch Claude without sending a prompt

  if [ -z "${TMUX:-}" ]; then
    echo "[spawn-agent] ERROR: Not in a tmux session" >&2
    exit 1
  fi

  # Split pane and launch Claude
  PANE_ID=$(tmux split-window -h -d -c "$WORK_DIR" -P -F '#{pane_id}')
  echo "[spawn-agent] Agent pane: $PANE_ID"

  # Setup settings and launch
  WORKER_STATE_DIR="/tmp/claude-agent-states"
  mkdir -p "$WORKER_STATE_DIR"
  STATE_FILE="$WORKER_STATE_DIR/$PANE_ID"

  mkdir -p "$WORK_DIR/.claude"
  cat > "$WORK_DIR/.claude/settings.local.json" << SETTINGS_EOF
{
  "permissions": {
    "allow": [
      "Bash(*)",
      "Read(*)",
      "Write(*)",
      "Edit(*)",
      "Grep(*)",
      "Glob(*)",
      "mcp__serena__*"
    ]
  },
  "enableAllProjectMcpServers": true,
  "enabledMcpjsonServers": [
    "serena"
  ],
  "hooks": {
    "Stop": [{ "hooks": [{ "type": "command", "command": "echo idle > '$STATE_FILE'" }] }],
    "PreToolUse": [{ "hooks": [{ "type": "command", "command": "echo working > '$STATE_FILE'", "async": true }] }],
    "Notification": [
      { "matcher": "idle_prompt", "hooks": [{ "type": "command", "command": "echo idle > '$STATE_FILE'" }] }
    ],
    "SessionStart": [{ "hooks": [{ "type": "command", "command": "echo starting > '$STATE_FILE'" }] }],
    "SessionEnd": [{ "hooks": [{ "type": "command", "command": "rm -f '$STATE_FILE'" }] }]
  }
}
SETTINGS_EOF

  echo "starting" > "$STATE_FILE"

  tmux send-keys -t "$PANE_ID" "CLAUDE_WORKER_ID='$PANE_ID' claude"
  sleep 1
  tmux send-keys -t "$PANE_ID" Enter

  echo "[spawn-agent] Done. Agent running in pane $PANE_ID (interactive mode)"
else
  exec "$SCRIPT_DIR/launch-agent.sh" "$WORK_DIR" "$PROMPT"
fi
