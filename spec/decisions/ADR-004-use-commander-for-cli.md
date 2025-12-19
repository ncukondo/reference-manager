# ADR-004: Use Commander for CLI

Date: 2024-01-13

## Status

Accepted

## Context

The project needs a CLI framework to handle command parsing, arguments, options, and help text.

Requirements:
- Subcommand support (add, search, list, etc.)
- Type-safe argument parsing
- Good help text generation
- ESM compatible
- Minimal dependencies

Main candidates: Commander, Yargs, oclif, Cliffy

## Decision

Use Commander.js for CLI implementation.

## Rationale

1. **Simplicity**: Minimal API, easy to understand
2. **Lightweight**: Small package size, few dependencies
3. **Type-safe**: Good TypeScript support
4. **Subcommands**: Built-in subcommand support
5. **Help generation**: Automatic help text
6. **ESM support**: Works seamlessly with ESM
7. **Mature**: Battle-tested, widely used (npm, pnpm, etc.)
8. **Documentation**: Excellent documentation and examples

## Consequences

### Positive

- Simple, readable CLI code
- Automatic help generation
- Type-safe command definitions
- Small bundle size
- Well-documented
- Active maintenance

### Negative

- Less feature-rich than oclif (no built-in plugins, themes)
- Manual implementation of some advanced features

### Neutral

- Need to handle configuration loading separately
- Error formatting is basic (can customize)

## Alternatives Considered

### Option A: Yargs

**Description**: Feature-rich argument parser

**Pros**:
- Very feature-rich
- Powerful parsing
- Good community

**Cons**:
- More complex API
- Larger package size
- Heavier syntax for TypeScript
- More dependencies

**Why rejected**: Too complex for our needs, Commander is simpler

### Option B: oclif

**Description**: Framework for building CLIs with plugins

**Pros**:
- Very powerful
- Plugin system
- Advanced features (auto-update, themes)
- Used by Heroku, Salesforce

**Cons**:
- Heavy framework (many dependencies)
- Steep learning curve
- Overkill for simple CLI
- More opinionated structure

**Why rejected**: Too heavy for a simple CLI tool, unnecessary complexity

### Option C: Cliffy (Deno)

**Description**: CLI framework for Deno

**Pros**:
- Modern
- Type-safe
- Good DX

**Cons**:
- Deno-specific (we need Node.js)

**Why rejected**: Not compatible with Node.js

## References

- Commander documentation: https://github.com/tj/commander.js
- TypeScript usage: https://github.com/tj/commander.js#typescript