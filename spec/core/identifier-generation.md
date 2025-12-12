# Identifier Generation

## `id` (BibTeX-style key)

Format:
```
<FirstAuthorFamily>-<Year>[<TitleSlug>][a-z suffix]
```

Rules:
- ASCII letters, digits, and underscores only
- Spaces converted to underscores for readability
- TitleSlug (Used when Author or Year is missing):
  - From title
  - Max 32 chars
  - Non-ASCII dropped
- Collision handling:
  - Append `a, b, c ...`
  - Continue `aa, ab ...` if needed

Fallbacks:
- No author → `Anon-<Year>-<TitleSlug>`
- No year → `<Author>-nd-<TitleSlug>`
- No title and No year → `<Author>-nd-Untitled`

## UUID in `custom`

- `custom` is a single string
- Key-value pairs separated by `;`
- Reserved key: `reference_manager_uuid`
- Keys are case-insensitive on read, normalized on write
