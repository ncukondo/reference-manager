# Data Flow

Data flow diagrams for major operations.

## 1. Library Load

```
User / CLI / Server
  ↓
Library.load(filePath)
  ↓
parseCslJson(filePath) ← src/core/csl-json/parser.ts
  ├─ Read file
  ├─ Parse JSON
  └─ Validate schema
  ↓
CslItem[] (array)
  ↓
Library constructor
  ├─ Create Reference instances
  ├─ Generate UUIDs (if missing)
  ├─ Generate IDs (if missing)
  └─ Build indices:
      ├─ uuidIndex: Map<uuid, Reference>
      ├─ idIndex: Map<id, Reference>
      ├─ doiIndex: Map<doi, Reference>
      └─ pmidIndex: Map<pmid, Reference>
  ↓
Library instance
  ├─ computeFileHash(filePath) ← src/utils/hash.ts
  └─ Store currentHash
  ↓
Return loaded Library
```

**Implementation**: `src/core/library.ts:35`

## 2. Add Reference (Multi-Format Import)

```
User Input (file paths, identifiers, or stdin)
  ↓
CLI: add command [input...] --format --verbose
  │
  ├─ Server running? → POST /references/add
  │                         │
  └─ Server stopped? ───────┼──→ Direct call
                            ↓
features/operations/add.ts
addReferences(inputs, library, config, options)
  ↓
features/import/importer.ts
importFromInputs(inputs, options)
  ├─ Classify inputs (file vs identifier)
  ├─ Files: Read content, detect format
  │   └─ importFromContent() ← parser.ts (BibTeX, RIS, JSON)
  └─ Identifiers: Fetch metadata
      └─ importFromIdentifiers() ← fetcher.ts (PMID, DOI)
  ↓
ImportResult { items: CslItem[], errors: [...] }
  ↓
For each successfully imported item:
  ├─ [Duplicate Detection] ← src/features/duplicate/detector.ts
  │   ├─ Check DOI (if present)
  │   ├─ Check PMID (if present)
  │   └─ Check Title + Authors + Year
  │   ├─ Duplicate found (--force=false)? → Add to skipped
  │   └─ No duplicate → Continue
  │
  └─ Reference.create(item, { existingIds })
      ├─ Generate UUID (if missing)
      ├─ Normalize metadata (DOI, PMID, etc.)
      ├─ Generate ID (if missing) ← src/core/identifier/generator.ts
      │   ├─ Format: Author-Year[-TitleSlug][suffix]
      │   └─ Handle collisions (a, b, c, ...)
      └─ Set timestamps (created_at, timestamp)
  ↓
Library.add(ref) for each new reference
  ├─ Add to references array
  └─ Add to indices (uuid, id, doi, pmid)
  ↓
Library.save()
  ↓
[Backup] createBackup() ← src/utils/backup.ts
  ├─ Copy current file to backup dir
  └─ Cleanup old backups
  ↓
[Write] writeCslJson(filePath, items) ← src/core/csl-json/serializer.ts
  ├─ Serialize to JSON
  └─ Atomic write (write-file-atomic)
  ↓
AddResult
  ├─ added: { id, title }[]
  ├─ failed: { source, error }[]
  └─ skipped: { source, existingId }[]
  ↓
CLI: formatOutput() + exit(getExitCode())
Server: Return JSON response
```

**Implementation**:
- `src/features/operations/add.ts`
- `src/features/import/importer.ts`
- `src/core/library.ts`
- `src/features/duplicate/detector.ts`

## 3. Search

