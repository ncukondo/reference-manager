# URL Command

## Purpose

Resolve and display reference URLs from CslItem fields (DOI, URL, PMID, PMCID, additional_urls).
Optionally open URLs in the system browser.

## Syntax

```bash
reference-manager url [ids...] [options]
```

## Options

```
--default       Output single best URL by priority
--doi           Output DOI URL only
--pubmed        Output PubMed URL only
--pmcid         Output PMC URL only
--open          Open URL in browser (implies --default when used alone)
--uuid          Interpret identifiers as UUIDs
```

## URL Resolution Priority

For `--default` (and `--open` without other filters):

```
DOI > URL > PMID > PMCID > custom.additional_urls[0]
```

## URL Construction

| Source | URL Template |
|--------|-------------|
| `DOI` | `https://doi.org/{DOI}` |
| `URL` | as-is |
| `PMID` | `https://pubmed.ncbi.nlm.nih.gov/{PMID}/` |
| `PMCID` | `https://www.ncbi.nlm.nih.gov/pmc/articles/{PMCID}/` |
| `custom.additional_urls` | as-is |

## Output Format

**Single ID, no filter:** All URLs, one per line

```
https://doi.org/10.1000/example
https://journal.com/article/123
https://pubmed.ncbi.nlm.nih.gov/12345678/
```

**Multiple IDs, no filter:** TSV format (id\turl)

```
smith2023	https://doi.org/10.1000/example
smith2023	https://journal.com/article/123
jones2024	https://doi.org/10.2000/other
```

**With type filter (`--default`, `--doi`, etc.):** Plain URL, one per line

```
https://doi.org/10.1000/example
https://doi.org/10.2000/other
```

## Interactive ID Selection

When invoked without identifiers in a TTY environment, falls back to interactive
single-select mode using the shared reference select component.

See `spec/features/interactive-id-selection.md`.

## Error Handling

| Condition | Behavior |
|-----------|----------|
| No URLs available | Error message to stderr, exit code 1 |
| Filtered URL not available | Error: "No DOI URL for smith2023", exit code 1 |
| Non-TTY without ID | Error: "Identifier is required", exit code 1 |
| Reference not found | Error: "Reference not found: xxx", exit code 1 |
| `--open` fails | Error message to stderr, exit code 1 |

## Implementation

- URL resolution: `src/features/operations/url.ts`
- Command execution: `src/cli/commands/url.ts`
- CLI registration: `src/cli/index.ts`
- Browser opening: `src/utils/opener.ts` (`openWithSystemApp`)

## Related

- `spec/architecture/cli.md` - CLI command reference
- `spec/core/data-model.md` - CslItem fields (DOI, URL, PMID, PMCID)
- `spec/features/interactive-id-selection.md` - Interactive selection fallback
