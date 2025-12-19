# Citation Generation

## Purpose

Generate formatted citations for references using CSL (Citation Style Language) styles. The cite command produces properly formatted citations for use in academic writing and publications.

## Command Syntax

```bash
reference-manager cite <id-or-uuid>...
```

## Options

```
Options:
  --uuid                    Treat arguments as UUIDs instead of IDs
  --style <style>           CSL style name (default: from config or 'apa')
  --csl-file <path>         Path to custom CSL file (overrides --style)
  --locale <locale>         Locale code (default: 'en-US')
  --format <format>         Output format: text|html|rtf (default: text)
  --in-text                 Generate in-text citations instead of bibliography entries
```

## Behavior

### Normal Cases

**Single ID (default bibliography format):**

Input:
```bash
reference-manager cite smith2023
```

Output:
```
Smith, J., & Johnson, A. (2023). Title of the article. Journal Name, 10(2), 123-145. https://doi.org/10.1234/example
```

**Multiple IDs (combined citation):**

Input:
```bash
reference-manager cite smith2023 jones2024
```

Output (bibliography format):
```
Jones, B. (2024). Another article. Science, 15(3), 200-210. https://doi.org/10.1234/another

Smith, J., & Johnson, A. (2023). Title of the article. Journal Name, 10(2), 123-145. https://doi.org/10.1234/example
```

**In-text citation:**

Input:
```bash
reference-manager cite smith2023 --in-text
```

Output:
```
(Smith & Johnson, 2023)
```

**Multiple IDs with in-text:**

Input:
```bash
reference-manager cite smith2023 jones2024 --in-text
```

Output:
```
(Jones, 2024; Smith & Johnson, 2023)
```

**Custom style:**

Input:
```bash
reference-manager cite smith2023 --style vancouver
```

Output:
```
1. Smith J, Johnson A. Title of the article. Journal Name. 2023;10(2):123-145.
```

**UUID lookup:**

Input:
```bash
reference-manager cite abc123-def456-... --uuid
```

Output: Same format as ID lookup

**HTML output:**

Input:
```bash
reference-manager cite smith2023 --format html
```

Output:
```html
<div class="csl-entry">Smith, J., &amp; Johnson, A. (2023). Title of the article. <i>Journal Name</i>, <i>10</i>(2), 123-145. https://doi.org/10.1234/example</div>
```

### Edge Cases

**ID not found:**
```bash
$ reference-manager cite nonexistent
Error: Reference 'nonexistent' not found
```

Exit code: 1

**UUID not found:**
```bash
$ reference-manager cite abc123 --uuid
Error: Reference with UUID 'abc123' not found
```

Exit code: 1

**Mixed found/not found:**
```bash
$ reference-manager cite smith2023 nonexistent
Error: Reference 'nonexistent' not found
```

Exit code: 1
Behavior: Fail early, do not output partial results

**Invalid CSL style:**
```bash
$ reference-manager cite smith2023 --style invalid
Warning: CSL style 'invalid' not found, falling back to simplified format
[fallback output]
```

Exit code: 0 (success with fallback)

**CSL file not found:**
```bash
$ reference-manager cite smith2023 --csl-file ./missing.csl
Error: CSL file './missing.csl' not found
```

Exit code: 1

**Empty library:**
```bash
$ reference-manager cite smith2023
Error: Reference 'smith2023' not found
```

Exit code: 1

### Error Cases

**CSL processor initialization failure:**
- Fall back to simplified format
- Log warning to stderr
- Continue execution

**CSL processing error for specific item:**
- Fall back to simplified format for that item only
- Log warning to stderr
- Continue with other items

**Invalid format option:**
```bash
$ reference-manager cite smith2023 --format invalid
Error: Invalid format 'invalid'. Must be one of: text, html, rtf
```

Exit code: 1

## Implementation Strategy

### CSL Processor Selection

**Primary: @citation-js/core + @citation-js/plugin-csl**

Rationale:
1. Native CSL-JSON support (our data format)
2. Built on citeproc-js (industry standard, used by Zotero/Mendeley)
3. Modular design with plugin system
4. Active maintenance (latest: 0.7.21)
5. Comprehensive CSL style support

Installation:
```bash
npm install @citation-js/core @citation-js/plugin-csl
```

### Fallback Format (Simplified)

When CSL processor is unavailable or fails, use simplified AMA-like format:

**Bibliography format:**
```
FirstAuthor [et al]. JournalAbbrev. YYYY;volume(issue):pages. PMID:12345678 [or DOI:10.1234/example]. Title of the article.
```

Example:
```
Smith J et al. J Name. 2023;10(2):123-145. DOI:10.1234/example. Title of the article.
```

**In-text format:**
```
(FirstAuthor et al, YYYY)
```

Example:
```
(Smith et al, 2023)
```

**Fallback algorithm:**

1. First author: `family` name + `given` initial (first letter)
2. Multiple authors: append "et al"
3. Journal abbreviation: use `container-title-short` if available, otherwise `container-title`
4. Year: from `issued.date-parts[0][0]`
5. Volume/issue/pages: `volume(issue):pages`
6. Identifier (priority order):
   - PMID if available: `PMID:xxxxx`
   - DOI if available: `DOI:xxxxx`
   - URL if available: URL
7. Title: full title from `title` field

## Configuration

### Config File (config.toml)

```toml
[citation]
# Default CSL style (default: "apa")
default_style = "apa"

# CSL styles directories for custom styles (default: ["~/.reference-manager/csl/"])
# Array of directory paths searched in order from first to last
csl_directory = ["~/.reference-manager/csl/", "/usr/share/csl-styles/"]

# Default locale (default: "en-US")
default_locale = "en-US"

# Default output format: text|html|rtf (default: "text")
default_format = "text"
```

