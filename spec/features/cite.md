# Citation Generation (cite command)

## Overview

The `cite` command generates formatted citations from library references. By default, it outputs APA-style formatted citations. It also supports Pandoc citation keys and other formats.

## Core Principles

- **Default output**: APA-style bibliography format
- **CSL-based formatting**: Uses Citation Style Language (CSL) for accurate citation formatting
- **Pandoc integration**: Can generate Pandoc citation keys when needed
- **Flexible style resolution**: Supports both built-in style names and custom CSL files

## Command Syntax

```bash
reference-manager cite [options] <identifier...>
```

### Arguments

- `<identifier...>`: One or more citation keys or UUIDs

### Options

#### Output Format
```bash
--csl <style>           # CSL style name (default: "apa")
--csl-file <path>       # Path to custom CSL file
--format <format>       # Output format: csl|pandoc|bibtex|plain (default: csl)
```

#### Citation Mode (for CSL format)
```bash
--inline                # In-text citation mode (e.g., "(Smith, 2020)")
--bibliography          # Bibliography/reference list mode (default)
--both                  # Output both inline and bibliography formats
```

#### Inline Citation Style (for CSL format with --inline)
```bash
--narrative             # Narrative citation (e.g., "Smith (2020)" in APA)
```

#### Pandoc Citation Style (for --format pandoc)
```bash
--narrative             # Narrative citation: @Smith2020
--year-only             # Year-only citation: [-@Smith2020]
--prefix <text>         # Prefix text
--suffix <text>         # Suffix text
```

#### Identifier Type
```bash
--uuid                  # Interpret identifiers as UUIDs
```

#### Search-based Citation
```bash
--search <query>        # Search and cite matching reference
--interactive           # Interactive selection when multiple matches
```

#### Output Options
```bash
--json                  # Output in JSON format with metadata
--copy                  # Copy to clipboard
```

## Usage Examples

### Basic Usage (Default: APA Bibliography)

```bash
# Single reference
$ reference-manager cite Smith2020
Smith, J. (2020). Deep learning for medical imaging. Nature Medicine, 26(5), 123-456.

# Multiple references
$ reference-manager cite Smith2020 Jones2021
Smith, J. (2020). Deep learning for medical imaging. Nature Medicine, 26(5), 123-456.
Jones, A. (2021). Machine learning in healthcare. JAMA, 325(10), 987-1001.
```

### CSL Style Specification

```bash
# Use different CSL style by name
$ reference-manager cite --csl chicago Smith2020
Smith, John. 2020. "Deep Learning for Medical Imaging." Nature Medicine 26 (5): 123–456.

$ reference-manager cite --csl vancouver Smith2020
1. Smith J. Deep learning for medical imaging. Nature Medicine. 2020;26(5):123-456.

# Use custom CSL file
$ reference-manager cite --csl-file ./my-journal.csl Smith2020
```

### In-text Citations (CSL format)

```bash
# Parenthetical in-text citation
$ reference-manager cite --csl apa --inline Smith2020
(Smith, 2020)

$ reference-manager cite --csl apa --inline Smith2020 Jones2021
(Smith, 2020; Jones, 2021)

# Narrative in-text citation
$ reference-manager cite --csl apa --inline --narrative Smith2020
Smith (2020)

# Both formats
$ reference-manager cite --csl apa --both Smith2020
Inline: (Smith, 2020)
Bibliography: Smith, J. (2020). Deep learning for medical imaging. Nature Medicine, 26(5), 123-456.
```

### Pandoc Citation Keys

```bash
# Pandoc format (bracketed citation key)
$ reference-manager cite --format pandoc Smith2020
[@Smith2020]

$ reference-manager cite --format pandoc Smith2020 Jones2021
[@Smith2020; @Jones2021]

# Narrative citation (for use in text)
$ reference-manager cite --format pandoc --narrative Smith2020
@Smith2020

# Year-only citation (suppress author)
$ reference-manager cite --format pandoc --year-only Smith2020
[-@Smith2020]

# With prefix and suffix
$ reference-manager cite --format pandoc --prefix "see" --suffix "p. 42" Smith2020
[see @Smith2020, p. 42]
```

### Other Formats

