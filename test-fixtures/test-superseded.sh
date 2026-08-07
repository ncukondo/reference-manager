#!/usr/bin/env bash
set -euo pipefail

# Manual verification for superseded pointers and the deprecate command (#108).
# Usage: ./test-fixtures/test-superseded.sh
#
# Run `npm run build` first — this exercises the built CLI, not the sources.

CLI="${CLI:-node bin/cli.js}"
PASS=0
FAIL=0
TMPDIR="$(mktemp -d)"
trap 'rm -rf "$TMPDIR"' EXIT

LIB="$TMPDIR/library.json"
export REFERENCE_MANAGER_LIBRARY="$LIB"

cat > "$LIB" <<'JSON'
[
  {"id":"Carless2020-yj","type":"article-journal","title":"Online first version",
   "DOI":"10.1080/13562517.2020.1782372",
   "custom":{"uuid":"11111111-1111-4111-8111-111111111111",
             "created_at":"2026-01-01T00:00:00.000Z","timestamp":"2026-01-01T00:00:00.000Z"}},
  {"id":"Carless2023-yt","type":"article-journal","title":"Version of record",
   "DOI":"10.1080/13562517.2020.1782372",
   "custom":{"uuid":"22222222-2222-4222-8222-222222222222",
             "created_at":"2026-01-01T00:00:00.000Z","timestamp":"2026-01-01T00:00:00.000Z"}}
]
JSON

expect_contains() {
  local desc="$1" haystack="$2" needle="$3"
  if [[ "$haystack" == *"$needle"* ]]; then
    echo "  PASS: $desc"
    PASS=$((PASS + 1))
  else
    echo "  FAIL: $desc"
    echo "        expected to contain: $needle"
    echo "        got: $haystack"
    FAIL=$((FAIL + 1))
  fi
}

expect_not_contains() {
  local desc="$1" haystack="$2" needle="$3"
  if [[ "$haystack" != *"$needle"* ]]; then
    echo "  PASS: $desc"
    PASS=$((PASS + 1))
  else
    echo "  FAIL: $desc (unexpectedly contained: $needle)"
    FAIL=$((FAIL + 1))
  fi
}

expect_exit() {
  local desc="$1" expected="$2"
  shift 2
  local actual=0
  "$@" >/dev/null 2>&1 || actual=$?
  if [[ "$actual" == "$expected" ]]; then
    echo "  PASS: $desc"
    PASS=$((PASS + 1))
  else
    echo "  FAIL: $desc (exit $actual, expected $expected)"
    FAIL=$((FAIL + 1))
  fi
}

echo "== baseline export (before marking) =="
BEFORE="$($CLI export --all -o json 2>/dev/null)"

echo "== deprecate =="
OUT="$($CLI deprecate Carless2020-yj --to Carless2023-yt --reason duplicate 2>&1)"
expect_contains "reports the mark" "$OUT" "Marked Carless2020-yj as superseded by Carless2023-yt (duplicate)"

STORED="$(node -e "console.log(JSON.stringify(require('$LIB')[0].custom))")"
expect_contains "stores the successor uuid, not its key" "$STORED" "22222222-2222-4222-8222-222222222222"
expect_contains "stores the reason" "$STORED" '"superseded_reason":"duplicate"'

echo "== show =="
OUT="$($CLI show Carless2020-yj 2>&1)"
expect_contains "pretty output marks the record" "$OUT" "SUPERSEDED by Carless2023-yt (duplicate)"
OUT="$($CLI show Carless2020-yj 2>&1 >/dev/null)"
expect_contains "warns on stderr" "$OUT" "[SUPERSEDED] Carless2020-yj -> Carless2023-yt (duplicate)"

echo "== export: included, warned, stdout unchanged =="
AFTER="$($CLI export --all -o json 2>/dev/null)"
expect_contains "record is still exported" "$AFTER" "Carless2020-yj"
ERR="$($CLI export --all -o json 2>&1 >/dev/null)"
expect_contains "warns per record" "$ERR" "[SUPERSEDED] Carless2020-yj -> Carless2023-yt"
expect_contains "prints the summary" "$ERR" "1 superseded reference included. Update your manuscript keys."
# stdout differs only by the mark itself, which lives under custom
if [[ "$(echo "$BEFORE" | grep -c 'Carless2020-yj')" == "$(echo "$AFTER" | grep -c 'Carless2020-yj')" ]]; then
  echo "  PASS: stdout still carries the record"
  PASS=$((PASS + 1))
else
  echo "  FAIL: stdout dropped the record"
  FAIL=$((FAIL + 1))
fi

echo "== list =="
OUT="$($CLI list --ids-only 2>/dev/null)"
expect_not_contains "hides superseded by default" "$OUT" "Carless2020-yj"
expect_contains "keeps the successor" "$OUT" "Carless2023-yt"
OUT="$($CLI list --ids-only --include-superseded 2>/dev/null)"
expect_contains "--include-superseded shows it" "$OUT" "Carless2020-yj"

echo "== search warns but does not filter =="
OUT="$($CLI search "Online first" --ids-only 2>/dev/null)"
expect_contains "result is not filtered out" "$OUT" "Carless2020-yj"
ERR="$($CLI search "Online first" --ids-only 2>&1 >/dev/null)"
expect_contains "search warns" "$ERR" "[SUPERSEDED] Carless2020-yj"

echo "== cite warns =="
ERR="$($CLI cite Carless2020-yj 2>&1 >/dev/null)"
expect_contains "cite warns" "$ERR" "[SUPERSEDED] Carless2020-yj"

echo "== validation =="
expect_exit "cycle is rejected" 1 $CLI deprecate Carless2023-yt --to Carless2020-yj
expect_exit "self-reference is rejected" 1 $CLI deprecate Carless2020-yj --to Carless2020-yj
expect_exit "--to with --unset is rejected" 1 $CLI deprecate Carless2020-yj --to Carless2023-yt --unset
expect_exit "unknown reason is rejected" 1 $CLI deprecate Carless2020-yj --to Carless2023-yt --reason merged
expect_exit "protected field is rejected by update --set" 4 \
  $CLI update Carless2020-yj --set custom.superseded_by=hack

echo "== unset =="
OUT="$($CLI deprecate Carless2020-yj --unset 2>&1)"
expect_contains "reports the clear" "$OUT" "Cleared the superseded mark from Carless2020-yj"
STORED="$(node -e "console.log(JSON.stringify(require('$LIB')[0].custom))")"
expect_not_contains "superseded_by is gone" "$STORED" "superseded_by"
expect_not_contains "superseded_reason is gone" "$STORED" "superseded_reason"
expect_not_contains "superseded_at is gone" "$STORED" "superseded_at"

OUT="$($CLI deprecate Carless2020-yj --unset 2>&1)"
expect_contains "second unset is a no-op" "$OUT" "is not marked as superseded"

OUT="$($CLI list --ids-only 2>/dev/null)"
expect_contains "record is visible again" "$OUT" "Carless2020-yj"

echo
echo "PASS: $PASS  FAIL: $FAIL"
[[ "$FAIL" -eq 0 ]]
