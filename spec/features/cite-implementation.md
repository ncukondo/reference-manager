# Citation Generation - Implementation Specification

## Implementation Decisions

This document records the key implementation decisions for the `cite` command.

### 1. CSL Processing Library

**Decision**: Use `@citation-js/core` + `@citation-js/plugin-csl`

**Rationale**:
- Actively maintained
- Good TypeScript support
- Comprehensive CSL support
- Widely used in the JavaScript ecosystem

**Dependencies**:
```json
{
  "dependencies": {
    "@citation-js/core": "^0.7.0",
    "@citation-js/plugin-csl": "^0.7.0"
  }
}
```

### 2. Built-in CSL Styles

**Decision**: Download on first use and save to top CSL directory candidate

**Behavior**:
1. When a style name is requested (e.g., `--csl apa`):
   - Search in configured CSL directories (see §3)
   - If not found, download from official CSL repository
   - Save to the first writable CSL directory
2. Built-in style names:
   - `apa` - APA 7th edition
   - `chicago` - Chicago Manual of Style (author-date)
   - `mla` - MLA 9th edition
   - `vancouver` - Vancouver
   - `harvard` - Harvard
   - `ieee` - IEEE
   - `nature` - Nature
   - `science` - Science
   - `ama` - AMA

**Download Source**:
- Official CSL repository: https://github.com/citation-style-language/styles
- URL pattern: `https://raw.githubusercontent.com/citation-style-language/styles/master/{style-name}.csl`

**Error Handling**:
- Network errors: Report clear error message
- Invalid style name: Suggest available styles
- Save failures: Fall back to next writable directory

### 3. CSL Directory Search Order

**Decision**: Multi-level search with environment variable support

**Search Priority** (highest to lowest):
1. **Project-local**: `.reference-manager/csl/` (relative to current directory)
2. **Environment variable**: `REFERENCE_MANAGER_CSL_PATH` (colon-separated paths)
3. **User directory**: `~/.reference-manager/csl/` (configurable via `config.toml`)

**Example**:
```bash
# Project-local takes precedence
./reference-manager/csl/apa.csl

# Environment variable (colon-separated)
export REFERENCE_MANAGER_CSL_PATH="/path/to/project/csl:/path/to/shared/csl"

# User directory (default)
~/.reference-manager/csl/apa.csl
```

**Configuration**:
```toml
[cite]
# User CSL directory (default: "~/.reference-manager/csl/")
csl_directory = "~/.reference-manager/csl/"
```

**Note**: Changed from `csl_styles_directory` to `csl_directory` for brevity.

### 4. Locale Support

**Initial Implementation**: en-US only

**Future Expansion**: en-GB, ja-JP

**Locale File Handling**:
- Download locale files on demand (similar to CSL styles)
- Save to same CSL directory structure:
  ```
  ~/.reference-manager/csl/
    ├── locales/
    │   ├── locales-en-US.xml
    │   ├── locales-en-GB.xml
    │   └── locales-ja-JP.xml
    └── apa.csl
  ```

**Future Option**:
```bash
reference-manager cite --csl apa --locale en-GB Smith2020
```

### 5. Interactive Selection UI

**Library**: `inquirer`

**Display Format**:
```bash
$ reference-manager cite --search "machine learning" --interactive

Found 5 matches:
  1. [Smith2020] Smith, J. (2020). Machine learning in healthcare
  2. [Jones2021] Jones, A. (2021). Deep machine learning
  3. [Brown2019] Brown, K. (2019). Introduction to ML
  4. [Wilson2022] Wilson, M. (2022). Advanced machine learning
  5. [Taylor2018] Taylor, R. (2018). ML fundamentals

Select reference (1-5, or 0 to cancel):
```

**Display Information**:
- Citation key in brackets
- First author (family name, initials)
- Year
- Title (truncated if > 60 characters)

**Dependencies**:
```json
{
  "dependencies": {
    "inquirer": "^9.0.0"
  }
}
```

### 6. Clipboard Support

**Library**: `clipboardy`

**Behavior**:
- `--copy` option: Copy output to clipboard
- `auto_copy = true` config: Automatically copy all output

**Error Handling**:
- Clipboard unavailable: Show warning but continue
- No TTY: Disable clipboard features

**Dependencies**:
```json
{
  "dependencies": {
    "clipboardy": "^4.0.0"
  }
}
```

### 7. Multiple References Output Format

