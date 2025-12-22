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

Refactor all commands to use unified `features/operations/` pattern.

**Reference Implementation**: `cli/commands/add.ts` + `features/operations/add.ts` + `server/routes/add.ts`

See: [spec/architecture/module-dependencies.md](./spec/architecture/module-dependencies.md)

#### Step 8.1: Operations Layer (DONE)

- [x] `features/operations/list.ts`
- [x] `features/operations/search.ts`
- [x] `features/operations/remove.ts`
- [x] `features/operations/update.ts`
- [x] `features/operations/cite.ts`

#### Step 8.2: Server Routes (DONE)

Create dedicated routes using operations (pattern: `/api/{command}`):

| Route | File | Status |
|-------|------|--------|
| POST /api/list | `server/routes/list.ts` | [x] Done |
| POST /api/search | `server/routes/search.ts` | [x] Done |
| POST /api/cite | `server/routes/cite.ts` | [x] Done |
| PUT/DELETE /api/references/:uuid | `server/routes/references.ts` | [x] Done |

Tasks:
- [x] Create `server/routes/list.ts` using listReferences operation
- [x] Create `server/routes/search.ts` using searchReferences operation
- [x] Mount routes in `server/index.ts`

#### Step 8.3: ServerClient Methods (DONE)

Add methods to `cli/server-client.ts`:

| Method | Status |
|--------|--------|
| `list(options)` | [x] Done |
| `search(options)` | [x] Done |
| `cite(options)` | [x] Done |

#### Step 8.4: CLI Commands Pattern Update (DONE)

Update each command to follow unified pattern:
- `executeXxx(options, library, serverClient)` - routes to server or direct
  - **Must use `serverClient.xxx()` methods** (not `serverClient.getAll()`)
- `formatXxxOutput(result)` - formats for CLI output
- Remove deprecated functions

Reference: `add.ts` uses `serverClient.addFromInputs()`, `cite.ts` uses `serverClient.cite()`

| Command | executeXxx | formatOutput | deprecated removed | Notes |
|---------|------------|--------------|-------------------|-------|
| list | [x] | [x] | [ ] | ✅ Uses `serverClient.list()` |
| search | [x] | [x] | [ ] | ✅ Uses `serverClient.search()` |
| cite | [x] | [x] | [ ] | ✅ Uses `serverClient.cite()` |
| remove | [x] | [x] | [x] | ✅ Uses `serverClient.remove()` |
| update | [x] | [x] | [x] | ✅ Uses `serverClient.update()` |

#### Step 8.5: cli/index.ts Simplification (DONE)

Extract action handlers for each command:

- [x] handleListAction → executeList + formatListOutput
- [x] handleSearchAction → executeSearch + formatSearchOutput
- [x] handleCiteAction → executeCite + formatCiteOutput
- [x] handleRemoveAction → executeRemove + formatRemoveOutput
- [x] handleUpdateAction → executeUpdate + formatUpdateOutput

#### Step 8.6: Cleanup and Commit

- [ ] Remove deprecated functions from cli/commands/*.ts
- [ ] Update cli/commands/index.ts exports
- [ ] Run tests and verify all pass
- [ ] Commit Phase 8 changes

#### Architecture Pattern

```
cli/index.ts           → registerXxxCommand() → routing only
                         handleXxxAction()    → load config, get connection
cli/commands/xxx.ts    → executeXxx()         → server API or operations
cli/server-client.ts   → serverClient.xxx()   → HTTP call to server
server/routes/xxx.ts   → POST /api/xxx        → call operation, return JSON
features/operations/   → xxxOperation()       → library + save + format
```

#### Handoff Notes

- `Library.updateById/updateByUuid` with ID collision handling
- `cite.ts` returns per-identifier results for partial success
- Formatters in `features/format/`

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
