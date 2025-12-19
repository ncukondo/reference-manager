# Architecture Decision Records (ADRs)

This directory contains records of architectural decisions made for this project.

## What is an ADR?

An Architecture Decision Record (ADR) captures an important architectural decision along with its context and consequences.

## When to Create an ADR

Create an ADR when making:
- Major library or framework selection
- Architectural pattern decisions
- Data model changes
- Breaking changes to APIs
- Significant technical trade-offs

**Do not** create ADRs for:
- Minor implementation details
- Coding style choices (use `spec/guidelines/code-style.md`)
- Temporary workarounds
- Bug fixes

## ADR Template

Use this template for all ADRs:

```markdown
# ADR-NNN: Title

Date: YYYY-MM-DD

## Status

Accepted | Superseded by ADR-XXX | Deprecated

## Context

What is the issue that we're seeing that is motivating this decision or change?

Include:
- Background information
- Requirements and constraints
- Current situation

## Decision

What is the change that we're proposing and/or doing?

Be specific and concrete. State clearly what will be done.

## Rationale

Why did we choose this option?

List reasons in order of importance:
1. Primary reason
2. Secondary reason
3. Additional considerations

## Consequences

### Positive

What becomes easier or better?

- Benefit 1
- Benefit 2

### Negative

What becomes harder or worse? What trade-offs are we accepting?

- Trade-off 1
- Trade-off 2

### Neutral

Other impacts that are neither clearly positive nor negative:

- Impact 1
- Impact 2

## Alternatives Considered

### Option A: [Name]

**Description**: Brief description

**Pros**:
- Advantage 1
- Advantage 2

**Cons**:
- Disadvantage 1
- Disadvantage 2

**Why rejected**: Specific reason for rejection

### Option B: [Name]

(Same structure as Option A)

## References

- Links to related discussions
- Documentation
- External resources
- Related ADRs
```

## Naming Convention

ADRs are numbered sequentially:

```
ADR-001-use-typescript.md
ADR-002-use-vitest.md
ADR-003-csl-json-as-truth.md
```

Format: `ADR-NNN-brief-title.md`

- `NNN`: Three-digit number (001, 002, etc.)
- `brief-title`: Lowercase with hyphens

## Status Values

- **Accepted**: Decision is approved and implemented
- **Superseded by ADR-XXX**: Replaced by a newer decision
- **Deprecated**: No longer recommended but still in use

## Example ADR

See below for a complete example.

---

# ADR-001: Use TypeScript

Date: 2024-01-15

## Status

Accepted

## Context

The project needs a programming language for implementation. Requirements:
- Type safety to prevent runtime errors
- Good IDE support for productivity
- Wide ecosystem and community
- Node.js compatibility

## Decision

Use TypeScript for all source code.

## Rationale

1. **Type safety**: Catch errors at compile time rather than runtime
2. **Developer experience**: Excellent IDE support with autocomplete and refactoring
3. **Ecosystem**: Largest typed ecosystem in JavaScript world
4. **Migration path**: Can gradually adopt stricter types
5. **Team familiarity**: Team already knows JavaScript/TypeScript

## Consequences

### Positive

- Fewer runtime type errors
- Better refactoring capabilities
- Self-documenting code through types
- Easier onboarding for new developers

### Negative

- Compilation step required (build time overhead)
- Learning curve for advanced type features
- Some third-party libraries lack good types

### Neutral

- Need to maintain type definitions
- Requires `tsconfig.json` configuration

## Alternatives Considered

### Option A: JavaScript

**Description**: Use plain JavaScript without type checking

**Pros**:
- No compilation step
- No learning curve
- Maximum flexibility

**Cons**:
- Runtime type errors
- Poor refactoring support
- Harder to maintain large codebase

**Why rejected**: Type safety is critical for project maintainability

### Option B: Flow

**Description**: Facebook's type checker for JavaScript

**Pros**:
- Similar to TypeScript
- Type safety

**Cons**:
- Smaller ecosystem
- Less IDE support
- Declining community

**Why rejected**: TypeScript has better ecosystem and tooling

## References

- TypeScript handbook: https://www.typescriptlang.org/docs/
- Migration guide: https://www.typescriptlang.org/docs/handbook/migrating-from-javascript.html