#!/usr/bin/env bash
set -euo pipefail

# Apply a layout to the current tmux window:
#   - Main pane (pane 0) takes ~45% on the left
#   - Worker panes are stacked equally on the right
#
# Usage: apply-layout.sh [session:window]
#   If no target is given, applies to the current window.
#
# Typical usage after launching workers via launch-agent.sh:
#   ./scripts/apply-layout.sh

TARGET="${1:-}"

if [ -z "${TMUX:-}" ] && [ -z "$TARGET" ]; then
  echo "ERROR: Not in a tmux session and no target specified."
  exit 1
fi

if [ -n "$TARGET" ]; then
  TARGET_FLAG=("-t" "$TARGET")
else
  TARGET_FLAG=()
fi

# Get the number of panes in the target window
PANE_COUNT=$(tmux list-panes "${TARGET_FLAG[@]}" 2>/dev/null | wc -l)

if [ "$PANE_COUNT" -lt 2 ]; then
  echo "Only $PANE_COUNT pane(s) — no layout adjustment needed."
  exit 0
fi

# Use main-vertical layout: first pane on the left, rest stacked on the right
tmux select-layout "${TARGET_FLAG[@]}" main-vertical

# Set the main pane width to ~45% of the window
WINDOW_WIDTH=$(tmux display-message "${TARGET_FLAG[@]}" -p '#{window_width}')
MAIN_WIDTH=$(( WINDOW_WIDTH * 45 / 100 ))
tmux set-window-option "${TARGET_FLAG[@]}" main-pane-width "$MAIN_WIDTH" 2>/dev/null || true

# Re-apply layout after setting width
tmux select-layout "${TARGET_FLAG[@]}" main-vertical

echo "Layout applied: main pane ${MAIN_WIDTH}cols (~45%), ${PANE_COUNT} total panes."
