# Write Safety & Conflict Handling

## Atomic Write

- Implemented via `write-file-atomic`

## Backup

- Created before write
- Location:
  ```
  $TMPDIR/reference-manager/backups/<library-name>/
  ```
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

- 3-way merge
- Identity via `reference_manager_uuid`
- Field-by-field comparison

Default:
- No conflicts → write, exit 0
- Conflicts →
  - Generate conflict CSL file
  - Generate conflict report
  - Do not update canonical file
  - Exit non-zero

## `--prefer`

- `--prefer=local|remote`
- Applies only to conflicting fields

## Exit Codes

- `0` success
- `2` conflict
- `3` parse error
- `4` I/O error
