# ADR-002: Use Vitest for Testing

Date: 2024-01-12

## Status

Accepted

## Context

The project needs a testing framework for TypeScript/ESM code. Requirements:
- ESM support (project uses `"type": "module"`)
- TypeScript support without complex configuration
- Fast execution
- Good developer experience
- Compatible with CI/CD

Main candidates: Jest, Vitest, Node.js native test runner

## Decision

Use Vitest as the testing framework.

## Rationale

1. **Native ESM support**: Works seamlessly with `"type": "module"` without workarounds
2. **TypeScript integration**: Shares configuration with Vite build system
3. **Performance**: Significantly faster than Jest for TypeScript/ESM projects
4. **Jest compatibility**: API-compatible with Jest, minimal learning curve
5. **Developer experience**: Excellent watch mode, clear error messages
6. **Vite ecosystem**: Already using Vite for build, natural fit

## Consequences

### Positive

- No complex configuration for ESM
- Fast test execution and watch mode
- Shared TypeScript configuration with Vite
- Jest-compatible API (easy learning curve)
- Active development and community
- Good VS Code integration

### Negative

- Smaller ecosystem than Jest (fewer third-party plugins)
- Newer tool (less battle-tested)
- Some Jest plugins may not work directly

### Neutral

- Requires `vitest.config.ts` configuration file
- Need to use `vitest` command instead of `jest`

## Alternatives Considered

### Option A: Jest

**Description**: Industry standard testing framework

**Pros**:
- Most popular testing framework
- Huge ecosystem of plugins
- Extensive documentation
- Well-established best practices

**Cons**:
- Poor ESM support (requires experimental flags)
- Complex configuration for TypeScript + ESM
- Slower performance with TypeScript
- Duplicate configuration (separate from Vite)

**Why rejected**: ESM and TypeScript configuration complexity is significant friction

### Option B: Node.js Native Test Runner

**Description**: Use Node.js built-in test runner (node --test)

**Pros**:
- No dependencies
- Native solution
- Built into Node.js 18+

**Cons**:
- Less feature-rich
- No built-in assertion library
- Limited mocking capabilities
- Minimal developer tooling
- No watch mode (as of Node 18)

**Why rejected**: Lacks essential features for productive development

## References

- Vitest documentation: https://vitest.dev/
- ESM support comparison: https://vitest.dev/guide/comparisons.html
- Migration from Jest: https://vitest.dev/guide/migration.html