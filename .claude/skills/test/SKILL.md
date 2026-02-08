---
name: test
description: Runs tests, typecheck, and lint, then reports results. Use when checking code quality.
---

# Test Runner

テストを実行し、結果を報告します。

## Quick Check
!`npm run test:all 2>&1 | tail -5`

## Commands

### Full Test Suite

```bash
# All tests
npm run test:all

# Type check
npm run typecheck

# Lint
npm run lint
```

### Specific Tests

If $ARGUMENTS is provided, run only matching tests:
```bash
npm run test -- --grep "$ARGUMENTS"
# or
npm run test -- $ARGUMENTS
```

## Report Format

### 1. Test Summary
- Total: X tests
- Passed: X
- Failed: X
- Skipped: X

### 2. Failed Tests (if any)
```
Test: [test name]
Error: [error message]
Location: [file:line]
```

### 3. Type Errors (if any)
```
File: [path]
Error: [message]
```

### 4. Lint Errors (if any)
```
File: [path]
Rule: [rule name]
Message: [message]
```

## On Failure

If tests, typecheck, or lint fail:
1. Analyze the root cause
2. Propose a fix
3. If simple, offer to fix immediately
4. If complex, create a task

## Quick Fixes

```bash
# Auto-fix lint issues
npm run lint -- --fix

# Update snapshots (if applicable)
npm run test -- -u
```
