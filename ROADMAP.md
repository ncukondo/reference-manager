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

- [ ] Create `features/operations/` for each command
  - [ ] `list.ts`: listReferences(library, options)
  - [ ] `search.ts`: searchReferences(library, query, options)
  - [ ] `remove.ts`: removeReference(library, id, options)
  - [ ] `update.ts`: updateReference(library, id, updates, options)
  - [ ] `cite.ts`: citeReferences(library, ids, options)
- [ ] Add/update server routes to use operations
- [ ] Simplify CLI commands
  - [ ] Server running → call server API
  - [ ] Server stopped → call operations directly
  - [ ] Output formatting only
- [ ] Simplify `cli/index.ts` to routing only

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
