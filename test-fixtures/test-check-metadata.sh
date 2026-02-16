#!/usr/bin/env bash
# Manual testing script for metadata comparison feature
#
# Prerequisites:
#   npm run build
#
# Usage:
#   bash test-fixtures/test-check-metadata.sh
#
# This script tests non-TTY scenarios. For TTY-required tests (--fix),
# run manually in a terminal:
#   ref check --fix <DOI-with-metadata-drift>

set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
REF="node $PROJECT_DIR/bin/cli.js"
TMP_LIB="$(mktemp)"

cleanup() {
  rm -f "$TMP_LIB"
}
trap cleanup EXIT

echo "=== Metadata Comparison Manual Test ==="
echo ""

# Create a minimal library with a real DOI (this paper has known metadata on Crossref)
cat > "$TMP_LIB" <<'JSON'
[
  {
    "id": "test-doi-ref",
    "type": "article-journal",
    "title": "Slightly Modified Title for Testing",
    "DOI": "10.1371/journal.pmed.0020124",
    "author": [{"family": "Ioannidis", "given": "John P. A."}]
  }
]
JSON

echo "--- Test 1: ref check with metadata comparison (default) ---"
echo "Expect: metadata findings (mismatch or outdated) for modified title"
$REF check --all --no-save --library "$TMP_LIB" 2>&1 || true
echo ""

sleep 3

echo "--- Test 2: ref check --no-metadata ---"
echo "Expect: no metadata findings (comparison skipped)"
$REF check --all --no-metadata --no-save --library "$TMP_LIB" 2>&1 || true
echo ""

sleep 3

echo "--- Test 3: ref check -o json ---"
echo "Expect: JSON output with fieldDiffs in finding details"
$REF check --all --no-save -o json --library "$TMP_LIB" 2>&1 || true
echo ""

echo "=== Done ==="
