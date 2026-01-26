# ADR-012: Use Enquirer for Interactive Prompts

Date: 2025-01-01

## Status

Superseded by ADR-014

## Context

Issue #16 requests an interactive incremental search mode for the CLI. This feature requires:

- Autocomplete prompt with real-time filtering
- Multiple selection capability
- Keyboard navigation
- Customizable display format

The project needs a terminal prompt library to implement this feature.

### Requirements

1. **Multiple selection + search**: Select multiple items while filtering
2. **ESM compatibility**: Project uses ESM modules
3. **TypeScript support**: Type definitions available
4. **Lightweight**: Minimal dependencies
5. **Customizable**: Control display format and behavior

## Decision

Use **Enquirer** (v2.4.x) for interactive prompts.

```bash
npm install enquirer
```

## Rationale

1. **Built-in multiple selection + autocomplete**: `AutoComplete` prompt supports `multiple: true` option, providing both features in a single prompt type
2. **Proven stability**: Used by eslint, webpack, yarn, pm2, Cypress, and other major projects
3. **Lightweight**: Only 2 dependencies (ansi-colors, strip-ansi)
4. **Customizable**: Extensible prompt system with hooks for custom rendering
5. **Sufficient for our needs**: Despite being less actively maintained, the feature set is complete for our requirements

## Consequences

### Positive

- Single prompt type handles search + multiple selection
- Simple API reduces implementation complexity
- Minimal bundle size impact
- Rich customization options

### Negative

- CJS module requires ESM interop (`import Enquirer from 'enquirer'`)
- Last updated July 2023; maintenance status uncertain
- TypeScript types are bundled but may be incomplete for advanced use cases
- May need workarounds for future Node.js compatibility issues

### Neutral

- Need to implement debounce manually (200ms)
- Display format customization requires extending prompt class
- Cache management for library data is our responsibility

## Alternatives Considered

### Option A: @inquirer/prompts

**Description**: Modern rewrite of Inquirer.js with standalone prompt packages

**Pros**:
- Native ESM module (`type: module`)
- Active development (updated December 2025)
- Full TypeScript support (written in TypeScript)
- Modern architecture with hooks-based customization

**Cons**:
- `@inquirer/search` is single-selection only
- No built-in autocomplete + multiple selection combination
- Would require custom prompt implementation (100-200 lines)

**Why rejected**: The core requirement (search + multiple selection) is not available out of the box. Custom implementation cost outweighs the benefits of active maintenance.

### Option B: node-fzf

**Description**: fzf-like fuzzy finder for Node.js

**Pros**:
- fzf-style user experience
- Fast fuzzy matching

**Cons**:
- Less customizable display format
- Heavier dependency tree
- Less widespread adoption

**Why rejected**: Our existing search logic should be reused; we need display customization more than fuzzy matching.

### Option C: Custom implementation using readline

**Description**: Build interactive prompt from scratch using Node.js readline

**Pros**:
- No external dependencies
- Full control over behavior
- Native ESM

**Cons**:
- Significant implementation effort (500+ lines)
- Need to handle terminal escape sequences
- Need to implement cursor management, color output, etc.

**Why rejected**: Implementation cost is too high for the benefit gained.

## Implementation Notes

### ESM Import

```typescript
// Works with ESM interop
import Enquirer from 'enquirer';

const prompt = new Enquirer.AutoComplete({
  name: 'refs',
  message: 'Search references',
  multiple: true,
  choices: [...],
  suggest: (input, choices) => filteredChoices,
});
```

### Type Definitions

Enquirer includes `index.d.ts`. For advanced customization, may need to augment types:

```typescript
declare module 'enquirer' {
  // Additional type declarations if needed
}
```

## References

- Enquirer GitHub: https://github.com/enquirer/enquirer
- Issue #16: Interactive incremental search feature request
- @inquirer/prompts: https://www.npmjs.com/package/@inquirer/prompts
- Feature spec: `spec/features/interactive-search.md`
