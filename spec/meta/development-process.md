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
2. Structure tasks for TDD workflow (see below)
3. Organize by priority/dependency
4. Mark current phase

### Task Structuring Principles for TDD

**Goal**: Enable smooth TDD cycles with minimal context switching and clear progress.

#### 1. Dependency-First Ordering

Start with tasks that have **no or minimal dependencies**, then progress to dependent tasks:

```
✓ Task 1: Pure utility (no dependencies)
  └→ Task 2: Uses Task 1 (depends on 1)
     └→ Task 3: Uses Task 2 (depends on 2)
        └→ Task 4: Integration (depends on 1, 2, 3)
```

**Benefits**:
- Each task can be tested in isolation
- No need to mock unimplemented dependencies
- Clear progression from foundation to integration

#### 2. Small, Atomic Units

Break tasks into **test → implement pairs** that can be completed in a single TDD cycle:

```markdown
#### Section N.M: Feature Name

- [ ] **N.M.1**: Test case description
  - File: `src/path/module.test.ts`
  - Test cases to write

- [ ] **N.M.2**: Implementation description
  - File: `src/path/module.ts`
  - Depends on: N.M.1
```

**Guidelines**:
- One test file per logical unit
- One implementation task per test task
- Each pair = 1 TDD cycle (Red → Green)

#### 3. Explicit Dependencies

Always specify what each task depends on:

```markdown
- [ ] **11.2.2**: Implement matching function
  - Depends on: 11.1.2  ← Clear dependency
```

This allows:
- Parallel work on independent tasks
- Clear understanding of task order
- Easy identification of blockers

#### 4. Layer-by-Layer Progression

Structure phases from low-level to high-level:

```
Layer 1: Pure functions / Utilities (no I/O, no dependencies)
Layer 2: Core logic (uses Layer 1)
Layer 3: Integration (connects Layer 1 & 2)
Layer 4: API / CLI (uses all layers)
Layer 5: E2E tests (tests full stack)
```

**Example Phase Structure**:
```markdown
#### N.1 Utility Functions (Unit)
Pure functions with no dependencies.

#### N.2 Core Logic (Unit)
Business logic using N.1 utilities.

#### N.3 Integration (Integration)
Connecting N.1 and N.2 into existing system.

#### N.4 Quality Checks
Full test suite, typecheck, lint.
```

#### 5. Mark Source Files for Modification

When creating a roadmap, add a comment at the top of each source file scheduled for modification:

```typescript
// TODO: Phase N - Brief description of planned changes
// See: ROADMAP.md Phase N.M for details
```

**Benefits**:
- Prevents accidental modifications during other work
- Provides context when reading the file
- Enables quick search for files affected by a phase (`grep "Phase N"`)

**Cleanup**: Remove these comments when the phase is complete.

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
  - [x] Subtask A1
  - [x] Subtask A2
- [x] Completed task B
- [ ] Current task C ← **IN PROGRESS**
  - [x] Subtask C1
  - [ ] Subtask C2
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

### Step 7: Update Progress and Commit

**After each task or subtask completion:**

1. Update ROADMAP.md - Mark task/subtask as complete (`[x]`)
2. Update relevant spec if behavior changed
3. Commit with descriptive message
4. Push to remote

**Important**: Do not batch multiple tasks. Update ROADMAP and commit/push after **each** task completion to maintain accurate progress tracking.

## Quality Gates

Every implementation must pass:

- ✅ All tests pass
- ✅ No TypeScript errors
- ✅ No lint errors
- ✅ Code formatted
- ✅ ROADMAP.md updated
- ✅ Specs updated (if needed)
- ✅ Committed and pushed

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

# 9. Commit and push
git add .
git commit -m "feat: implement example feature

- Add example functionality with comprehensive tests
- All quality checks pass
- Update ROADMAP.md"
git push
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

### Replacing Functions/Methods (API Migration)

When replacing existing functions or methods with new ones (e.g., replacing `findById`/`findByUuid` with unified `find()`):

#### Step 1: Identify All References (Required)

Use Serena MCP to identify ALL usages before making any changes:

```bash
# Find all references to the function/method
mcp__serena__search_for_pattern "\.methodName\(" --relative_path="src"

# Or use find_referencing_symbols for symbol-based search
mcp__serena__find_referencing_symbols --name_path="ClassName/methodName" --relative_path="src/file.ts"
```

Document the complete list of files and line numbers that need updating.

#### Step 2: Plan the Migration

1. Group usages by layer (core → operations → CLI → tests)
2. Determine replacement order (usually bottom-up: core first, then consumers)
3. Identify if bulk replacement is possible (identical patterns) vs manual updates needed

#### Step 3: Present Work Plan (Required)

Before executing replacements, present a clear work plan:

```markdown
## Migration Plan: methodName → newMethodName

### Files to Update
| File | Occurrences | Replacement Type |
|------|-------------|------------------|
| src/core/module.ts | 3 | Bulk replace |
| src/operations/op.ts | 5 | Manual (different patterns) |

### Planned Operations
1. **Bulk replace** in `src/core/`: `old pattern` → `new pattern`
2. **Manual update** in `src/operations/op.ts`: [describe changes]
3. **Update tests**: Add `newMethodName` to mocks

### Execution Order
1. Core layer
2. Operations layer
3. CLI layer
4. Test mocks
```

Get explicit approval before proceeding.

#### Step 4: Execute Replacements Efficiently

Use appropriate tools:
- **Bulk replacement**: Use Edit tool with `replace_all: true` for identical patterns
- **Symbol replacement**: Use `mcp__serena__replace_symbol_body` for symbol-level changes
- **Manual edits**: Use Edit tool for complex, non-uniform changes

#### Step 5: Verify and Test

1. Run typecheck to catch missing updates
2. Run tests to verify functionality
3. Search again to confirm no usages remain

#### Step 6: Mark as Deprecated or Remove

After all usages are migrated:
- Mark old methods as `@deprecated` with migration notes
- Or remove them entirely if safe (pre-release)