```bash
# BibTeX format
$ reference-manager cite --format bibtex Smith2020
\cite{Smith2020}

$ reference-manager cite --format bibtex --narrative Smith2020
\citet{Smith2020}

# Plain text (citation key only)
$ reference-manager cite --format plain Smith2020
Smith2020
```

### Search and Cite

```bash
# Search and cite first match
$ reference-manager cite --search "deep learning"
Smith, J. (2020). Deep learning for medical imaging. Nature Medicine, 26(5), 123-456.

# Interactive selection
$ reference-manager cite --search "machine learning" --interactive
# Shows interactive list to select from multiple matches

# Search with specific format
$ reference-manager cite --search "neural networks" --format pandoc
[@Smith2020]
```

### UUID-based Citation

```bash
$ reference-manager cite --uuid abc123-def456-789ghi
Smith, J. (2020). Deep learning for medical imaging. Nature Medicine, 26(5), 123-456.
```

### JSON Output

```bash
$ reference-manager cite --json Smith2020
{
  "id": "Smith2020",
  "uuid": "abc123-def456-789ghi",
  "bibliography": "Smith, J. (2020). Deep learning for medical imaging. Nature Medicine, 26(5), 123-456.",
  "inline": "(Smith, 2020)",
  "inline_narrative": "Smith (2020)",
  "pandoc": "[@Smith2020]",
  "csl_style": "apa"
}
```

## CSL Style Resolution

When a CSL style is specified by name (e.g., `--csl apa`), the system searches for the corresponding `.csl` file in the following order:

1. **CSL styles directory** (configured in `config.toml`):
   ```
   ~/.reference-manager/csl-styles/<style-name>.csl
   ```
   Example: `~/.reference-manager/csl-styles/apa.csl`

2. **Built-in styles** (bundled with the application):
   - `apa` - APA 7th edition
   - `chicago` - Chicago Manual of Style (author-date)
   - `mla` - MLA 9th edition
   - `vancouver` - Vancouver
   - `harvard` - Harvard
   - `ieee` - IEEE
   - `nature` - Nature
   - `science` - Science
   - `ama` - AMA (American Medical Association)

If the style is not found, an error is returned.

When a CSL file path is specified with `--csl-file`, that file is used directly.

## Configuration

### Configuration File

```toml
[cite]
# Default CSL style name (default: "apa")
default_csl_style = "apa"

# Directory containing CSL style files (default: "~/.reference-manager/csl-styles/")
csl_styles_directory = "~/.reference-manager/csl-styles/"

# Default citation mode: "bibliography" | "inline" (default: "bibliography")
default_mode = "bibliography"

# Automatically copy to clipboard (default: false)
auto_copy = false
```

### Example Configuration

```toml
[cite]
default_csl_style = "nature"
csl_styles_directory = "~/Documents/csl-styles/"
default_mode = "bibliography"
auto_copy = true
```

## Output Behavior

### Standard Output (stdout)
- Formatted citation text

### Standard Error (stderr)
- Error messages
- Diagnostic information (when `--verbose` is set)

### Exit Codes
- `0`: Success
- `1`: Reference not found
- `2`: CSL style not found
- `3`: Invalid CSL file format
- `4`: Other errors

## Implementation Notes

### CSL Processing Engine
- Use `citeproc` package for CSL processing
- Support for locales (en-US, en-GB, etc.)

### CSL File Management
- CSL styles can be downloaded from:
  - [Zotero Style Repository](https://www.zotero.org/styles)
  - [Citation Style Language GitHub](https://github.com/citation-style-language/styles)
- Users can install custom CSL files to `csl_styles_directory`

### Multiple References
- When multiple identifiers are provided:
  - **Bibliography mode**: Output each reference on a separate line
  - **Inline mode**: Combine into single citation (e.g., "(Smith, 2020; Jones, 2021)")
  - **Pandoc mode**: Combine with semicolons (e.g., "[@Smith2020; @Jones2021]")

### Search Behavior
- Search uses the same search logic as the `search` command
- When multiple matches are found:
  - Without `--interactive`: Use first match
  - With `--interactive`: Show selection UI (if TTY available)

## Future Enhancements

Potential features for future versions:
- Citation clustering and sorting
- Locale specification (`--locale en-GB`)
- Citation item-specific options (locators, labels)
- Integration with clipboard managers
- Shell completion for CSL style names
