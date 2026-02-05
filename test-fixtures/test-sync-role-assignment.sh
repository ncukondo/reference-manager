#!/usr/bin/env bash
# Manual testing script for sync interactive role assignment (Step 33.7)
#
# Non-TTY tests (automated). TTY tests require a real terminal — see task file.
#
# Prerequisites:
#   npm run build
#
# Usage:
#   bash test-fixtures/test-sync-role-assignment.sh

set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
TEST_DIR=$(mktemp -d)
LIBRARY_FILE="$TEST_DIR/library.json"
ATTACHMENTS_DIR="$TEST_DIR/attachments"
REF="node $PROJECT_DIR/bin/cli.js --library $LIBRARY_FILE"

PASS=0; FAIL=0
pass() { PASS=$((PASS + 1)); echo "  PASS: $1"; }
fail() { FAIL=$((FAIL + 1)); echo "  FAIL: $1"; echo "        $2"; }

# --- Setup ---
echo "=== Sync Role Assignment Tests ==="
echo "Test dir: $TEST_DIR"
echo ""

# Create a library with one reference
cat > "$LIBRARY_FILE" <<'JSONEOF'
[
  {
    "id": "Smith-2024",
    "type": "article-journal",
    "title": "Test Article",
    "author": [{"family": "Smith", "given": "John"}],
    "issued": {"date-parts": [[2024]]},
    "custom": {
      "uuid": "123e4567-e89b-12d3-a456-426614174000",
      "created_at": "2024-01-01T00:00:00.000Z",
      "timestamp": "2024-01-01T00:00:00.000Z"
    }
  }
]
JSONEOF

mkdir -p "$ATTACHMENTS_DIR"
export REFERENCE_MANAGER_ATTACHMENTS_DIR="$ATTACHMENTS_DIR"

# --- Test 1: --yes with non-standard files (role suggestion + rename) ---
echo "=== Test 1: --yes with non-standard PDF (suggestion + rename) ==="

# Create attachment directory
OUTPUT=$($REF attach open Smith-2024 --print --no-sync 2>&1 || true)
REF_DIR=$(find "$ATTACHMENTS_DIR" -maxdepth 1 -type d | tail -1)

# Add a non-standard PDF
echo "pdf content" > "$REF_DIR/mmc1.pdf"

# Sync with --yes
OUTPUT=$($REF attach sync Smith-2024 --yes 2>&1 || true)
if echo "$OUTPUT" | grep -q "Added"; then
  pass "sync --yes applied changes"
else
  fail "sync --yes should report Added" "$OUTPUT"
fi

# Verify file was renamed
if [ -f "$REF_DIR/fulltext-mmc1.pdf" ]; then
  pass "mmc1.pdf renamed to fulltext-mmc1.pdf"
else
  fail "mmc1.pdf should be renamed to fulltext-mmc1.pdf" "$(ls "$REF_DIR")"
fi

# Verify renamed file accessible via get
OUTPUT=$($REF attach get Smith-2024 --role fulltext 2>&1 || true)
if echo "$OUTPUT" | grep -q "fulltext-mmc1.pdf"; then
  pass "renamed file accessible via get --role fulltext"
else
  fail "renamed file should be accessible via get" "$OUTPUT"
fi
echo ""

# --- Test 2: --yes --no-rename keeps original filenames ---
echo "=== Test 2: --yes --no-rename keeps original filenames ==="

# Reset: detach all and re-create directory
$REF attach detach Smith-2024 fulltext-mmc1.pdf --remove-files > /dev/null 2>&1 || true
$REF attach open Smith-2024 --print --no-sync > /dev/null 2>&1 || true
REF_DIR=$(find "$ATTACHMENTS_DIR" -maxdepth 1 -type d | tail -1)

# Add another non-standard file
echo "supplement content" > "$REF_DIR/PIIS0092867424000011.pdf"

OUTPUT=$($REF attach sync Smith-2024 --yes --no-rename 2>&1 || true)
if echo "$OUTPUT" | grep -q "Added"; then
  pass "sync --yes --no-rename applied changes"
else
  fail "sync --yes --no-rename should report Added" "$OUTPUT"
fi

# Verify original filename kept on disk
if [ -f "$REF_DIR/PIIS0092867424000011.pdf" ]; then
  pass "original filename preserved with --no-rename"
else
  fail "original filename should be preserved" "$(ls "$REF_DIR")"
fi
echo ""

# --- Test 3: dry-run shows suggestion preview ---
echo "=== Test 3: dry-run shows suggestion preview ==="

# Reset: detach and re-create directory
$REF attach detach Smith-2024 PIIS0092867424000011.pdf --remove-files > /dev/null 2>&1 || true
$REF attach open Smith-2024 --print --no-sync > /dev/null 2>&1 || true
REF_DIR=$(find "$ATTACHMENTS_DIR" -maxdepth 1 -type d | tail -1)

# Add non-standard file
echo "data" > "$REF_DIR/mmc2.pdf"

OUTPUT=$($REF attach sync Smith-2024 2>&1 || true)
if echo "$OUTPUT" | grep -q "suggested"; then
  pass "dry-run shows suggested role"
else
  fail "dry-run should show suggested role" "$OUTPUT"
fi

if echo "$OUTPUT" | grep -q "rename"; then
  pass "dry-run shows rename preview"
else
  fail "dry-run should show rename preview" "$OUTPUT"
fi

if echo "$OUTPUT" | grep -q "\-\-yes"; then
  pass "dry-run shows apply instruction"
else
  fail "dry-run should show --yes instruction" "$OUTPUT"
fi
echo ""

# --- Test 4: context-aware suggestion with existing fulltext ---
echo "=== Test 4: non-standard PDF suggested as supplement when standard fulltext coexists ==="

# Apply previous file
$REF attach sync Smith-2024 --yes > /dev/null 2>&1 || true

# Add one standard fulltext and one non-standard PDF simultaneously
echo "fulltext content" > "$REF_DIR/fulltext.pdf"
echo "supplement content" > "$REF_DIR/mmc3.pdf"

OUTPUT=$($REF attach sync Smith-2024 2>&1 || true)
# fulltext.pdf should be detected as "fulltext" (standard name)
if echo "$OUTPUT" | grep -q "fulltext.pdf"; then
  pass "standard fulltext.pdf detected"
else
  fail "fulltext.pdf should be detected" "$OUTPUT"
fi

# mmc3.pdf should be suggested as supplement (since fulltext.pdf coexists as fulltext in newFiles)
if echo "$OUTPUT" | grep -qi "mmc3.pdf" && echo "$OUTPUT" | grep -q "supplement"; then
  pass "mmc3.pdf suggested as supplement (fulltext coexists)"
else
  fail "mmc3.pdf should be suggested as supplement when fulltext coexists" "$OUTPUT"
fi
echo ""

# --- Test 5: data-like extensions suggest supplement ---
echo "=== Test 5: data-like extension suggests supplement ==="

$REF attach sync Smith-2024 --yes > /dev/null 2>&1 || true

echo "data" > "$REF_DIR/results.xlsx"

OUTPUT=$($REF attach sync Smith-2024 2>&1 || true)
if echo "$OUTPUT" | grep -q "supplement"; then
  pass ".xlsx suggested as supplement"
else
  fail ".xlsx should be suggested as supplement" "$OUTPUT"
fi
echo ""

# --- Cleanup & Summary ---
rm -rf "$TEST_DIR"
echo ""
echo "Results: $PASS passed, $FAIL failed"
[ "$FAIL" -gt 0 ] && exit 1 || exit 0
