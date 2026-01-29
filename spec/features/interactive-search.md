# TUI Search

Interactive incremental search mode for CLI with real-time filtering.

## Purpose

Enable users to search references interactively with:
- Real-time feedback as they type
- Easier discovery of references
- Direct selection and action on results
- Multiple selection for batch operations

## Command Interface

```bash
ref search --tui [initial-query]
ref search -t [initial-query]
```

### Options

| Flag | Short | Description |
|------|-------|-------------|
| `--tui` | `-t` | Enable TUI (Terminal UI) search mode |

The optional `[initial-query]` pre-fills the search input.

### Examples

```bash
# Start TUI search
ref search -t

# Start with pre-filled query
ref search -t "machine learning"
ref search --tui "author:Smith"
```

## Behavior

### Search Input

- User types query in real-time
- Results update as user types (with 200ms debounce)
- Supports all existing query syntax (field prefixes, phrases, etc.)
- See `spec/features/search.md` for query syntax

### Results Display

Display format (detailed view):

```
? Search references: [user-input]
❯ [1] Smith, J., & Doe, A. (2020)
        Machine learning in medicine: A comprehensive review
        DOI: 10.1000/example | PMID: 12345678
  [2] Johnson, B. (2019)
        Deep learning approaches for medical imaging
        DOI: 10.1000/example2
  [ ] [3] Chen, L., et al. (2021)
        Neural networks in clinical practice
        PMCID: PMC1234567
```

**Display elements:**
- Checkbox state: `❯` (cursor), `◉` (selected), `◯` (unselected)
- Index number in brackets
- Authors (truncated if >3: "First, Second, et al.")
- Year in parentheses
- Title (truncated to fit terminal width)
- Identifiers: DOI, PMID, PMCID, ISBN (first available)

**Display limit:** 20 items (configurable)

### Navigation

| Key | Action |
|-----|--------|
| `↑` / `↓` | Move cursor |
| `Space` | Toggle selection |
| `a` | Select all visible |
| `i` | Invert selection |
| `Enter` | Open action menu |
| `Esc` / `Ctrl+C` | Cancel and exit |

### Action Menu

After pressing Enter with selection, the action menu is displayed. Available actions
vary based on the number of selected entries: single-entry selection shows additional
actions not available for multiple entries.

#### Single Entry Selected

```
? Action for 1 selected reference:
❯ Generate citation
  Generate citation (choose style)
  Open fulltext
  Manage attachments
  Edit reference
  Output (choose format)
  Remove
  Cancel
```

#### Multiple Entries Selected

```
? Action for 3 selected references:
❯ Generate citation
  Generate citation (choose style)
  Edit references
  Output (choose format)
  Remove
  Cancel
```

#### Output Format Submenu

When "Output (choose format)" is selected:

```
? Output format:
❯ IDs (citation keys)
  CSL-JSON
  BibTeX
  YAML
  Cancel
```

#### Action Categories

**Output actions** — generate text to `stdout`, then exit:

| Action | Output |
|--------|--------|
| Generate citation | Formatted citations using `config.citation.defaultStyle` |
| Generate citation (choose) | Prompt for style, then generate |
| Output IDs | Citation keys, one per line |
| Output CSL-JSON | JSON array of selected references |
| Output BibTeX | BibTeX entries |
| Output YAML | YAML formatted references |

**Side-effect actions** — perform an operation, then exit:

| Action | Behavior | Selection |
|--------|----------|-----------|
| Open fulltext | Open fulltext file in system viewer | Single only |
| Manage attachments | Open attachment directory, then sync | Single only |
| Edit reference(s) | Open editor with selected items | Single & multi |
| Remove | Delete with confirmation prompt | Single & multi |

**Other:**

| Action | Behavior |
|--------|----------|
| Cancel | Return to search screen |

#### Action Execution Flow

All actions exit the TUI after execution:

1. User selects action from menu
2. TUI exits (alternate screen restored)
3. Action is executed:
   - **Output actions**: result written to `stdout`
   - **Side-effect actions**: operation performed with output to `stderr`
4. Process terminates

### Output

- Output actions send result to `stdout`
- Side-effect actions send status messages to `stderr`
- Suitable for piping: `ref search -t | xargs ref cite`

## Technical Specifications

### Search Logic

Reuses existing search implementation:
- `tokenize()` from `src/features/search/tokenizer.ts`
- `search()` from `src/features/search/matcher.ts`
- `sortByRelevance()` from `src/features/search/sorter.ts`

No modifications to existing search logic required.

### Debounce

- 200ms delay before executing search
- Prevents excessive re-searches during typing
- Cancels pending search on new input

### Caching

- Cache `library.getAll()` results during TUI session
- Invalidate cache on session end
- No file system watching during TUI mode

### TTY Requirement

- **Requires TTY** for interactive prompts
- Non-TTY environment: Exit with error code 1

```bash
# Works
ref search -t

# Error: "TUI mode requires a TTY"
echo "query" | ref search -t
ref search -t > output.txt
```

## Configuration

### Config File

```toml
[cli.tui]
limit = 20              # Maximum displayed results
debounce_ms = 200       # Debounce delay in milliseconds
```

### Defaults

| Setting | Default | Description |
|---------|---------|-------------|
| `limit` | 20 | Maximum results displayed |
| `debounce_ms` | 200 | Search debounce delay |

## Error Handling

| Condition | Behavior |
|-----------|----------|
| Non-TTY environment | Error exit (code 1) |
| Empty library | Show message, allow input |
| No results | Show "No matches found" |
| Search error | Display error, continue session |

## Future Extensions

Not in current scope, may be added later:

- **Buffer mode**: Accumulate selections across multiple searches
- **Preview pane**: Show full reference details
- **Configurable default action**: Skip action menu
- **Custom display format**: Configure which fields to show
- **Keyboard shortcuts**: Direct actions without menu (e.g., `c` for cite)
- **Clipboard auto-copy**: Automatically copy output to clipboard (controlled by config setting)
- **Open specific attachment**: Open a specific attached file (not just directory)

## Dependencies

- **React Ink**: Declarative terminal UI framework
- **ink-ui**: Component library for Ink
- See `spec/decisions/ADR-014-use-react-ink-for-tui.md`

## Related

- `spec/features/search.md` - Search query syntax
- `spec/features/pagination.md` - Sorting and limits
- `spec/architecture/cli.md` - CLI commands
