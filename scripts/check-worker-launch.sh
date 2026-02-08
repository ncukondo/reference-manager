#!/usr/bin/env bash
# Check if Claude Code was launched via worker script.
#
# This hook blocks manual launches in worktrees and suggests using the proper scripts.
# Set CLAUDE_WORKER_ID environment variable to bypass this check.
#
# Used by: .claude/settings.json (SessionStart hook)

# If CLAUDE_WORKER_ID is set, allow the session
if [[ -n "${CLAUDE_WORKER_ID:-}" ]]; then
  exit 0
fi

# Check if we're in a worktree
CWD=$(pwd)
if [[ "$CWD" == *"--worktrees"* ]]; then
  # In a worktree but no WORKER_ID - block with helpful message
  cat << 'EOF'
{
  "continue": false,
  "stopReason": "Manual launch in worktree detected.\n\nPlease use the worker scripts instead:\n  ./scripts/spawn-worker.sh <branch> <task>\n  ./scripts/spawn-reviewer.sh <branch>\n  ./scripts/launch-agent.sh <worktree-dir> <prompt>\n\nThese scripts set up proper state tracking for agent monitoring."
}
EOF
  exit 0
fi

# Not in a worktree - allow (main development)
exit 0
