#!/usr/bin/env bash
# Manual testing script for the url command (PR #53)
#
# Prerequisites:
#   cd /workspaces/reference-manager--worktrees/feature/url-command
#   npm run build
#
# Usage:
#   bash test-fixtures/test-url-command.sh

set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
REF="node $PROJECT_DIR/bin/cli.js"
DUMMY_LIB="$SCRIPT_DIR/dummy-library.json"

echo "=== URL Command Manual Test ==="
echo ""

# Step 0: Generate dummy library with URL fields
echo "--- Step 0: Generate dummy library ---"
node "$SCRIPT_DIR/generate-dummy-library.mjs" "$DUMMY_LIB" 20
echo ""

# Get a valid ID from the library
FIRST_ID=$(node -e "const d=JSON.parse(require('fs').readFileSync('$DUMMY_LIB','utf8')); console.log(d[0].id)")
SECOND_ID=$(node -e "const d=JSON.parse(require('fs').readFileSync('$DUMMY_LIB','utf8')); console.log(d[1].id)")
echo "Using test IDs: $FIRST_ID, $SECOND_ID"
echo ""

# Step 1: Basic URL resolution (all URLs for single ID)
echo "--- Step 1: All URLs for single ID (no filter) ---"
$REF --library "$DUMMY_LIB" url "$FIRST_ID" || echo "(exit code: $?)"
echo ""

# Step 2: Multiple IDs (TSV format)
echo "--- Step 2: Multiple IDs (TSV format) ---"
$REF --library "$DUMMY_LIB" url "$FIRST_ID" "$SECOND_ID" || echo "(exit code: $?)"
echo ""

# Step 3: --default filter
echo "--- Step 3: --default filter ---"
$REF --library "$DUMMY_LIB" url "$FIRST_ID" --default || echo "(exit code: $?)"
echo ""

# Step 4: --doi filter
echo "--- Step 4: --doi filter ---"
$REF --library "$DUMMY_LIB" url "$FIRST_ID" --doi || echo "(exit code: $?)"
echo ""

# Step 5: --pubmed filter
echo "--- Step 5: --pubmed filter ---"
$REF --library "$DUMMY_LIB" url "$FIRST_ID" --pubmed || echo "(exit code: $?)"
echo ""

# Step 6: --pmcid filter
echo "--- Step 6: --pmcid filter ---"
$REF --library "$DUMMY_LIB" url "$FIRST_ID" --pmcid || echo "(exit code: $?)"
echo ""

# Step 7: Not found error
echo "--- Step 7: Reference not found error ---"
$REF --library "$DUMMY_LIB" url nonexistent 2>&1 || echo "(exit code: $?)"
echo ""

# Step 8: Non-TTY stdin test
echo "--- Step 8: Non-TTY stdin test ---"
echo "$FIRST_ID" | $REF --library "$DUMMY_LIB" url --default 2>&1 || echo "(exit code: $?)"
echo ""

echo "=== Non-TTY tests complete ==="
echo ""
echo "=== TTY-only tests (run manually in terminal): ==="
echo ""
echo "1. Interactive selection:"
echo "   $REF --library $DUMMY_LIB url"
echo "   (should open interactive search, select a reference, see URLs)"
echo ""
echo "2. Open in browser:"
echo "   $REF --library $DUMMY_LIB url $FIRST_ID --open"
echo "   (should open the DOI/default URL in system browser)"
echo ""

# Cleanup
rm -f "$DUMMY_LIB"
echo "Done."
