# Data Flow

Conceptual data flow diagrams for major operations.

## Module Layers

```
┌──────────────────────────────────────┐
│           CLI / Server               │
│  CLI: routing + output formatting    │
│  Server: HTTP handling               │
└─────────────────┬────────────────────┘
                  │
                  ↓
┌──────────────────────────────────────┐
│       features/operations/           │
│  Unified operations (add, list, etc) │
└─────────────────┬────────────────────┘
                  │
                  ↓
┌──────────────────────────────────────┐
│            Features                  │
│  import, search, duplicate, merge    │
└─────────────────┬────────────────────┘
                  │
                  ↓
┌──────────────────────────────────────┐
│              Core                    │
│  Library, Reference, CSL-JSON        │
└─────────────────┬────────────────────┘
                  │
                  ↓
┌──────────────────────────────────────┐
│          Utils / Config              │
└──────────────────────────────────────┘
```

## Library Load

```
File Path
  ↓
Parse CSL-JSON
  ↓
Validate Schema
  ↓
Create Reference instances
  ├─ Generate UUIDs (if missing)
  └─ Generate IDs (if missing)
  ↓
Build indices (uuid, id, doi, pmid)
  ↓
Compute file hash
  ↓
Library ready
```

## Add Reference

```
Input (file, identifier, or stdin)
  ↓
Format Detection (auto or explicit)
  ↓
Parse/Fetch
  ├─ File → Parse (JSON, BibTeX, RIS)
  └─ Identifier → Fetch (PMID, DOI)
  ↓
Duplicate Detection
  ├─ Duplicate found → Skip or Error
  └─ No duplicate → Continue
  ↓
Generate ID (if missing)
  ├─ Handle collisions (suffix a, b, c...)
  ↓
Add to Library
  ↓
Save (backup → atomic write)
```

## Search

```
Query String
  ↓
Tokenize
  ├─ Split by whitespace
  ├─ Handle quoted phrases
  └─ Extract field prefixes
  ↓
Normalize (NFKC, lowercase, remove punctuation)
  ↓
Match
  ├─ ID fields: exact match
  └─ Content fields: partial match
  ├─ All tokens must match (AND)
  ↓
Sort (match strength, year, author, title)
  ↓
Format Output
```

## Save (with Conflict Detection)

```
Library.save()
  ↓
Compute current file hash
  ↓
Compare with stored hash
  ├─ Match → Write directly
  └─ Mismatch → External change detected
      ↓
    3-way Merge
      ├─ Auto-resolved → Write merged
      └─ Conflict → Generate conflict files
```

## File Watching (Server Mode)

```
File change event
  ↓
Compute new hash
  ↓
Compare with stored hash
  ├─ Match → Self-write, skip reload
  └─ Mismatch → External change
      ↓
    Reload library
```
