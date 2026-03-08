#!/usr/bin/env bash
set -euo pipefail

# Manual verification script for single-binary distribution
# Usage: ./test-fixtures/test-binary-distribution.sh [path-to-binary]

BINARY="${1:-./dist/ref-linux-x64}"
PASS=0
FAIL=0
TMPDIR="$(mktemp -d)"
trap 'rm -rf "$TMPDIR"' EXIT

check() {
  local desc="$1"
  shift
  if "$@" &>/dev/null; then
    echo "  PASS: $desc"
    PASS=$((PASS + 1))
  else
    echo "  FAIL: $desc"
    FAIL=$((FAIL + 1))
  fi
}

echo "Testing binary: $BINARY"
echo ""

# Basic functionality
echo "=== Non-TTY Tests (automated) ==="

check "binary exists and is executable" test -x "$BINARY"
check "--version outputs version" "$BINARY" --version
check "--help shows usage" "$BINARY" --help
check "add --help shows help" "$BINARY" add --help

# Test with a temporary library
export REFERENCE_MANAGER_LIBRARY="$TMPDIR/library.json"
echo "[]" > "$REFERENCE_MANAGER_LIBRARY"

check "list works with empty library" "$BINARY" list --quiet
check "search works with empty library" "$BINARY" search test --quiet

echo ""
echo "=== Results ==="
echo "  Passed: $PASS"
echo "  Failed: $FAIL"

echo ""
echo "=== TTY-required tests (run manually in a terminal) ==="
echo "  - $BINARY                    # launches TUI search mode"
echo "  - $BINARY search --tui       # interactive search"

if [[ $FAIL -gt 0 ]]; then
  exit 1
fi
