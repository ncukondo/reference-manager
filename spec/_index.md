# Spec Index

This file provides an overview of all specification documents in this project.

## Purpose

These specifications serve as guidelines for AI-assisted development:
- Define project goals and constraints
- Establish architectural patterns
- Document feature requirements
- Guide implementation decisions

## Spec Principles

1. **"What" and "Why", not "How"**: Implementation details belong in source code
2. **Source code is truth**: For implementation details, read the code
3. **On-demand reading**: Only read specs relevant to current task
4. **No duplication**: If code shows it, don't repeat in spec

**Source Code References**: Specs use `See: src/path/file.ts` to point to implementations.

## Directory Structure

```
spec/
├── _index.md                    # This file
├── meta/                        # Development process (always read first)
│   ├── guide-for-ai.md          # AI context and conventions
│   └── development-process.md   # Workflow from spec to implementation
├── core/                        # Core specifications (always read)
│   ├── overview.md              # Project goals and scope
│   ├── data-model.md            # CSL-JSON structure, identifiers
│   └── data-flow.md             # Conceptual data flows
├── architecture/                # System architecture
│   ├── runtime.md               # Node.js, distribution
│   ├── build-system.md          # TypeScript, Vite, ESM
│   ├── directory-structure.md   # Project layout
│   ├── module-dependencies.md   # Layer rules
│   ├── cli.md                   # CLI commands, config, server integration
│   ├── http-server.md           # HTTP server, portfile, API
│   └── mcp-server.md            # MCP stdio server for AI agents
├── features/                    # Feature specifications
│   ├── add.md                   # Multi-format import (PMID, DOI, BibTeX, RIS)
│   ├── citation.md              # Citation generation
│   ├── fulltext.md              # Full-text PDF/Markdown management
│   ├── search.md                # Search query syntax
│   ├── interactive-search.md    # Interactive incremental search mode
│   ├── pagination.md            # Sorting, limit, offset for list/search
│   ├── shell-completion.md      # Bash/Zsh/Fish auto-completion
│   ├── duplicate-detection.md   # Duplicate detection rules
│   ├── file-monitoring.md       # File watching, reload
│   ├── write-safety.md          # Atomic write, backup, merge
│   └── metadata.md              # Standard and custom fields
├── guidelines/                  # Development guidelines
│   ├── testing.md               # TDD workflow
│   ├── code-style.md            # Naming, formatting (ref: biome.json)
│   ├── validation.md            # Zod schema validation
│   ├── platform.md              # OS support
│   ├── pandoc.md                # Pandoc compatibility
│   ├── non-goals.md             # What we don't do
│   └── future.md                # Future extensions (non-normative)
├── patterns/                    # Implementation patterns
│   └── error-handling.md        # Error classes, exit codes
├── decisions/                   # Architecture Decision Records
│   ├── README.md                # ADR template and guidelines
│   └── ADR-*.md                 # Individual decisions
└── tasks/                       # Task management
    ├── ROADMAP.md               # Progress tracking
    ├── _template.md             # Task template
    └── completed/               # Completed tasks
```

## Reading Guidelines

| Directory | When to Read |
|-----------|--------------|
| `meta/` | **Always read first** - Development process |
| `core/` | **Always read** - Core concepts |
| `architecture/` | When implementing CLI/server, configuring builds |
| `features/` | When implementing specific features |
| `guidelines/` | When writing code, tests, or checking compatibility |
| `patterns/` | When implementing error handling or common patterns |
| `decisions/` | When understanding technical choices (ADRs) |
| `tasks/` | When tracking progress or creating new tasks |

## Quick Reference

### Commands

| Command | Spec |
|---------|------|
| `add` | `features/add.md` |
| `cite` | `features/citation.md` |
| `fulltext` | `features/fulltext.md` |
| `search` / `list` | `features/search.md`, `features/pagination.md` |
| `search -i` | `features/interactive-search.md` |
| `server` | `architecture/http-server.md` |
| `mcp` | `architecture/mcp-server.md` |
| `completion` | `features/shell-completion.md` |

### Core Concepts

| Concept | Spec |
|---------|------|
| CSL-JSON format | `core/data-model.md` |
| ID generation | `core/data-model.md` |
| Full-text files | `features/fulltext.md` |
| Duplicate detection | `features/duplicate-detection.md` |
| Conflict resolution | `features/write-safety.md` |
| File watching | `features/file-monitoring.md` |

### Development

| Topic | Spec |
|-------|------|
| TDD workflow | `guidelines/testing.md` |
| Code style | `guidelines/code-style.md` |
| Error handling | `patterns/error-handling.md` |
| Module layers | `architecture/module-dependencies.md` |

## Development Workflow

1. **Read** `spec/meta/development-process.md` - Understand the complete workflow
2. **Read** necessary specs (always check `spec/core/`)
3. **Check** `spec/tasks/ROADMAP.md` - Verify current phase and next steps
4. **Follow** TDD process (see `spec/guidelines/testing.md`)
5. **Quality checks** after each implementation
