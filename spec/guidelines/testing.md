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
