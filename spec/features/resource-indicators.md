# Resource Indicators

## Purpose

Show emoji icons in reference lists to indicate the presence of fulltext files, attachments, URLs, and tags. Provides at-a-glance visibility of what resources are available for each reference.

## Overview

When displaying reference lists (pretty format and TUI interactive mode), emoji indicators are appended to show which resources exist for each reference. This helps users quickly identify references with downloadable content, attached files, or tagged metadata.

## Indicator Icons

| Icon | Resource | Condition |
|------|----------|-----------|
| `📄` | Fulltext PDF | `custom.attachments.files` contains `role: "fulltext"` with `.pdf` extension |
| `📝` | Fulltext Markdown | `custom.attachments.files` contains `role: "fulltext"` with `.md`/`.markdown` extension |
| `📎` | Other attachments | `custom.attachments.files` contains files with roles other than `fulltext` |
| `🔗` | URL | `URL` field is present and non-empty |
| `🏷` | Tags | `custom.tags` array is present and has at least one entry |

### Display Rules

- Only present resources are shown (no placeholders for absent resources)
- Icons are concatenated without spaces: `📄📎🔗🏷`
- A single space separates the icon group from adjacent text
- Icons use default terminal color (no additional coloring)
- Order is fixed as listed above (fulltext PDF, fulltext MD, attachments, URL, tags)

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
  📄📎🔗🏷
```

When no indicators are present, the line is omitted entirely (no empty line added).

### TUI Interactive Mode

Indicators appear as a **prefix on the meta line** (3rd line of each choice):

```
❯ ◉ Title of the paper
      Smith, J.; Doe, A.
      📄📎🔗🏷 2024 · Journal article · DOI: 10.xxxx
```

When no indicators are present, the meta line remains unchanged (no extra space prefix).

## Implementation

### Shared Function

A single function builds the indicator string for both display modes:

```typescript
function buildResourceIndicators(item: CslItem): string
```

- Input: A CSL-JSON item
- Output: Concatenated emoji string (e.g., `"📄📎🔗🏷"`) or empty string if no indicators

### Detection Logic

Reuse existing utilities:

| Resource | Detection |
|----------|-----------|
| Fulltext PDF/Markdown | `findFulltextFiles()` from fulltext-adapter |
| Other attachments | `custom.attachments.files` filtered by `role !== "fulltext"` |
| URL | `item.URL` truthiness check |
| Tags | `item.custom?.tags?.length > 0` |

### Integration Points

| Location | File | Change |
|----------|------|--------|
| Pretty formatter | `src/features/format/pretty.ts` | Append indicator line in `formatSingleReference()` |
| TUI search flow | `src/features/interactive/apps/runSearchFlow.ts` | Prepend indicators to `meta` in `toChoice()` |

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
  📄📝📎🔗🏷
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
  🔗
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
      📄📎🔗🏷 2024 · Journal article · DOI: 10.xxxx

  ○ Deep learning approaches
      Jones, B.
      🔗 2023 · Journal article · DOI: 10.yyyy

  ○ Some other paper
      Doe, A.
      2022 · Journal article
```

## Related

- `spec/features/attachments.md` - Attachment data model and roles
- `spec/features/interactive-search.md` - TUI search display format
- `spec/features/fulltext-retrieval.md` - Fulltext retrieval
