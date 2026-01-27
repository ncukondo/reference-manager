# Testing & Quality

## Test Framework

- Test framework: **vitest**
- Test command: `npm test` (non-watch mode, for CI and verification)
  - Non-watch mode is set in `vitest.config.ts` with `watch: false`
- Watch mode: `npm run test:watch` (interactive watch mode, for development)
  - Explicitly uses `--watch` flag to override config

## Test-Driven Development (TDD) Workflow

All implementations MUST follow the TDD (Red-Green-Refactor) cycle:

### Step 1: Write Tests First (Red)
1. Create test file: `<module>.test.ts`
2. Write comprehensive test cases covering:
   - Normal cases
   - Edge cases
   - Error cases
   - Fallback behavior
3. Ensure tests are thorough and clear

### Step 2: Create Empty Implementation (Red)
1. Create implementation file: `<module>.ts`
2. Define function signatures with empty implementations:
   ```typescript
   export function myFunction(param: string): string {
     throw new Error("Not implemented");
   }
   ```
3. Export all required functions/classes

### Step 3: Verify Tests Fail (Red)
1. Run tests: `npm test -- <test-file>`
2. Confirm all tests fail with "Not implemented" errors
3. This ensures tests are actually testing the implementation

### Step 4: Implement (Green)
1. Implement the actual logic
   - **When importing already-implemented files**: Use Serena MCP tools to verify types and signatures
     - Use `mcp__serena__find_symbol` to check function/class signatures
     - Use `mcp__serena__get_symbols_overview` to understand module exports
     - Verify parameter types and return types before usage
2. Run tests: `npm test -- <test-file>`
3. Iterate until all tests pass

### Step 5: Refactor (if needed)
1. Clean up code while keeping tests green
2. Verify tests still pass after refactoring

### Step 6: Quality Checks (Green)
After implementation is complete and all tests pass:

1. **Type check**: `npm run typecheck`
   - Ensure no TypeScript errors
2. **Lint**: `npm run lint`
   - Fix any linting issues
3. **Format**: `npm run format`
   - Apply consistent code formatting

All quality checks must pass before considering the implementation complete.

## Example TDD Session

```bash
# 1. Write tests
vim src/core/example.test.ts

# 2. Create empty implementation
vim src/core/example.ts

# 3. Verify tests fail (Red)
npm test -- example.test.ts
# Expected: All tests fail with "Not implemented"

# 4. Implement logic
vim src/core/example.ts

# 5. Verify tests pass (Green)
npm test -- example.test.ts
# Expected: All tests pass

# 6. Run all tests to ensure no regressions
npm test

# 7. Quality checks
npm run typecheck  # Type checking
npm run lint       # Linting
npm run format     # Code formatting
```

## Manual Verification

Some features require CLI-level verification beyond unit/integration tests.
When a task includes a **Manual Verification** section, follow the pattern below.

### Pattern

1. **Generate dummy data** using `test-fixtures/generate-dummy-library.mjs`
2. **Build** with `npm run build`
3. **Create a verification shell script** in `test-fixtures/test-<feature>.sh`
4. **Run the script** and confirm all assertions pass

### Verification Script Structure

```bash
#!/bin/bash
# test-fixtures/test-<feature>.sh
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
node "$SCRIPT_DIR/generate-dummy-library.mjs" "$LIBRARY_FILE" 40

# --- Tests ---
echo "=== Test N: description ==="
OUTPUT=$($REF <command> 2>&1 || true)
if echo "$OUTPUT" | grep -q '<expected>'; then
  pass "description"
else
  fail "description" "$OUTPUT"
fi

# JSON assertion example (using node inline):
# JSON_OUT=$($REF <command> -o json 2>/dev/null || true)
# if echo "$JSON_OUT" | node -e "
#   const d=[];process.stdin.on('data',c=>d.push(c));
#   process.stdin.on('end',()=>{
#     const o=JSON.parse(d.join(''));
#     process.exit(<condition> ? 0 : 1);
#   })
# "; then pass "..."; else fail "..." "$JSON_OUT"; fi

# --- Cleanup & Summary ---
rm -rf "$TEST_DIR"
echo ""; echo "Results: $PASS passed, $FAIL failed"
[ "$FAIL" -gt 0 ] && exit 1 || exit 0
```

### Guidelines

- **Non-TTY tests** (update, add, remove, etc.) can be fully automated in the script
- **TTY-required tests** (edit with EDITOR, search -t, etc.) should be documented as
  manual steps in the task file, with a note that they require a real terminal
- **`--library <path>`** flag isolates tests from the user's real library
- **`REFERENCE_MANAGER_LIBRARY` env var** is an alternative to `--library`
- Scripts live in `test-fixtures/` and are not gitignored
- Dummy data generator: `node test-fixtures/generate-dummy-library.mjs [path] [count]`

## Required Test Coverage

Required test areas:
- Normalization (identifier, search)
- Duplicate detection
- Merge logic
- ID generation
- CSL-JSON I/O (parser, serializer, validator)
- UUID management

## Quality Tools

- **Lint & format**: biome
  - Lint: `npm run lint`
  - Format: `npm run format`
- **Type checking**: TypeScript
  - Check: `npm run typecheck`
- **CI**: GitHub Actions
  - Runs on every push
  - Must pass before merge
