#!/usr/bin/env bash
# Hook: Validate that git worktree add commands only target the allowed directory.
# Exit code 2 = block the tool call (stderr shown to Claude as error).

set -euo pipefail

# Determine allowed worktree parent dynamically from project directory
PROJECT_DIR="${CLAUDE_PROJECT_DIR:-$(cd "$(dirname "$0")/../.." && pwd)}"
PARENT_DIR="$(dirname "$PROJECT_DIR")"
PROJECT_NAME="$(basename "$PROJECT_DIR")"
ALLOWED_PARENT="${PARENT_DIR}/${PROJECT_NAME}--worktrees"

# Read JSON input from stdin
input=$(cat)

# Extract the command from tool_input.command
command=$(echo "$input" | jq -r '.tool_input.command // ""')

# Only check git worktree add commands
if ! echo "$command" | grep -qE 'git\s+worktree\s+add\b'; then
  exit 0
fi

# Extract the target path (first argument after "git worktree add" and any flags)
# Handles: git worktree add [-f] [-b <branch>] <path> [<commit-ish>]
target_path=""
skip_next=false
found_add=false
for word in $command; do
  if $skip_next; then
    skip_next=false
    continue
  fi
  if [ "$found_add" = false ]; then
    if [ "$word" = "add" ]; then
      found_add=true
    fi
    continue
  fi
  # Skip flags
  case "$word" in
    -b|-B|--track|--no-track|--lock|--reason)
      skip_next=true
      continue
      ;;
    -f|--force|--detach|--checkout|--no-checkout|--guess-remote|--no-guess-remote|-q|--quiet)
      continue
      ;;
    -*)
      continue
      ;;
    *)
      target_path="$word"
      break
      ;;
  esac
done

if [ -z "$target_path" ]; then
  echo "Error: Could not determine worktree target path from command." >&2
  exit 2
fi

# Resolve to absolute path (relative paths resolved from project dir)
if [[ "$target_path" != /* ]]; then
  target_path="${PROJECT_DIR}/${target_path}"
fi
target_path=$(realpath -m "$target_path")

# Check if under allowed parent
if [[ "$target_path" == "$ALLOWED_PARENT"/* ]]; then
  exit 0
fi

echo "Error: Worktree must be created under ${ALLOWED_PARENT}/" >&2
echo "Requested path: $target_path" >&2
echo "Example: git worktree add ${ALLOWED_PARENT}/<branch-name> -b <branch-name>" >&2
exit 2
