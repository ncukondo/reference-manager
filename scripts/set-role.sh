#!/usr/bin/env bash
set -euo pipefail

# Set the role marker in CLAUDE.md for a worktree.
#
# Usage: set-role.sh <worktree-dir> <role>
# Example: set-role.sh /path/to/worktree implement
#
# Roles:
#   implement - Worker agent for implementing tasks
#   review    - Reviewer agent for PR reviews
#
# What it does:
#   1. Removes any existing role marker from CLAUDE.md
#   2. Appends new role marker at the end

WORKTREE_DIR="${1:?Usage: set-role.sh <worktree-dir> <role>}"
ROLE="${2:?Usage: set-role.sh <worktree-dir> <role>}"

CLAUDE_MD="$WORKTREE_DIR/CLAUDE.md"

if [ ! -f "$CLAUDE_MD" ]; then
  echo "[set-role] ERROR: CLAUDE.md not found: $CLAUDE_MD" >&2
  exit 1
fi

# Validate role
case "$ROLE" in
  implement|review)
    ;;
  *)
    echo "[set-role] ERROR: Invalid role '$ROLE'. Must be 'implement' or 'review'." >&2
    exit 1
    ;;
esac

# Remove existing role marker (if any)
sed -i '/^<!-- role: .* -->$/d' "$CLAUDE_MD"

# Append new role marker
echo "" >> "$CLAUDE_MD"
echo "<!-- role: $ROLE -->" >> "$CLAUDE_MD"

echo "[set-role] Set role to '$ROLE' in $CLAUDE_MD"
