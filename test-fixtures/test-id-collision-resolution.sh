#!/bin/bash
# test-fixtures/test-id-collision-resolution.sh
# Tests for edit/update ID collision auto-resolution
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
TEST_DIR=$(mktemp -d)
LIBRARY_FILE="$TEST_DIR/library.json"
REF="node $PROJECT_DIR/bin/cli.js --library $LIBRARY_FILE"

PASS=0; FAIL=0
pass() { PASS=$((PASS + 1)); echo "  PASS: $1"; }
fail() { FAIL=$((FAIL + 1)); echo "  FAIL: $1"; echo "        $2"; }

# --- Setup ---
node "$SCRIPT_DIR/generate-dummy-library.mjs" "$LIBRARY_FILE" 10

# Get first two IDs from the library
FIRST_ID=$(node -e "
  const d = require('fs').readFileSync('$LIBRARY_FILE','utf8');
  const items = JSON.parse(d);
  console.log(items[0].id);
")
SECOND_ID=$(node -e "
  const d = require('fs').readFileSync('$LIBRARY_FILE','utf8');
  const items = JSON.parse(d);
  console.log(items[1].id);
")

echo "Library: $LIBRARY_FILE"
echo "First ID: $FIRST_ID"
echo "Second ID: $SECOND_ID"
echo ""

# =============================================================================
# Test 1: update --set id=<existing-id> resolves collision with suffix
# =============================================================================
echo "=== Test 1: update --set id=<existing-id> resolves collision ==="
OUTPUT=$($REF update "$FIRST_ID" --set "id=$SECOND_ID" 2>&1 || true)
if echo "$OUTPUT" | grep -q "Updated:"; then
  pass "update resolves collision (shows Updated)"
else
  fail "update resolves collision (shows Updated)" "$OUTPUT"
fi

if echo "$OUTPUT" | grep -q "ID collision resolved:"; then
  pass "update shows 'ID collision resolved:' message"
else
  fail "update shows 'ID collision resolved:' message" "$OUTPUT"
fi

# =============================================================================
# Test 2: update --set id=<existing-id> -o json shows idChanged
# =============================================================================
echo ""
echo "=== Test 2: update -o json shows idChanged ==="
# Re-generate library to reset state
node "$SCRIPT_DIR/generate-dummy-library.mjs" "$LIBRARY_FILE" 10
FIRST_ID=$(node -e "
  const d = require('fs').readFileSync('$LIBRARY_FILE','utf8');
  const items = JSON.parse(d);
  console.log(items[0].id);
")
SECOND_ID=$(node -e "
  const d = require('fs').readFileSync('$LIBRARY_FILE','utf8');
  const items = JSON.parse(d);
  console.log(items[1].id);
")

JSON_OUT=$($REF update "$FIRST_ID" --set "id=$SECOND_ID" -o json 2>/dev/null || true)
if echo "$JSON_OUT" | node -e "
  const d=[];process.stdin.on('data',c=>d.push(c));
  process.stdin.on('end',()=>{
    const o=JSON.parse(d.join(''));
    process.exit(o.success === true && o.idChanged === true ? 0 : 1);
  })
"; then
  pass "JSON output has success=true and idChanged=true"
else
  fail "JSON output has success=true and idChanged=true" "$JSON_OUT"
fi

if echo "$JSON_OUT" | node -e "
  const d=[];process.stdin.on('data',c=>d.push(c));
  process.stdin.on('end',()=>{
    const o=JSON.parse(d.join(''));
    process.exit(o.previousId ? 0 : 1);
  })
"; then
  pass "JSON output has previousId field"
else
  fail "JSON output has previousId field" "$JSON_OUT"
fi

# =============================================================================
# Test 3: update with no collision works normally
# =============================================================================
echo ""
echo "=== Test 3: update with no collision works normally ==="
node "$SCRIPT_DIR/generate-dummy-library.mjs" "$LIBRARY_FILE" 10
FIRST_ID=$(node -e "
  const d = require('fs').readFileSync('$LIBRARY_FILE','utf8');
  const items = JSON.parse(d);
  console.log(items[0].id);
")

OUTPUT=$($REF update "$FIRST_ID" --set "title=Brand New Title" 2>&1 || true)
if echo "$OUTPUT" | grep -q "Updated:"; then
  pass "normal update shows Updated"
else
  fail "normal update shows Updated" "$OUTPUT"
fi

if echo "$OUTPUT" | grep -q "ID changed to:"; then
  fail "normal update should NOT show ID changed" "$OUTPUT"
else
  pass "normal update does not show ID changed"
fi

# =============================================================================
# Manual Test: edit command (TTY required)
# =============================================================================
echo ""
echo "=== Manual Tests (TTY required) ==="
echo "  To verify edit ID collision resolution manually:"
echo "  1. Run: node $PROJECT_DIR/bin/cli.js --library $LIBRARY_FILE list"
echo "     (note two IDs, e.g. FIRST_ID and SECOND_ID)"
echo "  2. Run: EDITOR='vi' node $PROJECT_DIR/bin/cli.js --library $LIBRARY_FILE edit FIRST_ID"
echo "  3. Change the 'id:' field to match SECOND_ID"
echo "  4. Save and quit the editor"
echo "  5. Expected: output shows the resolved ID with '(was: FIRST_ID)' notation"
echo ""

# --- Cleanup & Summary ---
rm -rf "$TEST_DIR"
echo ""
echo "Results: $PASS passed, $FAIL failed"
[ "$FAIL" -gt 0 ] && exit 1 || exit 0
