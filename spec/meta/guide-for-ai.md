# Guide for AI Assistants

Essential guidelines for AI assistants working on this project.

## Entry Point

**Always read `spec/_index.md` first.** It provides navigation to all specifications.

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
                                 └──> config/
```

- Lower layers must not import from upper layers
- Core is independent (no imports from features/cli/server)

### 4. Quality Gates

After implementation, **always** run:
```bash
npm run typecheck  # Must pass
npm run lint       # Must pass
npm run format     # Apply formatting
npm test           # All tests must pass
```

See `spec/meta/development-process.md` section 4.6 for details.

### 5. Use Serena MCP Tools

When working with existing code:
- `mcp__serena__get_symbols_overview` - Understand file structure
- `mcp__serena__find_symbol` - Find functions/classes
- `mcp__serena__search_for_pattern` - Search codebase
- Verify types and signatures before usage

See `spec/guidelines/testing.md` section "When importing already-implemented files".

## Task-Specific Specs

| Task | Read These Specs |
|------|------------------|
| New feature | `spec/features/` (relevant), `spec/guidelines/testing.md`, `spec/patterns/` |
| Bug fix | `spec/features/` (relevant), `spec/guidelines/testing.md` |
| Refactoring | `spec/architecture/`, `spec/patterns/`, `spec/decisions/` |
| CLI work | `spec/architecture/cli.md` |
| Server work | `spec/architecture/http-server.md` |
| Architecture change | `spec/core/`, `spec/architecture/`, create ADR in `spec/decisions/` |

## Pre-release Context

**Current phase: Pre-release**

- Breaking changes are acceptable
- Focus on clean, simple design
- Refactor aggressively for clarity
- No backward compatibility required

See `spec/meta/development-process.md` "Pre-release Development Notes" for details.

## Common Mistakes to Avoid

### ❌ Never
- Write code before reading specs
- Skip TDD process
- Import from upper layers (violate module dependencies)
- Use `any` type (use `unknown` instead)
- Skip quality checks
- Forget to update `ROADMAP.md`

### ✅ Always
- Read all relevant specs first
- Follow TDD: tests first, verify failure, then implement
- Respect module dependency rules
- Use proper TypeScript types
- Run all quality checks
- Update `ROADMAP.md` and specs

## Response Format

When completing tasks:

1. **Confirm understanding**: "I've read spec/_index.md, spec/meta/development-process.md, and spec/features/X.md"
2. **State approach**: "Following TDD process from spec/guidelines/testing.md"
3. **Show progress**: Use TodoWrite tool to track steps
4. **Provide file references**: Use `file:line` format (e.g., `src/core/library.ts:42`)
5. **Confirm quality**: "All tests pass, typecheck clean, lint clean"
6. **Show updates**: "Updated ROADMAP.md"

## Documentation Updates

After implementation:
- Mark tasks complete in `ROADMAP.md`
- Update specs if behavior changed
- Create ADR in `spec/decisions/` if architectural decision was made

See `spec/meta/development-process.md` section 4.7 for details.

## References

- Complete workflow: `spec/meta/development-process.md`
- TDD process: `spec/guidelines/testing.md`
- Module rules: `spec/architecture/module-dependencies.md`
- Code style: `spec/guidelines/code-style.md`
- Error patterns: `spec/patterns/error-handling.md`
- ADR template: `spec/decisions/README.md`