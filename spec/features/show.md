# Show Command

Single-reference detail view — analogous to `git show` or `docker inspect`.

## Syntax

```
ref show <identifier> [options]
ref show [options]              # interactive selection when TTY
```

## Purpose

- Primary way to inspect a single reference's comprehensive details
- AI agents naturally expect `ref show <id>` for viewing reference details
- Consolidates information that otherwise requires multiple commands (`export`, `fulltext get`, `url`)

## Options

| Option | Description |
|--------|-------------|
| `--uuid` | Look up by UUID instead of citation key |
| `-o, --output <format>` | `pretty` (default) / `json` / `yaml` / `bibtex` |
| `--json` | Alias for `--output json` |

Always targets a **single reference**. No `--all` or `--search` flags.

## Pretty Output (default)

Richer than `ref list` pretty output. Shows all relevant metadata with section grouping:

```
[Smith2020] Machine learning approaches in genomics
  Type:      journal-article
  Authors:   Smith, J.; Tanaka, K.; Lee, M.
  Year:      2020
  Journal:   Nature Methods, 17(3), 245-260
  DOI:       10.1038/s41592-020-0001-0
  PMID:      32015508
  PMCID:     PMC7123456
  URL:       https://doi.org/10.1038/s41592-020-0001-0
  UUID:      a1b2c3d4-...
  Tags:      machine-learning, genomics
  Added:     2024-06-15
  Modified:  2024-09-01
  Fulltext:
    pdf:      /home/user/.ref/files/Smith2020/fulltext.pdf
    markdown: /home/user/.ref/files/Smith2020/fulltext.md
  Files:     supplement (2 files)

  Abstract:
    Recent advances in machine learning have transformed
    the analysis of genomic data...
```

### Design Decisions

- **Abstract shown** — omitted in `ref list`, essential for detail view
- **Fulltext paths shown** — saves agents a round-trip to `ref fulltext get`
- **Journal info consolidated** — container-title, volume, issue, page on one line
- **Absent optional fields omitted** — no `(none)` noise
- **Fulltext section always shown** — absence explicitly communicated:

```
# PDF only
  Fulltext:
    pdf:      /path/to/fulltext.pdf
    markdown: -

# No fulltext
  Fulltext:  -
```

## JSON Output (`--json`)

```json
{
  "id": "Smith2020",
  "uuid": "a1b2c3d4-...",
  "type": "journal-article",
  "title": "Machine learning approaches in genomics",
  "authors": ["Smith, J.", "Tanaka, K.", "Lee, M."],
  "year": 2020,
  "journal": "Nature Methods",
  "volume": "17",
  "issue": "3",
  "page": "245-260",
  "doi": "10.1038/s41592-020-0001-0",
  "pmid": "32015508",
  "pmcid": null,
  "url": "https://doi.org/10.1038/s41592-020-0001-0",
  "abstract": "Recent advances in...",
  "tags": ["machine-learning", "genomics"],
  "created": "2024-06-15T10:00:00Z",
  "modified": "2024-09-01T14:30:00Z",
  "fulltext": {
    "pdf": "/path/to/fulltext.pdf",
    "markdown": null
  },
  "attachments": [
    {"filename": "supplement1.pdf", "role": "supplement"}
  ],
  "raw": { ... }
}
```

### JSON Design Decisions

- **Top-level fields normalized** — agent-friendly keys (`journal`, `year`, `authors`) instead of CSL-JSON conventions
- **`fulltext.pdf` and `fulltext.markdown` always present** — `null` when not attached
- **`raw` includes original CslItem** — no information loss
- **`attachments` lists non-fulltext files** — role and filename for each

## Differentiation from `ref export`

| Aspect | `ref show` | `ref export` |
|--------|-----------|-------------|
| Purpose | Inspect a reference (human/agent) | Raw data for external tools |
| Target | Single reference | One, many, or all |
| Default format | Pretty (human-readable) | JSON (CSL-JSON) |
| Data shape | Normalized + raw | Raw CSL-JSON only |
| Fulltext paths | Included | Not included |
| Abstract | Shown in pretty | Not formatted |
| Attachments info | Included | Not included |

## Error Handling

- Reference not found: exit code 1, stderr: `Error: Reference not found: <identifier>`
- No identifier and non-TTY: exit code 1, stderr: `Error: Identifier required (non-interactive mode)`