**Note on `csl_directory`:**
- Can be a single string or an array of strings
- When array, directories are searched in order from first to last
- First matching style file is used
- Example single directory: `csl_directory = "~/.reference-manager/csl/"`
- Example multiple directories: `csl_directory = ["~/.reference-manager/csl/", "/usr/share/csl-styles/"]`

### Priority Order

1. Command-line options (highest)
2. Config file settings
3. Built-in defaults (lowest)

Examples:
- `--style chicago` overrides `default_style` in config
- `--locale ja-JP` overrides `default_locale` in config
- No `--style` specified → use `default_style` from config or "apa"

## Data Flow

```
1. Parse arguments (IDs/UUIDs)
   ↓
2. Load library and resolve references
   ↓
3. Check: CSL processor available?
   ├─ Yes → 4a. Initialize @citation-js/core
   │         ↓
   │        5a. Load CSL style (from --csl-file, --style, or config)
   │         ↓
   │        6a. Generate formatted output (bibliography or in-text)
   │         ↓
   │        7a. Output to stdout
   │
   └─ No → 4b. Use fallback formatter
            ↓
           5b. Generate simplified format
            ↓
           6b. Output to stdout
```

## CSL Style Management

### Built-in Styles

Package should include commonly used styles:
- `apa` (APA 7th edition) - **default**
- `chicago` (Chicago Manual of Style)
- `vancouver` (Vancouver system)
- `harvard` (Harvard referencing)
- `mla` (MLA 9th edition)
- `ama` (American Medical Association)

### Custom Styles

Users can:
1. Specify custom CSL file via `--csl-file <path>`
2. Place CSL files in directories listed in `csl_directory` (from config)
3. Reference by name via `--style <name>` (searches in `csl_directory` paths)

Style resolution order:
1. `--csl-file <path>` (exact file path)
2. Built-in style matching `--style <name>`
3. Search in `csl_directory` paths (in array order):
   - For each directory in `csl_directory`:
     - Check `<directory>/<name>.csl`
     - If found, use it
     - Otherwise, continue to next directory
4. Default style from config (`default_style`)
5. "apa" (hardcoded default)

**Example style search with multiple directories:**

Config:
```toml
csl_directory = ["~/.reference-manager/csl/", "/usr/share/csl-styles/"]
```

Command:
```bash
reference-manager cite smith2023 --style nature
```

Search order:
1. Built-in "nature" style (if exists)
2. `~/.reference-manager/csl/nature.csl`
3. `/usr/share/csl-styles/nature.csl`
4. If not found → error or fallback

## Output Formats

### Text Format (default)

Plain text output, suitable for terminal display and text files.

```
Smith, J., & Johnson, A. (2023). Title of the article. Journal Name, 10(2), 123-145.
```

### HTML Format

HTML markup with CSL-standard classes for styling.

```html
<div class="csl-entry">Smith, J., &amp; Johnson, A. (2023). Title of the article. <i>Journal Name</i>, <i>10</i>(2), 123-145.</div>
```

### RTF Format

Rich Text Format for word processors.

```rtf
{\rtf1\ansi
Smith, J., & Johnson, A. (2023). Title of the article. {\i Journal Name}, {\i 10}(2), 123-145.
}
```

## Testing Requirements

### Unit Tests

1. CSL processor integration
   - Load CSL styles
   - Generate bibliography format
   - Generate in-text format
   - Multiple items handling

2. Fallback formatter
   - Single author
   - Multiple authors (et al)
   - With PMID
   - With DOI
   - With URL only
   - Missing fields handling

3. ID/UUID resolution
   - Single ID
   - Multiple IDs
   - UUID lookup
   - Not found handling

4. Configuration
   - Default style from config
   - Command-line override
   - Custom CSL file
   - Invalid options
   - Multiple csl_directory paths
   - csl_directory search order

### Integration Tests

1. End-to-end citation generation
2. Error handling and fallback
3. Multiple output formats
4. Combined with search/list commands

## Performance Considerations

- CSL processor initialization: Cache for repeated calls (future server mode)
- Style loading: Cache loaded styles
- Library loading: Reuse existing library loader

## Future Extensions

### Phase 2 (Post-MVP)

- `--clipboard`: Copy to clipboard instead of stdout
- `--cite-key`: Generate citation with cite key for Pandoc
- `--numbered`: Numbered citation style
- `--sort <field>`: Custom sort order for bibliography
- `--group-by <field>`: Group bibliography entries (e.g., by year)

### Phase 3 (Advanced)

- Interactive style selection
- Citation preview in server mode
- Batch citation generation from file
- Integration with text editors (LSP)

## Non-goals

- Bibliography file management (separate from library)
- Citation insertion into documents (use Pandoc or word processor plugins)
- Style editing or customization (use CSL editor)
- Reference deduplication in citations (handled by CSL processor)
- Citation key generation (use existing `id` field)

## Dependencies

### Required

- `@citation-js/core`: CSL-JSON handling and core functionality
- `@citation-js/plugin-csl`: CSL output generation (uses citeproc-js internally)

### Optional

- CSL style files: Can be bundled or downloaded on-demand

## Migration Notes

This is a new feature, no migration required.

## Related Specifications

- `spec/core/data-model.md`: CSL-JSON structure and `id` field usage
- `spec/architecture/cli.md`: CLI framework and output handling
- `spec/guidelines/pandoc.md`: Pandoc compatibility (id as citation key)
