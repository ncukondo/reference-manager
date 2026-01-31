#!/usr/bin/env bash
# Hook: Block git push --force and variants to prevent destructive pushes.
# Exit code 2 = block the tool call (stderr shown to Claude as error).

set -euo pipefail

# Read JSON input from stdin
input=$(cat)

# Extract the command from tool_input.command
command=$(echo "$input" | jq -r '.tool_input.command // ""')

# Only check git push commands
if ! echo "$command" | grep -qE 'git\s+push\b'; then
  exit 0
fi

# Block force push flags: --force, -f, --force-with-lease, --force-if-includes
if echo "$command" | grep -qE '(^|\s)(--force|-f|--force-with-lease|--force-if-includes)(\s|$)'; then
  echo "Error: Force push is not allowed. Use regular git push instead." >&2
  exit 2
fi

exit 0
