# Write Safety & Conflict Handling

## Atomic Write

- Implemented via `write-file-atomic`

## Backup

- Created before write
- Location: `{cache}/backups/<library-name>/` (platform-specific cache directory)
- Retention:
  - Max 50 generations OR
  - Max age 1 year

## Hashing

- SHA-256 via Node.js `crypto`

## Conflict Detection

- Base hash recorded at read
- Rechecked before write
- Mismatch triggers merge

## Merge Strategy

- 3-way merge with **Last-Write-Wins (LWW)** strategy
- Identity via `custom.uuid`
- Field-by-field comparison
- Automatic conflict resolution via `custom.timestamp`

Resolution priority:
1. **No change** (base == local == remote) → keep base
2. **One side changed** → use changed version
3. **Both changed to same value** → use that value
4. **Both changed to different values:**
   - Compare `custom.timestamp` (last modification time)
   - **Newer timestamp wins automatically** (LWW)
   - If timestamps equal → apply `--prefer` or report conflict

Default behavior:
- Auto-resolved (LWW or unambiguous) → write, exit 0
- Conflict (same timestamp, no --prefer) →
  - Generate conflict CSL file: `<library>.conflict.csl.json`
  - Generate conflict report: `<library>.conflict-report.txt`
  - Do not update canonical file
  - Exit 2

## `--prefer`

- `--prefer=local|remote`
- Used as tie-breaker when `custom.timestamp` values are equal
- Applies only to conflicting fields
- Overrides LWW strategy for same-timestamp conflicts

## Timestamp Update

- `custom.timestamp` is automatically updated when:
  - Any field is modified via `Reference.updateField()`
  - Reference is explicitly touched via `Reference.touch()`
  - Library performs any CRUD operation that modifies a reference
- `custom.created_at` is set once at creation and **never** changed
- Legacy migration: old `timestamp` field is moved to `created_at` on first load

## Exit Codes

- `0` success
- `2` conflict
- `3` parse error
- `4` I/O error
