#!/bin/bash
# Prevent direct npx vitest execution without --project flag.
# Use npm scripts instead: npm test, npm run test:e2e, npm run test:all, etc.

input=$(cat)
command=$(echo "$input" | jq -r '.tool_input.command // ""')

# Match npx vitest or npx vitest run (without --project)
if echo "$command" | grep -qE '(^|\s)npx vitest(\s|$)' && ! echo "$command" | grep -q '\-\-project'; then
  cat <<'EOF'
{
  "hookSpecificOutput": {
    "hookEventName": "PreToolUse",
    "permissionDecision": "deny",
    "permissionDecisionReason": "Direct npx vitest is not allowed. Use npm scripts:\n- npm test (unit tests)\n- npm run test:e2e (E2E tests)\n- npm run test:all (all projects)\n- npm run test:unit -- <file> (specific file)"
  }
}
EOF
  exit 0
fi

exit 0
