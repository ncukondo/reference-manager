# ROADMAP

This document tracks future development plans for reference-manager.

For completed features and changes, see [CHANGELOG.md](./CHANGELOG.md).

For detailed specifications, see [spec/](./spec/).

## Completed Phases

- ✅ **Phase 1-5**: Core functionality, CLI commands, Server, Build & Distribution
- ✅ **Phase 6**: Citation Generation (cite command)
- ✅ **Phase 7**: Multi-Format Import (add command with BibTeX, RIS, DOI, PMID support)
- ✅ **Phase 8**: Operation Integration (unified operations pattern)
- ✅ **Phase 9**: Server Mode Performance Optimization (ExecutionContext pattern)

See [CHANGELOG.md](./CHANGELOG.md) for details on implemented features.

---

## Current Phase

### Phase 10: Full-text Management

Full-text PDF and Markdown file management. See `spec/features/fulltext.md`.

#### Step 10.1: Schema & Type Updates

- [x] **10.1.1**: Update `CslCustomSchema` in `src/core/csl-json/types.ts`
  - Add `fulltext` field, add `.passthrough()` for unknown fields
  - TDD: Update existing parser tests → verify fail → implement → verify pass
- [x] **10.1.2**: Add fulltext config in `src/config/schema.ts`
  - Add `FulltextConfig`, update `configSchema`/`partialConfigSchema`
  - TDD: Write config tests → verify fail → implement → verify pass
- [x] **10.1.3**: Update `src/config/defaults.ts`
  - Add `getDefaultFulltextDirectory()`, add to `defaultConfig`
  - TDD: Write defaults tests → verify fail → implement → verify pass

#### Step 10.2: Filename Generation

- [x] **10.2.1**: Create `src/features/fulltext/types.ts`
- [x] **10.2.2**: Create `src/features/fulltext/filename.ts`
  - TDD: Write `filename.test.ts` → empty impl → verify fail → implement → verify pass
- [x] **10.2.3**: Create `src/features/fulltext/index.ts`

#### Step 10.3: Fulltext Manager

- [ ] **10.3.1**: Create `src/features/fulltext/manager.ts`
  - `attachFile()`, `getFilePath()`, `detachFile()`, `ensureDirectory()`
  - TDD: Write `manager.test.ts` → empty impl → verify fail → implement → verify pass

#### Step 10.4: CLI Commands

- [ ] **10.4.1**: Create `src/cli/commands/fulltext.ts`
  - `fulltext attach`, `fulltext get`, `fulltext detach` subcommands
  - TDD: Write command tests → empty impl → verify fail → implement → verify pass
- [ ] **10.4.2**: Add stdin support for attach
- [ ] **10.4.3**: Add stdout support for get

#### Step 10.5: Remove Command Integration

- [ ] **10.5.1**: Update `src/cli/commands/remove.ts`
  - Warn if fulltext attached, delete with `--force`
  - TDD: Write tests → verify fail → implement → verify pass

#### Step 10.6: E2E & Documentation

- [ ] **10.6.1**: E2E tests for fulltext workflow
- [ ] **10.6.2**: Update README.md

### Impact on Existing Features

| Feature | Impact |
|---------|--------|
| File monitoring | None (CSL-JSON only) |
| Read/Write | None (passthrough preserves unknown fields) |
| Merge/Conflict | LWW applies to `custom.fulltext` |
| Backup | None (fulltext backup out of scope) |

### Limitations

- Fulltext files not synced across machines (only metadata merged)
- No fulltext backup (user responsibility)
- No full-text search within content

---

## Future Phases

### Phase 11: Citation Enhancements

Post-MVP enhancements for citation functionality:

- Clipboard support (`--clipboard`)
- Pandoc cite key generation (`--cite-key`)
- Custom sort order (`--sort <field>`)
- Group by field (`--group-by <field>`)
- Batch citation generation from file

### Phase 12: Advanced Features

Additional features beyond core functionality:

- Citation graph visualization
- Duplicate detection improvements
- Advanced search operators
- Tag management
- Note-taking integration
- LSP integration for text editors

---

## Contributing

When planning new features:

1. Create specification in `spec/features/`
2. Create ADR if architectural decision is needed in `spec/decisions/`
3. Add task to this ROADMAP
4. Follow TDD process (see `spec/guidelines/testing.md`)
5. Update CHANGELOG.md when complete
