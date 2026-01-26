# ADR-015: React Ink Single App Pattern

Date: 2026-01-26

## Status

Accepted

## Context

After adopting React Ink for TUI components (ADR-014), we encountered screen clearing issues when transitioning between interactive screens. The initial implementation called `render()` multiple times within a single flow (e.g., search prompt → action menu), causing the previous screen to remain visible.

This approach was modeled after the procedural pattern used by Enquirer, where each prompt is an independent function call. However, React Ink is a React-based framework and should follow React's declarative patterns.

## Decision

Adopt the "Single App Pattern" for React Ink implementations:

### Principle: 1 Flow = 1 App = 1 render()

Each interactive command flow should have exactly one App component that manages all state transitions internally using React's `useState`.

### Architecture

```
src/features/interactive/
├── components/           # Reusable base components
│   ├── SearchableMultiSelect.tsx
│   ├── Select.tsx
│   └── ...
├── apps/                 # Flow-specific App components
│   ├── SearchFlowApp.tsx    # search -t: search → action
│   ├── CiteFlowApp.tsx      # cite: reference select → style select
│   └── ...
└── index.ts              # Public API
```

### Implementation Pattern

```tsx
// apps/SearchFlowApp.tsx
type FlowState = "search" | "action";

function SearchFlowApp({ references, onComplete, onCancel }) {
  const { exit } = useApp();
  const [state, setState] = useState<FlowState>("search");
  const [selected, setSelected] = useState<CslItem[]>([]);

  if (state === "search") {
    return (
      <SearchableMultiSelect
        choices={...}
        onSubmit={(items) => {
          setSelected(items);
          setState("action");
        }}
        onCancel={() => {
          exit();
          onCancel();
        }}
      />
    );
  }

  return (
    <ActionMenu
      items={selected}
      onComplete={(result) => {
        exit();
        onComplete(result);
      }}
    />
  );
}
```

### Runner Function

```typescript
// One render() call per flow
export async function runSearchFlow(references: CslItem[]): Promise<Result> {
  return new Promise((resolve) => {
    const { waitUntilExit } = render(
      createElement(SearchFlowApp, {
        references,
        onComplete: resolve,
        onCancel: () => resolve({ cancelled: true }),
      })
    );
    waitUntilExit();
  });
}
```

## Rationale

1. **React's design philosophy**: React is declarative; state changes trigger re-renders, not new app instances
2. **Ink's `render()` intent**: Creates a new Ink application instance; multiple calls create independent apps
3. **Screen management**: Single App allows React to handle transitions cleanly without manual screen clearing
4. **State consistency**: Shared state between screens (e.g., selected items) is naturally managed
5. **Web React analogy**: Like web React where App is single and routing handles page transitions

## Consequences

### Positive

- Clean screen transitions without manual clearing
- Simpler state sharing between screens
- Follows React best practices
- Easier to test (single component tree)

### Negative

- Requires refactoring existing multi-render implementations
- Flow-specific App components add some boilerplate

### Neutral

- Base components (SearchableMultiSelect, Select) remain reusable
- Each command still has independent lifecycle (CLI model preserved)

## Alternatives Considered

### Option A: Manual Screen Clearing

**Description**: Keep multiple `render()` calls and manually clear screen between them using ANSI escape sequences or Ink's `clear()`.

**Pros**:
- Minimal code changes
- Keep existing architecture

**Cons**:
- Fighting against React/Ink design
- Unreliable clearing behavior
- Complex cleanup logic

**Why rejected**: Works against the framework rather than with it

### Option B: Completely Single App for All Commands

**Description**: One global App with routing for all interactive commands.

**Pros**:
- Maximum code reuse
- Single render() ever

**Cons**:
- All command dependencies loaded always
- Unnecessary complexity for CLI's execute-and-exit model
- Over-engineering for the use case

**Why rejected**: CLI commands are independent processes; no need for SPA-like architecture

## References

- ADR-014: Use React Ink for TUI
- Ink documentation: https://github.com/vadimdemedes/ink
- React state management: https://react.dev/learn/managing-state
