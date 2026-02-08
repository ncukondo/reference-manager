---
name: review-task
description: Reviews a task file for completeness and test coverage. Use when checking task implementation status.
---

# Task Review: $ARGUMENTS

spec/tasks/$ARGUMENTS のタスクをレビューします。

## Task File
!`find spec/tasks -name "*$ARGUMENTS*" -type f 2>/dev/null | head -1`

## Review Criteria

### 1. Completion Status
- All Implementation Steps completed?

### 2. Test Coverage
- Each step has tests?

### 3. E2E Test
- End-to-end test exists?

### 4. Acceptance Criteria
- All criteria satisfied?

### 5. Code Quality
```bash
npm run lint
npm run typecheck
```

## Output Format

```markdown
## Task Review: [Task Name]

### Completion Status
- [x] Step 1: ...
- [ ] Step 2: ...

### Test Results
- Unit tests: X passed / Y failed
- E2E tests: X passed / Y failed

### Remaining Issues
- (list if any)

### Verdict
- [ ] Ready for PR
- [ ] Needs more work: [details]
```

## Actions

If task is complete:
```bash
npm run test:all
gh pr create --title "..." --body "..."
```

If incomplete, list specific remaining items.
