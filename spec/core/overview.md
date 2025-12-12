# Overview

**reference-manager** is a local reference management tool that treats a CSL-JSON file as the single source of truth and provides:

- Registration (write)
- Search (PMID / DOI / title + authors)
- Conflict-tolerant updates
- Direct Pandoc compatibility

The tool is designed for environments such as **Dropbox / OneDrive**, where file locking cannot be relied upon.

## Core Principles

- **CSL-JSON compatibility is preserved at all times**
- **The CSL-JSON file is the only persistent store**
- **Indices are built in memory**
- **Conflicts are handled via backup, hashing, and 3-way merge**
- **Pandoc citation keys are CSL-JSON `id` values**