**Decision**: Follow CSL style; fallback to newline-separated without numbering

**Bibliography Mode**:
```bash
$ reference-manager cite Smith2020 Jones2021

# Output (newline-separated, no numbering):
Smith, J. (2020). Deep learning for medical imaging. Nature Medicine, 26(5), 123-456.
Jones, A. (2021). Machine learning in healthcare. JAMA, 325(10), 987-1001.
```

**Inline Mode**:
```bash
$ reference-manager cite --csl apa --inline Smith2020 Jones2021

# Output (CSL style determines format):
(Smith, 2020; Jones, 2021)
```

**Pandoc Mode**:
```bash
$ reference-manager cite --format pandoc Smith2020 Jones2021

# Output:
[@Smith2020; @Jones2021]
```

### 8. Narrative Citation with Multiple References

**Decision**: Follow CSL style specification

**Behavior**: Determined by CSL style rules for narrative/author-only citations

**Example** (APA style):
```bash
$ reference-manager cite --csl apa --inline --narrative Smith2020 Jones2021

# Output (depends on CSL style implementation):
Smith (2020) and Jones (2021)
# or
Smith and Jones (2020, 2021)  # if same year and context allows
```

**Note**: The exact output is determined by the CSL processor and style definition.

### 9. JSON Output Format

**Decision**: Minimal format with id, uuid, and pandoc

```json
{
  "id": "Smith2020",
  "uuid": "abc123-def456-789ghi",
  "pandoc": "[@Smith2020]"
}
```

**Rationale**:
- Simpler, faster output
- Other formats can be obtained by separate calls if needed
- Reduces processing overhead

**Multiple References**:
```json
[
  {
    "id": "Smith2020",
    "uuid": "abc123-...",
    "pandoc": "[@Smith2020]"
  },
  {
    "id": "Jones2021",
    "uuid": "def456-...",
    "pandoc": "[@Jones2021]"
  }
]
```

### 10. Server Mode Integration

**Decision**: Hybrid approach

**Behavior**:
1. **Data Retrieval**:
   - Use server API if available (performance benefit for large libraries)
   - Fall back to direct file access if server not running

2. **CSL Processing**:
   - Always performed on CLI side
   - Ensures consistent output regardless of server state

**Rationale**:
- CSL processing is relatively lightweight
- Avoids adding CSL dependencies to server
- Maintains separation of concerns

**Implementation**:
```typescript
// Pseudo-code
const server = await getServerConnection(config.library, config);
let items: CslItem[];

if (server) {
  const client = new ServerClient(server.baseUrl);
  items = await client.getAll(); // or client.getById()
} else {
  const library = await Library.load(config.library);
  items = library.getAll().map(ref => ref.getItem());
}

// CSL processing always on CLI side
const formatted = await formatCitation(items, cslStyle);
```

### 11. Configuration File Updates

**New Configuration Section**:
```toml
[cite]
# Default CSL style name (default: "apa")
default_csl_style = "apa"

# User CSL directory (default: "~/.reference-manager/csl/")
csl_directory = "~/.reference-manager/csl/"

# Default citation mode: "bibliography" | "inline" (default: "bibliography")
default_mode = "bibliography"

# Automatically copy to clipboard (default: false)
auto_copy = false

# Default locale (default: "en-US")
default_locale = "en-US"
```

## Testing Strategy

### Unit Tests
- CSL directory resolution
- Style name resolution
- Format conversion logic
- JSON output formatting

### Integration Tests
- CLI command execution
- CSL processing with real styles
- Server/direct mode switching
- Error handling

### E2E Tests
- Complete workflows with real library
- Multiple styles and formats
- Interactive mode (if testable)

## Performance Considerations

### Caching Strategy
1. **CSL Processor Instance**: Reuse for multiple citations
2. **Style Files**: Load once per execution
3. **Locale Files**: Load once per execution
4. **Library Data**: Fetch once, filter in memory

### Expected Performance
- Single citation: < 100ms (after first style download)
- Multiple citations: < 200ms for 10 references
- First-time style download: 1-3 seconds (network dependent)

## Migration Notes

### Configuration Migration
- Old: `csl_styles_directory`
- New: `csl_directory`
- Migration: Automatic fallback for backward compatibility

### Directory Migration
- Old: `~/.reference-manager/csl-styles/`
- New: `~/.reference-manager/csl/`
- Migration: Check both locations during transition period
