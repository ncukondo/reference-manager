# ADR-003: ESM Only (No CommonJS)

Date: 2024-01-12

## Status

Accepted

## Context

The project must choose a module system. Options:
- ESM (ECMAScript Modules) only
- CommonJS only
- Dual package (support both)

Requirements:
- Modern JavaScript practices
- Good developer experience
- Future-proof
- Node.js 22+ compatibility

## Decision

Use ESM only. Set `"type": "module"` in `package.json`.

All code uses `import`/`export` syntax. No CommonJS `require()`.

## Rationale

1. **JavaScript standard**: ESM is the official ECMAScript module system
2. **Future-proof**: Industry moving toward ESM
3. **Node.js native**: Full native support in Node.js 22+
4. **Simplicity**: One module system, no dual package complexity
5. **Better static analysis**: Import/export enables better tree-shaking
6. **Top-level await**: ESM enables top-level await syntax
7. **Clean syntax**: `import`/`export` is more readable than `require`

## Consequences

### Positive

- Standard module system aligned with ECMAScript
- Better tree-shaking and bundling
- Top-level await available
- Cleaner, more readable code
- No dual package maintenance burden
- Future-proof as ecosystem moves to ESM

### Negative

- Cannot be imported by CommonJS packages (they must use dynamic `import()`)
- Some older tools may have issues
- Must use `.js` extension in imports (TypeScript quirk)

### Neutral

- Requires `"type": "module"` in package.json
- File extensions matter in imports
- Need `node:` prefix for Node.js built-ins (best practice)

## Alternatives Considered

### Option A: CommonJS Only

**Description**: Use traditional `require()`/`module.exports`

**Pros**:
- Maximum compatibility with older packages
- No file extension requirements
- Familiar to all Node.js developers

**Cons**:
- Not the JavaScript standard
- No top-level await
- Worse tree-shaking
- Legacy approach
- TypeScript prefers ESM

**Why rejected**: Legacy approach, not future-proof

### Option B: Dual Package (ESM + CommonJS)

**Description**: Publish both ESM and CommonJS versions

**Pros**:
- Maximum compatibility
- Both modern and legacy users supported

**Cons**:
- Significant complexity in build system
- Dual testing required
- Dual maintenance burden
- Easy to create subtle bugs between versions
- Package size increases

**Why rejected**: Complexity cost outweighs benefits for a CLI tool

## References

- Node.js ESM documentation: https://nodejs.org/api/esm.html
- TypeScript ESM support: https://www.typescriptlang.org/docs/handbook/esm-node.html
- Pure ESM package guide: https://gist.github.com/sindresorhus/a39789f98801d908bbc7ff3ecc99d99c