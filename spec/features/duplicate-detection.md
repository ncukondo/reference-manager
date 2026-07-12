# Duplicate Detection

## Priority

1. DOI
2. PMID
3. ISBN (with type-based rules)
4. arXiv ID (`custom.arxiv_id`, version suffix ignored)
5. ERIC ID (`custom.eric_id`, exact match)
6. Scopus ID (`custom.scopus_id`, exact match)
7. Title + Authors + Year

## ISBN Matching Rules

ISBN matching considers the reference type:

| Type | Match Criteria |
|------|----------------|
| `book` | ISBN only |
| `book-section` | ISBN + title (same book can have multiple chapters) |

**Rationale**: A book has a unique ISBN, but a book can contain multiple chapters (book-section) that share the same ISBN.

## Default Behavior

- Duplicate detected → **reject**
- Use `--force` to skip duplicate check
