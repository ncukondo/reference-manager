# Development Process

Complete workflow from feature request to implementation.

## Process Overview

**1. Specification → 2. Technical Selection → 3. Roadmap → 4. TDD Implementation**

## 1. Specification Phase

### Create/Update Spec Files

**What**: Define requirements, behavior, constraints

**Where**:
- `spec/features/` for new features
- `spec/core/` for core functionality changes
- `spec/architecture/` for architectural changes

**Format**: Markdown with clear examples and edge cases

### Questions to Answer

- What problem does this solve?
- What are the inputs and outputs?
- What are the edge cases?
- What should NOT be included? (non-goals)

### Example Spec Structure

```markdown
# Feature Name

## Purpose
Brief description of what this feature does and why it's needed.

## Behavior

### Normal Cases
- Input: ...
- Output: ...
- Example: ...

### Edge Cases
- Empty input: ...
- Invalid input: ...
- Boundary conditions: ...

### Error Cases
- What errors can occur?
- How should they be handled?

## Implementation Notes
- Any constraints or considerations
- Performance requirements
- Platform-specific behavior

## Non-goals
- What we explicitly won't do
- Why certain approaches are excluded
```

## 2. Technical Selection Phase

### Evaluate Options

When implementing a feature requires choosing between technologies or approaches:

1. List candidate technologies/approaches
2. Document pros/cons of each
3. Identify constraints and requirements

### Record Decision

**Where**: `spec/decisions/NNN-title.md`

**Format**: ADR (Architecture Decision Record)

**When to create an ADR**:
- Choosing a major library or framework
- Architectural pattern selection
- Data model changes
- Breaking changes to public APIs

### ADR Template

```markdown
# NNN: Decision Title

Date: YYYY-MM-DD

## Status
Accepted | Superseded | Deprecated

## Context
What problem are we solving? What constraints exist?

## Decision
What did we decide to do?

## Rationale
Why this option over others?

1. Reason 1
2. Reason 2
3. Reason 3

## Consequences

### Positive
- Benefit 1
- Benefit 2

### Negative
- Trade-off 1
- Trade-off 2

## Alternatives Considered

### Option A
- Description: ...
- Why rejected: ...

### Option B
- Description: ...
- Why rejected: ...
```

## 3. Roadmap Phase

### Update ROADMAP.md

After spec and technical decisions are clear:

1. Add new task with clear acceptance criteria
2. Organize by priority/dependency
3. Mark current phase

### Roadmap Format

```markdown
## Phase N: Feature/Milestone Name

### Tasks
- [ ] Task 1: Brief description
  - Acceptance: What "done" means
  - Dependencies: What must be completed first
- [ ] Task 2: Brief description
  - Acceptance: ...

### Current Status
- [x] Completed task A
- [x] Completed task B
- [ ] Current task C ← **IN PROGRESS**
- [ ] Next task D
- [ ] Future task E
```

## 4. TDD Implementation Phase

**Must follow** `spec/guidelines/testing.md` strictly.

### Step 1: Write Tests (Red)

```bash
# Create test file
vim src/feature/module.test.ts
```

Write comprehensive tests covering:
- Normal cases
- Edge cases
- Error cases
- Boundary conditions

### Step 2: Empty Implementation (Red)

```typescript
// src/feature/module.ts
export function myFunction(param: string): string {
  throw new Error("Not implemented");
}
```

Export all required functions/classes with proper TypeScript types.

### Step 3: Verify Failure (Red)

```bash
npm test -- module.test.ts
```

**Expected**: All tests fail with "Not implemented" errors.

**Why**: This ensures tests are actually testing the implementation.

### Step 4: Implement (Green)

```typescript
// src/feature/module.ts
export function myFunction(param: string): string {
  // Actual implementation
  return result;
}
```

**When importing already-implemented files**:
- Use Serena MCP tools to verify types and signatures
- Use `mcp__serena__find_symbol` to check function/class signatures
- Use `mcp__serena__get_symbols_overview` to understand module exports
- Verify parameter types and return types before usage

```bash
npm test -- module.test.ts
```

**Expected**: All tests pass.

Iterate until all tests are green.

### Step 5: Refactor (if needed)

1. Clean up code while keeping tests green
2. Verify tests still pass after refactoring
3. Run full test suite to ensure no regressions

### Step 6: Quality Checks (Green)

**All checks must pass** before considering implementation complete:

```bash
# 1. Type check
npm run typecheck
# Must have no TypeScript errors

# 2. Lint
npm run lint
# Must have no linting issues

# 3. Format
npm run format
# Apply consistent code formatting

# 4. Full test suite
npm test
# All tests must pass
```

### Step 7: Update Documentation

- Mark ROADMAP.md task as complete
- Update relevant spec if behavior changed
- Commit with descriptive message

## Quality Gates

Every implementation must pass:

- ✅ All tests pass
- ✅ No TypeScript errors
- ✅ No lint errors
- ✅ Code formatted
- ✅ ROADMAP.md updated
- ✅ Specs updated (if needed)

## Example TDD Session

```bash
# 1. Write tests
vim src/core/example.test.ts
# Add comprehensive test cases

# 2. Create empty implementation
vim src/core/example.ts
# Add function signatures with "Not implemented"

# 3. Verify tests fail (Red)
npm test -- example.test.ts
# Expected: All tests fail with "Not implemented"

# 4. Implement logic
vim src/core/example.ts
# Write actual implementation

# 5. Verify tests pass (Green)
npm test -- example.test.ts
# Expected: All tests pass

# 6. Run full test suite
npm test
# Expected: All tests pass

# 7. Quality checks
npm run typecheck  # No errors
npm run lint       # No errors
npm run format     # Code formatted

# 8. Update ROADMAP.md
vim ROADMAP.md
# Mark task as complete

# 9. Commit
git add .
git commit -m "feat: implement example feature

- Add example functionality with comprehensive tests
- All quality checks pass
- Update ROADMAP.md"
```

## Pre-release Development Notes

**Current phase: Pre-release**

- **Breaking changes are acceptable**
- **Focus on clean, simple design**
- **No backward compatibility required**
- **Refactor aggressively for clarity**
- **Simplify rather than add complexity**

Goals:
- Clean final architecture
- Well-tested codebase
- Clear, maintainable code
- Comprehensive documentation

**Post-release** (future):
- Follow semantic versioning
- Maintain backward compatibility
- Provide migration guides
- Gradual deprecation of old APIs

## Common Patterns

### Adding a New Feature

1. Read `spec/_index.md` → identify relevant specs
2. Create `spec/features/new-feature.md`
3. If new tech needed → create ADR in `spec/decisions/`
4. Update `ROADMAP.md` with tasks
5. Follow TDD: tests → empty impl → verify fail → implement → verify pass
6. Run quality checks
7. Update docs and commit

### Fixing a Bug

1. Read relevant spec in `spec/features/`
2. Write failing test that reproduces the bug
3. Fix the implementation
4. Verify test passes
5. Run quality checks
6. Commit with reference to issue

### Refactoring

1. Ensure full test coverage exists
2. Refactor code
3. Verify all tests still pass
4. Run quality checks
5. Update specs if behavior changed
6. Commit