# reference-manager Specifications

## Overview

**reference-manager** is a local reference management tool that treats CSL-JSON files as the single source of truth.

## Directory Structure

### meta/ - Development Process & AI Guides

| File | Content |
|------|---------|
| [development-process.md](meta/development-process.md) | **Complete workflow** from specification to implementation |
| [guide-for-ai.md](meta/guide-for-ai.md) | **Essential guide for AI assistants** working on this project |

**Read first when starting any work.**

### core/ - Core Specifications (Always Read)

| File | Content |
|------|---------|
| [overview.md](core/overview.md) | Project overview & core principles |
| [data-model.md](core/data-model.md) | Data model & identifiers |
| [data-flow.md](core/data-flow.md) | Data flow diagrams for major operations |
| [identifier-generation.md](core/identifier-generation.md) | ID generation rules |

### architecture/ - Architecture Specifications

| File | Content |
|------|---------|
| [runtime.md](architecture/runtime.md) | Runtime & distribution |
| [build-system.md](architecture/build-system.md) | Build system & modules |
| [module-dependencies.md](architecture/module-dependencies.md) | Module dependency rules & diagrams |
| [cli.md](architecture/cli.md) | CLI architecture |
| [http-server.md](architecture/http-server.md) | HTTP server |
| [directory-structure.md](architecture/directory-structure.md) | Directory structure |

### features/ - Feature Specifications

| File | Content |
|------|---------|
| [metadata.md](features/metadata.md) | Metadata fields |
| [duplicate-detection.md](features/duplicate-detection.md) | Duplicate detection |
| [search.md](features/search.md) | Search functionality |
| [file-monitoring.md](features/file-monitoring.md) | File monitoring & reload |
| [write-safety.md](features/write-safety.md) | Write safety & conflict handling |

### guidelines/ - Development Guidelines

| File | Content |
|------|---------|
| [validation.md](guidelines/validation.md) | Validation strategy |
| [testing.md](guidelines/testing.md) | **TDD workflow & testing strategy** (Must-read) |
| [code-style.md](guidelines/code-style.md) | Coding style & conventions |
| [platform.md](guidelines/platform.md) | Platform support |
| [pandoc.md](guidelines/pandoc.md) | Pandoc compatibility |
| [future.md](guidelines/future.md) | Future extensions |
| [non-goals.md](guidelines/non-goals.md) | Non-goals |

### patterns/ - Implementation Patterns

| File | Content |
|------|---------|
| [error-handling.md](patterns/error-handling.md) | Error handling patterns & examples |

### decisions/ - Architecture Decision Records (ADRs)

| File | Content |
|------|---------|
| [README.md](decisions/README.md) | ADR template & guidelines |
| Individual ADR files | Recorded architectural decisions |

## Reading Guide

| Directory | When to Read |
|-----------|--------------|
| `meta/` | **Always read first** - Development process & workflow |
| `core/` | **Always read** - Foundation of the project |
| `architecture/` | When implementing CLI/server, configuring builds |
| `features/` | When implementing/modifying specific features (read relevant files only) |
| `guidelines/` | When writing tests, setting up CI, checking compatibility |
| `patterns/` | When implementing new code or refactoring |
| `decisions/` | When understanding why certain technical choices were made |

## Development Workflow

1. **Read** `spec/meta/development-process.md` - Understand the complete workflow
2. **Read** necessary specs (always check `spec/core/`)
3. **Check** `ROADMAP.md` - Verify current phase and next steps
4. **Follow** TDD process (see `spec/guidelines/testing.md`)
5. **Quality checks** after each implementation