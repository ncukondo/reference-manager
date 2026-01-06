# Task Completion Checklist

## After Each Task Completion

1. **Run all quality checks**
   ```bash
   npm run typecheck  # No TypeScript errors
   npm run lint       # No lint issues
   npm run format     # Apply formatting
   npm test           # All tests pass
   ```

2. **Update spec/tasks/ROADMAP.md**
   - Mark completed task with `[x]`

3. **Commit changes**
   - Descriptive commit message
   - Push to remote

## TDD Process (Red-Green-Refactor)
1. Write tests first (Red)
2. Empty implementation with `throw new Error("Not implemented")`
3. Verify tests fail
4. Implement to pass tests (Green)
5. Refactor while keeping green
6. Run quality checks
