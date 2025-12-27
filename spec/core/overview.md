# Overview

**reference-manager** is a local reference management tool designed for automation.

## Primary Purpose

Enable programmatic access to reference management for:
- **AI agents** via MCP (Model Context Protocol)
- **Shell scripts** via CLI
- **Pandoc workflows** via CSL-JSON compatibility

## Target Users

Researchers who use AI and scripts to automate:
- Systematic reviews and scoping reviews
- Literature screening and data extraction
- Manuscript writing and citation generation

## Core Principles

1. **Automation-first**: Every operation available via CLI and MCP
2. **CSL-JSON as single source of truth**: The JSON file is the only persistent store
3. **Pandoc compatibility**: Citation keys are CSL-JSON `id` values
4. **Conflict tolerance**: Backup, hashing, and 3-way merge for concurrent access

## Architecture

```
┌─────────────────────────────────────────────────┐
│                   Interfaces                     │
│  ┌─────────┐  ┌─────────┐  ┌─────────────────┐  │
│  │   CLI   │  │   MCP   │  │  HTTP (internal)│  │
│  └────┬────┘  └────┬────┘  └────────┬────────┘  │
└───────┼────────────┼────────────────┼───────────┘
        │            │                │
        ▼            ▼                ▼
┌─────────────────────────────────────────────────┐
│              Operations Layer                    │
│   search, list, add, remove, cite, fulltext     │
└─────────────────────────────────────────────────┘
        │
        ▼
┌─────────────────────────────────────────────────┐
│                Core Layer                        │
│   Library, Reference, CSL-JSON processing       │
└─────────────────────────────────────────────────┘
        │
        ▼
┌─────────────────────────────────────────────────┐
│              CSL-JSON File                       │
│         (single source of truth)                │
└─────────────────────────────────────────────────┘
```

## Key Features

| Feature | Description |
|---------|-------------|
| Multi-format import | DOI, PMID, BibTeX, RIS, CSL-JSON |
| Smart search | Field-specific queries, phrase search |
| Citation generation | Multiple styles (APA, Chicago, etc.) |
| Full-text management | PDF and Markdown attachments |
| Duplicate detection | DOI/PMID/title+author+year matching |
| File monitoring | Auto-reload on external changes |

## Non-Goals

See `spec/guidelines/non-goals.md` for what this tool does NOT do.
