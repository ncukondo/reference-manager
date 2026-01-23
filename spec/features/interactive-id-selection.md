# Interactive ID Selection

Fallback to interactive search when commands requiring ID are invoked without arguments in TTY environment.

## Purpose

Enable users to interactively select references when they invoke commands without specifying IDs:
- Reduce friction for common operations (cite, edit, remove, etc.)
- Leverage existing interactive search infrastructure
- Provide consistent UX across commands

## Supported Commands

### Multiple Selection Commands

| Command | Current Argument | Interactive Behavior |
|---------|------------------|---------------------|
| `cite` | `<id-or-uuid...>` required | Multi-select → citation output |
| `edit` | `<identifier...>` required | Multi-select → open in editor |
| `remove` | ID specification required | Multi-select → delete confirmation |

### Single Selection Commands

| Command | Current Argument | Interactive Behavior |
|---------|------------------|---------------------|
| `update` | `<identifier>` required | Single-select → update flow |
| `fulltext attach` | `<identifier>` required | Single-select → attach flow |
| `fulltext get` | `<identifier>` required | Single-select → get path |
| `fulltext detach` | `<identifier>` required | Single-select → detach flow |
| `fulltext open` | `[identifier]` optional | Single-select → open file |

## Behavior

### Invocation Without ID

```bash
# TTY environment: Opens interactive search
ref cite
ref edit
ref remove
ref fulltext open

# Non-TTY environment: Error (unchanged behavior)
echo "" | ref cite  # Error: No identifier provided
```

### Flow

1. User invokes command without ID (e.g., `ref cite`)
2. System checks for TTY environment
3. If TTY: Launch interactive search prompt
4. User searches and selects reference(s)
5. Command-specific action executes:
   - `cite`: Style selection (if not specified) → citation output
   - `edit`: Open selected references in editor
   - `remove`: Confirmation → delete
   - `update`: Continue to update flow
   - `fulltext *`: Continue to respective subcommand flow

### Style Selection for Cite

When `cite` is invoked without `--style` option:

```
? Select citation style:
❯ apa (default)
  vancouver
  harvard
  [custom styles from csl_directory...]
```

**Style sources:**
- Built-in styles: `apa`, `vancouver`, `harvard`
- Custom styles: Files from `citation.csl_directory` config
- Default style marked with `(default)` and shown first

### Selection Modes

| Mode | Behavior | Used By |
|------|----------|---------|
| Multi-select | Space to toggle, Enter to confirm | cite, edit, remove |
| Single-select | Enter to select directly | update, fulltext subcommands |

## Technical Specifications

### TTY Detection

Reuses existing TTY detection:
- `isTTY()` from `src/cli/helpers.ts`
- `checkTTY()` from `src/features/interactive/tty.ts`

### Shared Components

Create reusable utilities in `src/features/interactive/`:

```typescript
// reference-select.ts
interface SelectOptions {
  multiSelect: boolean;
  prompt?: string;
}

interface SelectResult {
  selected: CslItem[];
  cancelled: boolean;
}

function runReferenceSelect(
  options: SelectOptions,
  config: InteractiveConfig
): Promise<SelectResult>;
```

```typescript
// style-select.ts
interface StyleSelectOptions {
  cslDirectory?: string;
  defaultStyle?: string;
}

interface StyleSelectResult {
  style: string;
  cancelled: boolean;
}

function runStyleSelect(
  options: StyleSelectOptions
): Promise<StyleSelectResult>;
```

### Style Discovery

For style selection prompt:

1. List built-in styles: `BUILTIN_STYLES` from `src/config/csl-styles.ts`
2. List custom styles: Glob `*.csl` files from `citation.csl_directory`
3. Extract style names from filenames (without `.csl` extension)
4. Sort with default style first

## Configuration

Uses existing config:

```toml
[cli.tui]
limit = 20              # Maximum displayed results
debounce_ms = 200       # Debounce delay

[citation]
default_style = "apa"   # Default citation style
csl_directory = "~/.local/share/ref/styles"  # Custom CSL files
```

## Error Handling

| Condition | Behavior |
|-----------|----------|
| Non-TTY without ID | Error: "Identifier is required" (existing behavior) |
| User cancels selection | Exit with code 0, no output |
| Empty library | Show message: "No references in library" |
| No selection made | Exit with code 0, no output |

## CLI Changes

### Argument Changes

| Command | Before | After |
|---------|--------|-------|
| `cite` | `<id-or-uuid...>` | `[id-or-uuid...]` |
| `edit` | `<identifier...>` | `[identifier...]` |
| `remove` | (varies) | Support optional ID |
| `update` | `<identifier>` | `[identifier]` |
| `fulltext attach` | `<identifier>` | `[identifier]` |
| `fulltext get` | `<identifier>` | `[identifier]` |
| `fulltext detach` | `<identifier>` | `[identifier]` |

Note: `fulltext open` already accepts optional `[identifier]`.

## Dependencies

- **Enquirer**: For interactive prompts (already used by interactive search)
- Existing interactive search components

## Related

- `spec/features/interactive-search.md` - Interactive search mode
- `spec/features/citation.md` - Citation generation
- `spec/architecture/cli.md` - CLI commands
