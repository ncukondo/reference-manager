# Superseded References

## Purpose

Record that a reference should no longer be cited, and where to cite instead.

Three situations produce a redundant record that the library cannot currently express (#108):

| Case | Origin | Detectable |
|------|--------|------------|
| Import duplicate | Same work imported twice from Paperpile/Zotero, matching DOI/PMID/ISBN/arXiv/ERIC | Yes — `ref duplicates` |
| Preprint → published | Both versions kept as separate records | Yes — `ref check` (`version_changed`) |
| Conference → journal | Different DOIs, no Crossref update relation | No — manual only |

Deleting the redundant record is not an option: a manuscript that already cites the old key would
stop resolving. The record stays, marked, with a pointer to its successor.

## Data Model

Three reserved fields under `custom`:

```jsonc
"custom": {
  "superseded_by": "018f2c9a-...-a91b",           // uuid of the successor
  "superseded_reason": "duplicate",               // duplicate | published_version | other
  "superseded_at": "2026-08-07T00:00:00.000Z"     // ISO 8601, when the mark was set
}
```

**`superseded_by` holds the successor's uuid, not its citation key.** Citation keys are mutable —
`edit` and `update` rename on collision (`src/core/library.ts`, `resolveNewId`) — so a key-valued
pointer would dangle silently. Output always resolves the uuid back to a citation key for display;
the uuid never appears in user-facing text.

The fields live under `custom`, so `export` output stays valid CSL-JSON and citeproc ignores them.

### Write access

All three are members of `MANAGED_CUSTOM_FIELDS`: hidden from `edit`, preserved from the original on
edit merge, and rejected by `update --set` (`Cannot set protected field`). `ref deprecate` is the
only writer, so the existence check and cycle check cannot be bypassed by hand-editing.

They are *not* members of `PROTECTED_CUSTOM_FIELDS`, so marking a reference counts as a real change
for change detection and bumps `custom.timestamp`.

### Invariants

- The three fields are set and cleared together; a record never carries a partial mark
- `superseded_by` never points at the record's own uuid
- Following `superseded_by` from a record never returns to that record (no cycles)
- `superseded_by` may point at a record that is itself superseded (chains are allowed); consumers
  resolve to the end of the chain

A pointer whose uuid is absent from the library is **dangling**. This is reachable — the successor
can be removed later — and is reported, not repaired automatically.

## Command: `deprecate`

```
ref deprecate <old-id> --to <new-id> [--reason <reason>] [--uuid] [-o json]
ref deprecate <old-id> --unset [--uuid] [-o json]
```

| Option | Meaning |
|--------|---------|
| `--to <new-id>` | Citation key (or uuid with `--uuid`) of the successor |
| `--unset` | Clear the mark |
| `--reason` | `duplicate` \| `published_version` \| `other` (default: `other`) |
| `--uuid` | Interpret both identifiers as uuids |

`--to` and `--unset` are mutually exclusive; exactly one is required.

### Validation

| Condition | Exit code |
|-----------|-----------|
| `<old-id>` not found | `NOT_FOUND` |
| `--to` target not found | `NOT_FOUND` |
| `--to` resolves to `<old-id>` itself | `VALIDATION_ERROR` |
| Successor chain from `--to` reaches `<old-id>` | `VALIDATION_ERROR` |
| Neither or both of `--to` / `--unset` | `VALIDATION_ERROR` |
| `--unset` on a record with no mark | success, reported as a no-op |

Re-running `deprecate` on an already-marked record overwrites the mark and refreshes
`superseded_at`.

## Reference-Time Reporting

A superseded record surfaced by any read command produces one stderr line per record. **stdout is
never touched** — piping `ref export`, `ref cite`, or `ref list --output ids` into another tool
keeps working byte-for-byte.

```
[SUPERSEDED] Carless2020-yj -> Carless2023-yt (duplicate)
```

Dangling and self-terminating cases:

```
[SUPERSEDED] Carless2020-yj -> <missing: 018f2c9a-...> (duplicate)
```

| Command | Behavior |
|---------|----------|
| `show` | Warn; pretty output also renders a `Superseded by` line |
| `cite` | Warn per cited record |
| `search` | Warn per matching record; results are **not** filtered |
| `list` | Superseded records are **hidden**; `--include-superseded` shows them (and warns) |
| `export` | Records are **included**; warn per record plus a summary line |

### Why `list` hides but `export` does not

`list` is a browsing command — a superseded record is noise once its successor exists.

`export` feeds bibliography builds (`ref export --all` → citeproc). Dropping a record there would
break any manuscript still citing the old key, turning a warning into a build failure. The record
stays in the output; the warning tells the author which keys to update:

```
[SUPERSEDED] Carless2020-yj -> Carless2023-yt (duplicate)
1 superseded reference included. Update your manuscript keys.
```

`search` is an explicit query — silently dropping a record the user asked for by name would be
surprising, so it warns only.

## Command: `duplicates`

```
ref duplicates [--by <keys>] [--include-resolved] [--fix] [-o json]
```

| Option | Meaning |
|--------|---------|
| `--by <keys>` | Comma-separated: `doi,pmid,isbn,arxiv,eric,scopus,title` |
| `--include-resolved` | Also report groups already linked by `superseded_by` |
| `--fix` | Choose a keeper per group and mark the rest (TTY only) |

Applies the `add`-time matching rules of `spec/features/duplicate-detection.md` to the whole
library at once. The algorithm differs from `detector.ts`: that function compares one incoming
record against every existing one, which is O(n²) applied to a library — 6,000 references means
18 million normalized comparisons. The scan groups by key instead, which is O(n).

`title` (title + authors + year) is excluded by default. It is the noisiest rule, and across a
whole library it pairs errata, translations and reprints that the identifier keys do not.

Two deviations from the pairwise detector, both to avoid false positives at library scale:

- **Chapters are keyed by ISBN + title.** Otherwise the twelve chapters of one edited volume
  collapse into a single twelve-way "duplicate".
- **A book is never grouped with its own chapter.** `detector.ts` pairs them whenever either side
  is a `book`, which is harmless for a one-shot `add` check but would report every book alongside
  its chapters here.

Groups whose members already point at each other are hidden, so the pairs fixed on one run are
not reported again on the next.

### `--fix`

TTY only, matching `check --fix`: which record to keep is a judgement call, and there is no safe
default to apply unattended. Each group is presented with its members, one pre-selected as the
suggestion, plus a skip option. The suggestion ranks by metadata completeness first, then later
publication year — that ordering is what separates an online-first record from its version of
record, which is the one that gained volume, issue and page numbers.

Marking goes through the same `deprecate` path, so a stale group cannot write a pointer the
command itself would have refused.

## Non-Goals

- No automatic rewriting of citation keys in manuscripts
- No automatic removal of superseded records
- No repair of dangling pointers (reported only)

## See Also

- `src/features/superseded/` — resolution, validation, warning formatting
- `src/cli/commands/deprecate.ts` — command implementation
- `src/features/duplicate/scanner.ts` — library-wide grouping and keeper suggestion
- `src/features/duplicate/fix-interaction.ts` — interactive keeper selection
- `spec/features/duplicate-detection.md` — the matching rules `ref duplicates` reuses
- `spec/features/check.md` — `version_changed` findings
