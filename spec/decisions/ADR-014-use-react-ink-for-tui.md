# ADR-014: Use React Ink for TUI Components

Date: 2025-01-26

## Status

Accepted (Supersedes ADR-012)

## Context

ADR-012 selected Enquirer for interactive prompts. However, after implementation and testing, several issues emerged:

### Issues with Enquirer

1. **Unfixed bugs**: Enquirer has known bugs that remain unaddressed due to inactive maintenance
2. **Last updated July 2023**: No recent maintenance activity, uncertain future compatibility
3. **CJS module**: Requires ESM interop workarounds
4. **Limited customization**: Complex display requirements (multi-line items, sorting, pagination) require significant workarounds

### Requirements (unchanged from ADR-012)

1. **Multiple selection + search**: Select multiple items while filtering
2. **ESM compatibility**: Project uses ESM modules
3. **TypeScript support**: Type definitions available
4. **Customizable**: Full control over display format and behavior
5. **Rich TUI**: Multi-line item display, sorting options, scroll indicators

## Decision

Replace Enquirer with **React Ink** (ink v6.x) and **ink-ui** for interactive TUI components.

```bash
npm install ink ink-ui react
npm install -D @types/react
```

## Rationale

1. **Declarative UI model**: React's component model makes complex UIs easier to build and maintain
2. **Active maintenance**: Ink is actively maintained with regular releases
3. **Native ESM**: Built for modern JavaScript with full ESM support
4. **Full customization**: Complete control over rendering via React components
5. **Rich ecosystem**: ink-ui provides additional components (Select, TextInput, etc.)
6. **Type safety**: Written in TypeScript with excellent type definitions
7. **Proven in CLI tools**: Used by Gatsby, Yarn, Terraform, Prisma, and others

## Consequences

### Positive

- No unfixed bugs from unmaintained library
- Declarative component model simplifies complex UI logic
- Easy to implement multi-line items, sorting, scroll indicators
- Better separation of concerns (UI components vs business logic)
- Familiar React patterns for component reuse
- Active community and maintenance

### Negative

- Larger dependency footprint (React + Ink + ink-ui)
- Learning curve for developers unfamiliar with React
- Bundle size increase (React ~45KB, Ink ~30KB minified)
- Need to create custom components for specific behaviors (SearchableMultiSelect)

### Neutral

- Different mental model (declarative vs imperative)
- Testing approach changes (React Testing Library patterns)

## Implementation Notes

### Custom Components

Created `SearchableMultiSelect` component combining search input with multi-select:

```typescript
// src/features/interactive-ink/components/SearchableMultiSelect.tsx
export interface Choice<T> {
  id: string;
  title: string;
  subtitle?: string;
  meta?: string;
  value: T;
}

export function SearchableMultiSelect<T>({
  choices,
  filterFn,
  onSubmit,
  onCancel,
}: SearchableMultiSelectProps<T>): React.ReactElement;
```

### Usage Pattern

```typescript
import { render } from "ink";
import { SearchableMultiSelect } from "./components/SearchableMultiSelect.js";

const { waitUntilExit } = render(
  <SearchableMultiSelect
    choices={choices}
    onSubmit={(selected) => handleSelection(selected)}
    onCancel={() => handleCancel()}
  />
);
await waitUntilExit();
```

### Dependencies

```json
{
  "dependencies": {
    "ink": "^6.6.0",
    "ink-ui": "^0.4.0",
    "react": "^19.2.3"
  },
  "devDependencies": {
    "@types/react": "^19.2.9"
  }
}
```

## Migration Plan

1. Keep existing Enquirer-based code in `src/features/interactive/` during transition
2. Develop new Ink-based components in `src/features/interactive-ink/`
3. Replace usages incrementally:
   - Interactive search (`search -t`)
   - ID selection fallback (cite, edit, remove without args)
   - Style selection prompt
4. Remove Enquirer dependency after full migration

## Alternatives Considered

### Option A: Keep Enquirer with workarounds

**Description**: Continue using Enquirer, work around bugs

**Pros**:
- No migration effort
- Smaller dependency footprint

**Cons**:
- Bugs may never be fixed
- Complex workarounds for multi-line display
- Technical debt accumulation

**Why rejected**: Maintenance burden outweighs migration cost

### Option B: @inquirer/prompts

**Description**: Use the modern Inquirer.js rewrite

**Pros**:
- Active development
- Native ESM
- TypeScript support

**Cons**:
- No built-in search + multiple selection
- Less flexible for custom display requirements

**Why rejected**: Same limitation as in ADR-012; still requires custom implementation

### Option C: blessed/blessed-contrib

**Description**: Full ncurses-like terminal UI library

**Pros**:
- Very powerful, full terminal control
- Widget library available

**Cons**:
- Much larger API surface
- Heavier learning curve
- Overkill for our needs

**Why rejected**: Too complex for the use case

## References

- Ink GitHub: https://github.com/vadimdemedes/ink
- ink-ui: https://github.com/vadimdemedes/ink-ui
- ADR-012: Previous decision using Enquirer
- Prototype: `src/features/interactive-ink/`
- Demo: `npm run demo:ink`
