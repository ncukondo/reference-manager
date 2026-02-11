# Resource Indicators

## Purpose

Show text-based indicators in reference lists to indicate the presence of fulltext files, attachments, URLs, and tags. Provides at-a-glance visibility of what resources are available for each reference, styled to blend with surrounding dim text.

## Overview

When displaying reference lists (pretty format and TUI interactive mode), text indicators are shown to indicate which resources exist for each reference. This helps users quickly identify references with downloadable content, attached files, or tagged metadata.

## Indicator Labels

| Label | Resource | Condition |
|-------|----------|-----------|
| `pdf` | Fulltext PDF | `custom.attachments.files` contains `role: "fulltext"` with `.pdf` extension |
| `md` | Fulltext Markdown | `custom.attachments.files` contains `role: "fulltext"` with `.md`/`.markdown` extension |
| `file` | Other attachments | `custom.attachments.files` contains files with roles other than `fulltext` |
| `url` | URL | `URL` field is present and non-empty |
| `tag` | Tags | `custom.tags` array is present and has at least one entry |

### Display Rules

- Only present resources are shown (no placeholders for absent resources)
- Labels are separated by spaces: `pdf file url tag`
- Uses default terminal color (no additional coloring); responds to `dimColor` styling
- Order is fixed as listed above (fulltext PDF, fulltext MD, attachments, URL, tags)

## Meta Line Source Display

The meta line in TUI shows a source name instead of the item type, with the following fallback order:

1. `container-title-short` — abbreviated journal/container name (e.g., `J Med Inform`)
2. `container-title` — full journal/container name (e.g., `Journal of Medical Informatics`)
3. Type-specific fallback:
   - `book` → `publisher` (e.g., `Cambridge University Press`)
   - All others → formatted type name (e.g., `Thesis`, `Report`, `Web page`)

## Display Locations

### Pretty Format

Indicators appear as the **last line** of each reference entry, indented to match other fields:

```
[smith2024] Title of the paper
  Authors: Smith, J.; Doe, A.
  Year: 2024
  Type: journal-article
  DOI: 10.xxxx/xxxxx
  URL: https://example.com
  UUID: 123e4567-e89b-12d3-a456-426614174000
  pdf file url tag
```

When no indicators are present, the line is omitted entirely (no empty line added).

### TUI Interactive Mode

Indicators appear as a **prefix on the meta line** (3rd line of each choice), separated from the rest by `·`:

```
❯ ◉ Title of the paper
      Smith, J.; Doe, A.
      pdf file url tag · 2024 · J Med Inform · DOI: 10.xxxx
```

When no indicators are present, the meta line remains unchanged (no extra space prefix).

## Implementation

### Shared Function: `buildResourceIndicators`

A single function builds the indicator string for both display modes:

```typescript
function buildResourceIndicators(item: CslItem): string
```

- Input: A CSL-JSON item
- Output: Space-separated label string (e.g., `"pdf file url tag"`) or empty string if no indicators
- Location: `src/features/format/resource-indicators.ts`

### Shared Function: `formatSource`

Returns the source name for the meta line:

```typescript
function formatSource(item: CslItem): string
```

- Input: A CSL-JSON item
- Output: Source name with type-specific fallback
- Location: `src/features/interactive/choice-builder.ts`

### Shared Module: `choice-builder.ts`

`src/features/interactive/choice-builder.ts` contains the unified `toChoice` function and helper functions used by both `runSearchFlow.ts` and `search-prompt.ts`:

- `toChoice(item: CslItem): Choice<CslItem>` — builds Choice object with indicators and source name
- `formatSource(item: CslItem): string` — source name with fallback
- `extractYear`, `extractUpdatedDate`, `extractCreatedDate`, `extractPublishedDate` — date extractors
- `formatIdentifiers` — DOI/PMID/ISBN formatter

### Detection Logic

Reuse existing utilities:

| Resource | Detection |
|----------|-----------|
| Fulltext PDF/Markdown | `findFulltextFiles()` from fulltext-adapter |
| Other attachments | `custom.attachments.files` filtered by `role !== "fulltext"` |
| URL | `item.URL` truthiness check |
| Tags | `item.custom?.tags?.length > 0` |

### Integration Points

| Location | File | Usage |
|----------|------|-------|
| Pretty formatter | `src/features/format/pretty.ts` | Append indicator line in `formatSingleReference()` |
| TUI choice builder | `src/features/interactive/choice-builder.ts` | Prepend indicators to `meta` in `toChoice()` |
| TUI search flow | `src/features/interactive/apps/runSearchFlow.ts` | Imports `toChoice` from `choice-builder.ts` |
| TUI search prompt | `src/features/interactive/search-prompt.ts` | Imports `toChoice` from `choice-builder.ts` |

## Examples

### Reference with all resources

```
[smith2024] Machine learning in medicine
  Authors: Smith, J.; Doe, A.
  Year: 2024
  Type: article-journal
  DOI: 10.xxxx/xxxxx
  URL: https://example.com
  UUID: 123e4567-e89b-12d3-a456-426614174000
  pdf md file url tag
```

### Reference with only URL

```
[jones2023] Deep learning approaches
  Authors: Jones, B.
  Year: 2023
  Type: article-journal
  DOI: 10.yyyy/yyyyy
  URL: https://example.com
  UUID: 987e6543-...
  url
```

### Reference with no resources

```
[doe2022] Some other paper
  Authors: Doe, A.
  Year: 2022
  Type: article-journal
  UUID: abc12345-...
```

(No indicator line added.)

### TUI interactive mode examples

```
❯ ◉ Machine learning in medicine
      Smith, J.; Doe, A.
      pdf file url tag · 2024 · J Med Inform · DOI: 10.xxxx

  ○ Chapter 5: Deep Learning
      Jones, B.
      2023 · Advanced AI Textbook · DOI: 10.yyyy

  ○ Introduction to Statistics
      Doe, A.
      2022 · Cambridge University Press

  ○ Neural network analysis
      Lee, C.
      url · 2021 · Thesis
```

## Related

- `spec/features/attachments.md` - Attachment data model and roles
- `spec/features/interactive-search.md` - TUI search display format
- `spec/features/fulltext-retrieval.md` - Fulltext retrieval
