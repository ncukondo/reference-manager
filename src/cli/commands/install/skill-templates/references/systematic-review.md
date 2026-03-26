---
name: ref/systematic-review
description: Workflow for conducting systematic literature reviews using reference-manager. Covers search strategy, screening, and evidence synthesis.
---

# Systematic Review Workflow

Guide for conducting systematic literature reviews with `ref`.

## 1. Build Search Set

Add references from multiple sources:

```bash
# From DOIs (e.g., exported from database search)
ref add 10.1234/study1 10.1234/study2 10.1234/study3

# From BibTeX exported by PubMed/Scopus/Web of Science
ref add pubmed-results.bib
ref add scopus-results.ris

# By PMID list
ref add 12345678 23456789 34567890
```

## 2. Tag and Organize

Use tags to track screening stages:

```bash
# Tag references for screening
ref update <id> --set "tags=screening"

# After title/abstract screening
ref update <id> --set "tags=included"
ref update <id> --set "tags=excluded"

# After full-text review
ref update <id> --set "tags=final-included"
```

## 3. Full-Text Collection

```bash
# Auto-fetch open access full texts
ref fulltext fetch <id>

# Attach manually obtained PDFs
ref fulltext attach <id> path/to/paper.pdf

# Convert PDF to Markdown for text analysis
ref fulltext convert <id>
```

## 4. Quality Check

```bash
# Check for retractions or corrections
ref check <id>

# Verify metadata against upstream sources
ref check <id> --metadata
```

## 5. Export for Analysis

```bash
# Export included studies as BibTeX
ref search "tag:final-included" --output bibtex > included.bib

# Export as JSON for custom analysis
ref search "tag:final-included" --json > included.json
```

## Tips

- Use `ref list --sort date-desc` to review chronologically
- Use `ref search "tag:screening"` to find unprocessed references
- Use `ref show <id>` to inspect full metadata before decisions
- Duplicates are auto-detected on `ref add` — review skip messages
