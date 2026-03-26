#!/usr/bin/env bash
set -euo pipefail

# Manual verification script for `ref install --skills`
# Usage: ./test-fixtures/test-install-skills.sh [path-to-binary]

REF="${1:-ref}"
WORK_DIR="$(mktemp -d)"
trap 'rm -rf "$WORK_DIR"' EXIT

pass=0
fail=0

check() {
  local desc="$1"
  shift
  if "$@" >/dev/null 2>&1; then
    echo "  PASS: $desc"
    ((pass++))
  else
    echo "  FAIL: $desc"
    ((fail++))
  fi
}

echo "=== ref install --skills ==="

# Test 1: Fresh install creates files
echo "[1] Fresh install"
cd "$WORK_DIR"
$REF install skills
check ".agents/skills/ref/SKILL.md exists" test -f .agents/skills/ref/SKILL.md
check ".agents/skills/ref/references/systematic-review.md exists" test -f .agents/skills/ref/references/systematic-review.md
check ".agents/skills/ref/references/manuscript-writing.md exists" test -f .agents/skills/ref/references/manuscript-writing.md
check ".agents/skills/ref/references/fulltext.md exists" test -f .agents/skills/ref/references/fulltext.md
check ".claude/skills/ref is a symlink" test -L .claude/skills/ref
check ".claude/skills/ref/SKILL.md is accessible via symlink" test -f .claude/skills/ref/SKILL.md

# Test 2: Re-run shows skip message
echo "[2] Re-run (skip existing)"
OUTPUT=$($REF install skills 2>&1)
check "Output contains skip/up-to-date message" echo "$OUTPUT" | grep -q -i "up-to-date\|skipped"

# Test 3: Force overwrite
echo "[3] Force overwrite"
echo "modified" > .agents/skills/ref/SKILL.md
$REF install skills --force
CONTENT=$(cat .agents/skills/ref/SKILL.md)
check "SKILL.md was overwritten (not 'modified')" test "$CONTENT" != "modified"
check ".claude/skills/ref symlink still works" test -f .claude/skills/ref/SKILL.md

echo ""
echo "Results: $pass passed, $fail failed"
if [ "$fail" -gt 0 ]; then
  exit 1
fi
