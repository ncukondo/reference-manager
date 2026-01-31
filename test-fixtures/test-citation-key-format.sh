#!/usr/bin/env bash
# Manual testing script for citation key format feature (PR #52)
#
# Prerequisites:
#   cd /workspaces/reference-manager--worktrees/feature/citation-key-format
#   npm run build
#
# Usage:
#   bash test-fixtures/test-citation-key-format.sh

set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
REF="node $PROJECT_DIR/bin/cli.js"
DUMMY_LIB="$SCRIPT_DIR/dummy-library.json"

echo "=== Citation Key Format Manual Test ==="
echo ""

# Step 0: Generate dummy library
echo "--- Step 0: Generate dummy library ---"
node "$SCRIPT_DIR/generate-dummy-library.mjs" "$DUMMY_LIB" 10
echo ""

# Get valid IDs
FIRST_ID=$(node -e "const d=JSON.parse(require('fs').readFileSync('$DUMMY_LIB','utf8')); console.log(d[0].id)")
SECOND_ID=$(node -e "const d=JSON.parse(require('fs').readFileSync('$DUMMY_LIB','utf8')); console.log(d[1].id)")
echo "Using test IDs: $FIRST_ID, $SECOND_ID"
echo ""

# Step 1: --key flag (default: pandoc format)
echo "--- Step 1: list --key (default pandoc format) ---"
$REF --library "$DUMMY_LIB" list --key
echo ""

# Step 2: --pandoc-key flag
echo "--- Step 2: list --pandoc-key ---"
$REF --library "$DUMMY_LIB" list --pandoc-key
echo ""

# Step 3: --latex-key flag
echo "--- Step 3: list --latex-key ---"
$REF --library "$DUMMY_LIB" list --latex-key
echo ""

# Step 4: search with --key flag
echo "--- Step 4: search --key ---"
$REF --library "$DUMMY_LIB" search "novel" --key || echo "(no results or exit code: $?)"
echo ""

# Step 5: search with --pandoc-key
echo "--- Step 5: search --pandoc-key ---"
$REF --library "$DUMMY_LIB" search "novel" --pandoc-key || echo "(no results or exit code: $?)"
echo ""

# Step 6: search with --latex-key
echo "--- Step 6: search --latex-key ---"
$REF --library "$DUMMY_LIB" search "novel" --latex-key || echo "(no results or exit code: $?)"
echo ""

# Step 7: Output format --output pandoc-key / latex-key
echo "--- Step 7: list --output pandoc-key ---"
$REF --library "$DUMMY_LIB" list --output pandoc-key
echo ""

echo "--- Step 8: list --output latex-key ---"
$REF --library "$DUMMY_LIB" list --output latex-key
echo ""

echo "=== Non-TTY tests complete ==="
echo ""
echo "=== TTY-only tests (run manually in terminal): ==="
echo ""
echo "1. TUI search with default (pandoc) key format:"
echo "   $REF --library $DUMMY_LIB search -t"
echo "   -> Select reference(s), choose 'Citation key (Pandoc)'"
echo "   -> Expected: @refid1; @refid2 format"
echo ""
echo "2. TUI search with latex key format:"
echo "   First set config: $REF config set citation.default_key_format latex"
echo "   Then: $REF --library $DUMMY_LIB search -t"
echo "   -> Select reference(s), action menu should show 'Citation key (LaTeX)'"
echo "   -> Expected: \\cite{refid1,refid2} format"
echo "   Reset: $REF config set citation.default_key_format pandoc"
echo ""

# Cleanup
rm -f "$DUMMY_LIB"
echo "Done."
