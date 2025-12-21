# ROADMAP

This document tracks future development plans for reference-manager.

For completed features and changes, see [CHANGELOG.md](./CHANGELOG.md).

For detailed specifications, see [spec/](./spec/).

## Completed Phases

- ✅ **Phase 1-5**: Core functionality, CLI commands, Server, Build & Distribution
- ✅ **Phase 6**: Citation Generation (cite command)
- ✅ **Phase 7**: Multi-Format Import (add command with BibTeX, RIS, DOI, PMID support)

See [CHANGELOG.md](./CHANGELOG.md) for details on implemented features.

---

## Current Phase

### Phase 8: Operation Integration

Refactor other commands to use `features/operations/` pattern.

**Reference Implementation**: `features/operations/add.ts` (implemented in Phase 7)

See: [spec/architecture/module-dependencies.md](./spec/architecture/module-dependencies.md) (Integration Functions Pattern)

- [x] Create `features/operations/` for each command
  - [x] `list.ts`: listReferences(library, options)
  - [x] `search.ts`: searchReferences(library, query, options)
  - [x] `remove.ts`: removeReference(library, id, options)
  - [x] `update.ts`: updateReference(library, id, updates, options)
  - [x] `cite.ts`: citeReferences(library, ids, options)
- [ ] Add/update server routes to use operations
- [ ] Simplify CLI commands
  - [ ] Server running → call server API
  - [ ] Server stopped → call operations directly
  - [ ] Output formatting only
- [ ] Simplify `cli/index.ts` to routing only

#### Handoff Notes (Phase 8 operations completed)

**Completed work:**
- All operation modules created in `src/features/operations/`
- Each returns structured result objects (not raw output)
- Output formatting is the operation layer's responsibility
- CLI layer should only handle joining/display

**Key implementation details:**
- `Library.updateById/updateByUuid` added with ID collision handling
  - Options: `{ onIdCollision: "fail" | "suffix" }`
  - Returns: `UpdateResult { updated, idCollision?, idChanged?, newId? }`
- `cite.ts` returns per-identifier results array for partial success handling
- Formatters moved from `cli/output/` to `features/format/`

**Next steps:**
1. Update server routes to call operations instead of CLI logic
2. Simplify CLI commands to use operations directly
3. CLI should only handle output joining (e.g., newline-separated)

---

## Future Phases

### Phase 9: Citation Enhancements

Post-MVP enhancements for citation functionality:

- Clipboard support (`--clipboard`)
- Pandoc cite key generation (`--cite-key`)
- Numbered citation style (`--numbered`)
- Custom sort order (`--sort <field>`)
- Group by field (`--group-by <field>`)
- Interactive style selection
- Citation preview in server mode
- Batch citation generation from file
- LSP integration for text editors

### Phase 10: Advanced Features

Additional features beyond core functionality:

- Full-text PDF management
- Automatic metadata extraction from PDFs
- Citation graph visualization
- Duplicate detection improvements
- Advanced search operators
- Tag management
- Note-taking integration

---

## Contributing

When planning new features:

1. Create specification in `spec/features/`
2. Create ADR if architectural decision is needed in `spec/decisions/`
3. Add task to this ROADMAP
4. Follow TDD process (see `spec/guidelines/testing.md`)
5. Update CHANGELOG.md when complete
