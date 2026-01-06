# Guide for AI Assistants

Essential guidelines for AI assistants working on this project.

## Entry Point

**Always read `spec/_index.md` first.** It provides navigation to all specifications.

## Spec Philosophy: Token Efficiency

Specs are designed for **minimal token consumption**:

1. **Specs describe "what" and "why", not "how"**
   - Implementation details belong in source code
   - If code shows it clearly, don't duplicate in spec

2. **Reference source code for implementation details**
   - Use `See: src/path/file.ts` to point to implementation
   - Source code is the single source of truth for "how"

3. **Read specs on-demand by task**
   - Each spec file covers one topic
   - Only read specs relevant to current task

4. **When in doubt, check the code first**
   - Source code comments explain implementation details
   - Spec explains requirements and constraints

## Workflow

Follow the complete workflow in `spec/meta/development-process.md`:

1. **Specification** → 2. **Technical Selection** → 3. **Roadmap** → 4. **TDD Implementation**

Do not skip steps. Follow the process strictly.

## Critical Rules

### 1. Read Specs Before Writing Code

**Never write code before reading relevant specs.**

Required reading order:
1. `spec/_index.md`
2. `spec/meta/development-process.md`
3. Relevant specs for the task (see `spec/_index.md` reading guide)

### 2. TDD is Mandatory

See `spec/guidelines/testing.md` for complete TDD workflow.

**Always**:
- Write tests first
- Create empty implementation with `throw new Error("Not implemented")`
- Verify tests fail
- Implement to make tests pass
- Run quality checks

**Never**:
- Write implementation before tests
- Skip test verification step

### 3. Module Dependencies

See `spec/architecture/module-dependencies.md` for complete rules.

**Critical constraint**:
```
cli/
server/  ──> features/ ──> core/ ──> utils/
mcp/                            └──> config/
```

- Lower layers must not import from upper layers
- Core is independent (no imports from features/cli/server/mcp)

### 4. Quality Gates

After implementation, **always** run:
```bash
npm run typecheck  # Must pass
npm run lint       # Must pass
npm run format     # Apply formatting
npm test           # All tests must pass
```

### 5. Verify Types Before Using Existing Code

When importing from existing modules:
- Check function/class signatures in source code
- Verify parameter types and return types
- Read JSDoc comments if available

## Task-Specific Specs

| Task | Read These Specs |
|------|------------------|
| New feature | `spec/features/` (relevant), `spec/guidelines/testing.md` |
| Bug fix | `spec/features/` (relevant), `spec/guidelines/testing.md` |
| Refactoring | `spec/architecture/`, `spec/decisions/` |
| CLI work | `spec/architecture/cli.md` |
| MCP work | `spec/architecture/mcp-server.md` |
| Architecture change | `spec/core/`, `spec/architecture/`, create ADR |

## Pre-release Context

**Current phase: Pre-release (Alpha)**

- Breaking changes are acceptable
- Focus on clean, simple design
- Refactor aggressively for clarity
- No backward compatibility required

## Common Mistakes to Avoid

### Don't
- Write code before reading specs
- Skip TDD process
- Import from upper layers (violate module dependencies)
- Use `any` type (use `unknown` instead)
- Skip quality checks
- Forget to update `spec/tasks/ROADMAP.md`

### Do
- Read all relevant specs first
- Follow TDD: tests first, verify failure, then implement
- Respect module dependency rules
- Use proper TypeScript types
- Run all quality checks
- Update `spec/tasks/ROADMAP.md` and specs

## Documentation Updates

After implementation:
- Mark tasks complete in `spec/tasks/ROADMAP.md`
- Update specs if behavior changed
- Create ADR in `spec/decisions/` if architectural decision was made

## References

- Complete workflow: `spec/meta/development-process.md`
- TDD process: `spec/guidelines/testing.md`
- Module rules: `spec/architecture/module-dependencies.md`
- Code style: `spec/guidelines/code-style.md`
- Error patterns: `spec/patterns/error-handling.md`
- ADR template: `spec/decisions/README.md`
