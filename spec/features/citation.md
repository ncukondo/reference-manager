# Citation Generation

## Purpose

Generate formatted citations using CSL (Citation Style Language) styles.

## Syntax

```bash
reference-manager cite <id-or-uuid>...
```

## Options

```
--uuid              Treat arguments as UUIDs instead of IDs
--style <style>     CSL style name (default: from config or 'apa')
--csl-file <path>   Path to custom CSL file
--locale <locale>   Locale code (default: 'en-US')
--format <format>   Output format: text|html|rtf (default: text)
--in-text           Generate in-text citations instead of bibliography
```

## Built-in Styles

- `apa` (APA 7th edition) - **default**
- `vancouver`
- `harvard`

Custom styles via `--csl-file` or `csl_directory` configuration.

## Output Formats

| Format | Description |
|--------|-------------|
| `text` | Plain text (default) |
| `html` | HTML with CSL classes |
| `rtf` | Rich Text Format |

## Examples

**Bibliography (default):**
```bash
$ reference-manager cite smith2023
Smith, J., & Johnson, A. (2023). Title. Journal, 10(2), 123-145.
```

**In-text citation:**
```bash
$ reference-manager cite smith2023 --in-text
(Smith & Johnson, 2023)
```

**Multiple references:**
```bash
$ reference-manager cite smith2023 jones2024
```

**Custom style:**
```bash
$ reference-manager cite smith2023 --style vancouver
```

## Configuration

```toml
[citation]
default_style = "apa"
default_locale = "en-US"
default_format = "text"
csl_directory = ["~/.reference-manager/csl/"]
```

## Style Resolution Order

1. `--csl-file <path>` (exact file)
2. Built-in style matching `--style <name>`
3. Search in `csl_directory` paths
4. `default_style` from config
5. "apa" (hardcoded fallback)

## Fallback Format

When CSL processor fails, simplified format is used:

```
FirstAuthor [et al]. Journal. YYYY;vol(issue):pages. DOI/PMID. Title.
```

## Exit Codes

| Code | Meaning |
|------|---------|
| `0` | Success (including fallback) |
| `1` | Reference not found or invalid option |

## Dependencies

- `@citation-js/core`: CSL-JSON handling
- `@citation-js/plugin-csl`: CSL output (uses citeproc-js)
