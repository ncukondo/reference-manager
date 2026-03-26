---
name: ref/fulltext
description: Guide for managing full-text PDFs and Markdown files. Covers fetching, attaching, converting, and organizing full-text content.
---

# Full-Text Management

Guide for working with full-text files (PDFs and Markdown) using `ref`.

## Attach Files

```bash
# Attach a PDF
ref fulltext attach <id> paper.pdf

# Attach Markdown
ref fulltext attach <id> paper.md
```

## Fetch Open Access

```bash
# Auto-discover and download OA full text
ref fulltext fetch <id>

# Fetch with auto-attach on add
ref add 10.1234/example --fetch-fulltext
```

## Convert Formats

```bash
# Convert PDF to Markdown (requires external converter)
ref fulltext convert <id>

# Supported converters: marker, docling, mineru, pymupdf
# Configure custom converter:
ref config set fulltext.pdfConverter.command "marker"
ref config set fulltext.pdfConverter.args "{input} --output {output_dir}"
```

## Retrieve Full Text

```bash
# Get file path
ref fulltext get <id>

# Get Markdown content to stdout
ref fulltext get <id> --stdout

# Prefer specific format
ref fulltext get <id> --markdown
ref fulltext get <id> --pdf

# Open in default system viewer
ref fulltext open <id>
```

## Check Availability

```bash
# Discover OA sources without downloading
ref fulltext discover <id>
```

## Detach

```bash
# Remove full-text association (file remains on disk)
ref fulltext detach <id>
```

## Tips

- Use `ref fulltext get <id> --stdout` to pipe content to other tools
- Full-text files are stored in the attachments directory (see `ref config get attachments.directory`)
- Use `ref show <id>` to see full-text status alongside metadata
- Markdown is preferred for AI-readable content; use `ref fulltext convert` after attaching PDF
