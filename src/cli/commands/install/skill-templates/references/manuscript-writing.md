---
name: ref/manuscript-writing
description: Workflow for managing references while writing academic manuscripts. Covers citation generation, bibliography export, and reference verification.
---

# Manuscript Writing Workflow

Guide for managing references during academic manuscript writing with `ref`.

## 1. Find and Cite

```bash
# Search your library
ref search "Smith 2024"

# Generate an inline citation
ref cite <id>

# Generate citation in specific style
ref cite <id> --style apa
ref cite <id> --style vancouver

# Get Pandoc/LaTeX citation key
ref cite <id> --key
```

## 2. Build Bibliography

```bash
# Export all cited references as BibTeX
ref export <id1> <id2> <id3> --output bibtex > references.bib

# Export by search query
ref search "tag:cited" --output bibtex > references.bib

# Export all references
ref export --all --output bibtex > library.bib
```

## 3. Add New References During Writing

```bash
# Quick add by DOI from a paper you're reading
ref add 10.1234/example

# Add from clipboard BibTeX (pipe from stdin)
echo '<bibtex>' | ref add -

# Add and immediately get citation key
ref add 10.1234/example --json | jq -r '.added[0].id'
```

## 4. Verify Before Submission

```bash
# Check all cited references for retractions
ref check <id1> <id2> <id3>

# Verify metadata accuracy
ref check <id> --metadata

# Show full details for final review
ref show <id>
```

## 5. Full-Text Management

```bash
# Attach supplementary files
ref fulltext attach <id> paper.pdf
ref fulltext attach <id> supplement.pdf

# Get full-text path for reading
ref fulltext get <id>

# Open in default viewer
ref fulltext open <id>
```

## Tips

- Use `ref cite <id> --key` to get `@AuthorYear` keys for Pandoc
- Use `ref show <id> --output yaml` for quick metadata overview
- Use `ref url <id>` to get DOI/PubMed URLs for linking
- Tag references with `ref update <id> --set "tags=cited"` to track what's in the manuscript
