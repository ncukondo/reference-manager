# ADR-001: CSL-JSON File as Single Source of Truth

Date: 2024-01-10

## Status

Accepted

## Context

Reference management tools typically use one of several storage approaches:
- Relational database (SQLite, PostgreSQL)
- Proprietary binary format
- Plain text files (BibTeX, CSL-JSON, etc.)
- Combination of database + files

Requirements:
- Direct Pandoc compatibility
- Cloud sync friendly (Dropbox, OneDrive)
- Human-readable and editable
- Version control friendly (git)
- No vendor lock-in

## Decision

Use a single CSL-JSON file as the only persistent storage. No database, no cache files, no indices on disk.

All indices and data structures are built in memory at load time.

## Rationale

1. **Pandoc compatibility**: Pandoc natively supports CSL-JSON, enabling direct usage without export/conversion
2. **Cloud sync**: Plain text files work reliably with Dropbox/OneDrive without file locking issues
3. **Human-editable**: Users can directly edit the file with any text editor
4. **Git-friendly**: Text format enables version control and diff viewing
5. **No lock-in**: Standard CSL-JSON format, no proprietary extensions
6. **Simplicity**: Single file is easier to backup, migrate, and manage
7. **Portability**: One file contains everything, easily moved between systems

## Consequences

### Positive

- Direct Pandoc integration without conversion
- Works seamlessly with cloud sync services
- Users can manually edit when needed
- Version control friendly
- Zero vendor lock-in
- Simple backup and migration
- No database setup required
- Predictable conflict behavior

### Negative

- Full file load on every startup (acceptable for small-to-medium libraries)
- No incremental updates to disk (write entire file)
- Performance limits with very large libraries (10,000+ references)
- No built-in query optimization (build indices in memory)

### Neutral

- Requires 3-way merge strategy for concurrent edits
- Need hash-based self-write detection for file watching
- Memory usage proportional to library size

## Alternatives Considered

### Option A: SQLite Database

**Description**: Use SQLite for storage, export to CSL-JSON for Pandoc

**Pros**:
- Efficient queries
- Partial updates
- Better performance for large libraries
- ACID transactions

**Cons**:
- Cloud sync can corrupt SQLite files
- Not human-editable
- Requires export step for Pandoc
- Binary format (not git-friendly)
- Two sources of truth (database + exported file)

**Why rejected**: Cloud sync corruption risk is unacceptable, violates "cloud-friendly" requirement

### Option B: BibTeX as Source

**Description**: Use BibTeX files instead of CSL-JSON

**Pros**:
- Familiar format for academics
- Plain text
- Git-friendly

**Cons**:
- Pandoc prefers CSL-JSON (better metadata support)
- Requires conversion for Pandoc
- Less structured (parser variations)
- Limited metadata field support
- No standard for custom fields

**Why rejected**: CSL-JSON is superior for Pandoc integration and metadata richness

### Option C: Database + CSL-JSON Export

**Description**: Database as primary storage, periodic export to CSL-JSON

**Pros**:
- Query performance
- Can handle large libraries
- ACID transactions

**Cons**:
- Two sources of truth (sync complexity)
- Export step required
- Cloud sync issues with database
- User edits to CSL-JSON not reflected
- Increased complexity

**Why rejected**: Violates "single source of truth" principle, cloud sync issues

## References

- CSL-JSON specification: https://citeproc-js.readthedocs.io/en/latest/csl-json/markup.html
- Pandoc CSL support: https://pandoc.org/MANUAL.html#citations
- Cloud sync file locking issues: https://www.sqlite.org/faq.html#q5