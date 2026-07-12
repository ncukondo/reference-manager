#!/usr/bin/env bash
set -euo pipefail

# Start a review agent for a PR.
#
# Usage: start-review.sh <pr-number>
# Example: start-review.sh 56
#
# Thin wrapper around spawn-reviewer.sh (kept for backward compatibility).

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PR_NUMBER="${1:?Usage: start-review.sh <pr-number>}"

export LAUNCH_AGENT_LABEL="start-review"
exec "$SCRIPT_DIR/spawn-reviewer.sh" --pr "$PR_NUMBER"