```
Search Query (string)
  ↓
CLI: searchCommand() / Server: GET /references/search
  ↓
[Tokenize] ← src/features/search/tokenizer.ts
  ├─ Split by whitespace
  ├─ Handle quoted phrases ("machine learning")
  └─ Extract field prefixes (author:, title:, etc.)
  ↓
Token[]
  ├─ { field: "author", value: "Smith" }
  ├─ { field: null, value: "2020" }
  └─ { field: "title", value: "machine learning" }
  ↓
[Normalize] ← src/features/search/normalizer.ts
  ├─ Unicode NFKC
  ├─ Lowercase
  ├─ Remove punctuation
  └─ Normalize whitespace
  ↓
Normalized tokens
  ↓
[Match] ← src/features/search/matcher.ts
  For each reference:
    For each token:
      ├─ ID fields (DOI, PMID, etc.): Exact match
      └─ Content fields: Partial match (substring)
    ├─ All tokens match? → Include
    └─ Any token missing? → Exclude
  ↓
Matching references[]
  ↓
[Sort] ← src/features/search/sorter.ts
  ├─ 1. Match strength
  ├─ 2. Year (descending)
  ├─ 3. Author (alphabetical)
  ├─ 4. Title (alphabetical)
  └─ 5. Registration order
  ↓
Sorted results[]
  ↓
[Format Output] ← src/cli/output/
  ├─ --json: JSON output
  ├─ --bibtex: BibTeX format
  ├─ --ids-only: ID list
  └─ Default: Pretty-printed CSL-JSON
  ↓
Display to user / Return to client
```

**Implementation**:
- `src/cli/commands/search.ts`
- `src/features/search/`

## 4. Update Reference

```
User Input (reference ID/UUID + updates)
  ↓
CLI: updateCommand() / Server: PATCH /references/:id
  ↓
Library.findByUuid(uuid) or Library.findById(id)
  ├─ Not found? → Error
  └─ Found → ref
  ↓
Reference.updateField(field, value)
  ├─ Validate field value
  ├─ Update field
  └─ Update timestamp (custom.timestamp = now)
  ↓
Library.save()
  ↓
[Same as Add Reference save flow]
  ├─ Backup
  ├─ Write
  └─ Update hash
  ↓
Success
```

**Implementation**: `src/cli/commands/update.ts`

## 5. Remove Reference

```
User Input (reference ID or UUID)
  ↓
CLI: removeCommand() / Server: DELETE /references/:id
  ↓
Library.removeByUuid(uuid) or Library.removeById(id)
  ├─ Find reference in index
  ├─ Not found? → return false
  └─ Found → ref
  ↓
Library.removeReference(ref)
  ├─ Remove from references array
  └─ Remove from all indices:
      ├─ uuidIndex.delete(uuid)
      ├─ idIndex.delete(id)
      ├─ doiIndex.delete(doi)
      └─ pmidIndex.delete(pmid)
  ↓
Library.save()
  ↓
[Same as Add Reference save flow]
  ├─ Backup
  ├─ Write
  └─ Update hash
  ↓
Success
```

**Implementation**: `src/cli/commands/remove.ts`

## 6. Conflict Detection and Merge

```
Library.save()
  ↓
[Detect Conflict] computeFileHash(filePath)
  ├─ Current hash in memory
  ├─ Actual file hash on disk
  └─ Hashes differ? → External modification detected
  ↓
Conflict detected
  ↓
[3-Way Merge] ← src/features/merge/three-way.ts
  ├─ BASE: State at last load/save (from currentHash)
  ├─ LOCAL: Current in-memory state
  ├─ REMOTE: Current file on disk
  ↓
For each reference (match by custom.uuid):
  ├─ Only in LOCAL → Add
  ├─ Only in REMOTE → Add
  ├─ In both → Merge fields
  └─ Deleted → Handle deletion
  ↓
For each field in overlapping references:
  ├─ No change (base == local == remote) → Keep
  ├─ Local changed, remote unchanged → Use local
  ├─ Remote changed, local unchanged → Use remote
  ├─ Both changed to same value → Use that value
  └─ Both changed to different values:
      ├─ Compare custom.timestamp (LWW strategy)
      ├─ Newer timestamp → Winner
      ├─ Same timestamp → Check --prefer flag
      └─ No --prefer → Conflict!
  ↓
Merge result:
  ├─ Auto-resolved → Write merged result
  └─ Conflict → Generate conflict files
      ├─ library.conflict.csl.json
      └─ library.conflict-report.txt
  ↓
Exit with appropriate code
  ├─ 0: Success (auto-resolved)
  └─ 2: Conflict (manual resolution needed)
```

