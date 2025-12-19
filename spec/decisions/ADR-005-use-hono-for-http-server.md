# ADR-005: Use Hono for HTTP Server

Date: 2024-01-15

## Status

Accepted

## Context

The project needs an HTTP server framework for the background server mode. Requirements:
- Lightweight (minimal overhead)
- ESM compatible
- TypeScript-first
- Good routing
- Node.js adapter support
- Simple API

Candidates: Express, Fastify, Hono, Koa

## Decision

Use Hono with Node.js adapter for HTTP server implementation.

## Rationale

1. **TypeScript-first**: Built with TypeScript, excellent type inference
2. **Lightweight**: Ultra-small footprint, minimal dependencies
3. **ESM native**: Native ESM support, no compatibility layer
4. **Modern API**: Clean, intuitive routing and middleware
5. **Performance**: Very fast, optimized for edge/serverless
6. **Node.js adapter**: Works seamlessly with Node.js
7. **Middleware**: Built-in middleware for common tasks
8. **Context**: Type-safe request context

## Consequences

### Positive

- Excellent TypeScript experience
- Small bundle size
- Fast performance
- Clean, modern API
- Type-safe routing
- Good documentation
- Active development

### Negative

- Newer framework (smaller ecosystem than Express)
- Fewer third-party middleware options
- Less StackOverflow answers

### Neutral

- Uses Node.js adapter (adds minimal overhead)
- Different API from Express (not compatible)

## Alternatives Considered

### Option A: Express

**Description**: De facto standard Node.js web framework

**Pros**:
- Industry standard
- Huge ecosystem
- Extensive third-party middleware
- Well-known by all developers

**Cons**:
- Poor TypeScript support
- Callback-based (not async/await native)
- Heavy with all middleware
- Legacy API design
- CommonJS-focused

**Why rejected**: Poor TypeScript support, legacy design doesn't fit modern ESM + TypeScript project

### Option B: Fastify

**Description**: Fast, low overhead web framework

**Pros**:
- Very fast
- Good TypeScript support
- Plugin system
- Schema validation built-in

**Cons**:
- More complex than needed for internal API
- Heavier than Hono
- Plugin system adds complexity

**Why rejected**: More complex than needed for simple internal API

### Option C: Koa

**Description**: Next-generation web framework by Express team

**Pros**:
- Modern async/await
- Middleware composition
- Lightweight core

**Cons**:
- Weak TypeScript support
- Smaller ecosystem than Express
- Less active development
- Requires more manual setup

**Why rejected**: TypeScript support not as good as Hono

## References

- Hono documentation: https://hono.dev/
- Node.js adapter: https://hono.dev/getting-started/nodejs
- TypeScript usage: https://hono.dev/guides/typescript