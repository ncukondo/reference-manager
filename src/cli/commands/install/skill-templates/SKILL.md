---
name: ref
description: Manage academic references in CSL-JSON format. Add papers by DOI/PMID/ISBN/arXiv, search and list references, generate citations, manage full-text PDFs, and check for retractions.
allowed-tools:
  - Bash
  - Read
  - Write
  - Edit
  - Glob
  - Grep
---

# ref — Reference Manager

A CLI tool for managing academic references using CSL-JSON as the single source of truth.

## Quick Reference

| Task | Command |
|------|---------|
| Add by DOI | `ref add 10.1234/example` |
| Add by PMID | `ref add 12345678` |
| Add by ISBN | `ref add 978-0-123456-78-9` |
| Add by arXiv | `ref add 2301.12345` |
| Add from BibTeX | `ref add references.bib` |
| Add from RIS | `ref add references.ris` |
| Search | `ref search "query"` |
| List all | `ref list` |
| Show details | `ref show <id>` |
| Generate citation | `ref cite <id>` |
| Export | `ref export <id> --output bibtex` |
| Attach full-text | `ref fulltext attach <id> paper.pdf` |
| Fetch full-text | `ref fulltext fetch <id>` |
| Check retractions | `ref check <id>` |
| Remove | `ref remove <id>` |
| Update fields | `ref update <id> --set "title=New Title"` |
| Configure | `ref config set <key> <value>` |

## Search Syntax

- Simple text: `ref search "machine learning"`
- By author: `ref search "author:Smith"`
- By year: `ref search "year:2024"`
- By type: `ref search "type:article-journal"`
- By tag: `ref search "tag:review"`
- Combined: `ref search "author:Smith year:2024"`
- Case-sensitive: prefix with `C/` (e.g., `ref search "C/RNA"`)

## Output Formats

Most commands support `--output` or `--json` flags:

- `--json` — JSON output for programmatic use
- `--output bibtex` — BibTeX format
- `--output yaml` — YAML format

## Full Help

Run `ref --help` for all commands and options.
Run `ref <command> --help` for command-specific help.