**Implementation**: `src/features/merge/three-way.ts`

## 7. File Watching (Server Mode)

```
Server start
  ↓
FileWatcher.watch(filePath) ← src/features/file-watcher/file-watcher.ts
  ├─ Use chokidar
  ├─ Debounce: 500ms
  └─ Polling fallback: 5s
  ↓
File change event
  ↓
[Self-Write Detection] computeFileHash(filePath)
  ├─ New hash == currentHash? → Self-write
  │   └─ Skip reload (return)
  └─ New hash != currentHash? → External change
      └─ Continue
  ↓
External change detected
  ↓
[Retry Parse] (handle incomplete writes)
  ├─ Try parse JSON
  ├─ Parse error? → Wait 200ms, retry
  └─ Max 10 retries
  ↓
Library.load(filePath)
  ├─ Parse new file
  ├─ Rebuild indices
  └─ Update currentHash
  ↓
Server continues with new data
  └─ Old requests may use old data (acceptable)
```

**Implementation**:
- `src/features/file-watcher/file-watcher.ts`
- `src/server/index.ts`

## Module Interaction Summary

```
┌──────────────────────────────────────────────┐
│              CLI / Server                    │
│  CLI: routing (server vs direct) + output   │
│  Server: HTTP handling                       │
└─────────────┬────────────────────────────────┘
              │
              ↓
┌──────────────────────────────────────────────┐
│         features/operations/                 │
│  Unified operations (used by CLI & Server)  │
│  ├─ add.ts (addReferences)                  │
│  ├─ list.ts, search.ts, remove.ts, etc.     │
└─────────────┬────────────────────────────────┘
              │
              ↓
┌──────────────────────────────────────────────┐
│             Features                         │
│  ├─ Import (multi-format import)            │
│  ├─ Search (tokenize, match, sort)          │
│  ├─ Duplicate (detect duplicates)           │
│  ├─ Merge (3-way conflict resolution)       │
│  └─ File Watcher (monitor & reload)         │
└─────────────┬────────────────────────────────┘
              │
              ↓
┌──────────────────────────────────────────────┐
│              Core                            │
│  ├─ Library (CRUD operations)               │
│  ├─ Reference (single reference entity)     │
│  ├─ CSL-JSON (parse, serialize, validate)   │
│  └─ Identifier (ID generation, UUID)        │
└─────────────┬────────────────────────────────┘
              │
              ↓
┌──────────────────────────────────────────────┐
│           Utils / Config                     │
│  ├─ Hash (file hashing)                     │
│  ├─ Backup (backup management)              │
│  ├─ Logger (logging)                        │
│  ├─ File (file operations)                  │
│  └─ Config (configuration loading)          │
└──────────────────────────────────────────────┘
```

## Key Data Structures

### In-Memory Library State

```typescript
Library {
  filePath: string
  references: Reference[]
  currentHash: string | null

  // Indices for O(1) lookup
  uuidIndex: Map<string, Reference>
  idIndex: Map<string, Reference>
  doiIndex: Map<string, Reference>
  pmidIndex: Map<string, Reference>
}
```

### Reference Entity

```typescript
Reference {
  item: CSLItem  // Complete CSL-JSON item

  // Metadata in item.custom
  custom: {
    uuid: string           // Internal stable ID
    created_at: string     // ISO 8601 timestamp (immutable)
    timestamp: string      // ISO 8601 last modified time
    additional_urls?: string[]
  }
}
```

### Search Token

```typescript
Token {
  field: string | null   // "author", "title", etc. or null for any field
  value: string          // Search value (normalized)
  isPhrase: boolean      // Quoted phrase?
}
```