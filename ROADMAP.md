# ROADMAP

This document tracks future development plans for reference-manager.

For completed features and changes, see [CHANGELOG.md](./CHANGELOG.md).

For detailed specifications, see [spec/](./spec/).

## Completed Phases

- ✅ **Phase 1-5**: Core functionality, CLI commands, Server, Build & Distribution
- ✅ **Phase 6**: Citation Generation (cite command)
- ✅ **Phase 7**: Multi-Format Import (add command with BibTeX, RIS, DOI, PMID support)
- ✅ **Phase 8**: Operation Integration (unified operations pattern)

See [CHANGELOG.md](./CHANGELOG.md) for details on implemented features.

---

## Current Phase

### Phase 9: Server Mode Performance Optimization

**Goal**: Eliminate redundant library loading in server mode to realize performance benefits.

**Problem**: Currently, all CLI action handlers load the library before executing commands, even when using server mode. Since the server already holds the library in memory, this defeats the purpose of server mode.

**Solution**: Introduce discriminated union type `ExecutionContext` to clearly distinguish between server and local execution modes.

#### Step 9.1: Define ExecutionContext Type

Create `src/cli/execution-context.ts`:

```typescript
export type ExecutionContext =
  | { type: "server"; client: ServerClient }
  | { type: "local"; library: Library };
```

- [x] Create `ExecutionContext` type definition
- [x] Add helper function `createExecutionContext(config)` that:
  - Checks for server connection first
  - Returns `{ type: "server", client }` if server available
  - Otherwise loads library and returns `{ type: "local", library }`
- [x] Export from `cli/index.ts` or dedicated module

#### Step 9.2: Update Execute Functions

Update all `executeXxx` functions to use `ExecutionContext`:

**Before:**
```typescript
executeList(options, library, serverClient)
```

**After:**
```typescript
executeList(options, context: ExecutionContext)
```

| Command | File | Status |
|---------|------|--------|
| list | `cli/commands/list.ts` | [ ] |
| search | `cli/commands/search.ts` | [ ] |
| add | `cli/commands/add.ts` | [ ] |
| remove | `cli/commands/remove.ts` | [ ] |
| update | `cli/commands/update.ts` | [ ] |
| cite | `cli/commands/cite.ts` | [ ] |

Each function:
- [ ] Update signature to accept `ExecutionContext`
- [ ] Use discriminated union pattern: `if (context.type === "server") { ... }`
- [ ] Update tests

#### Step 9.3: Update CLI Action Handlers

Update `cli/index.ts` action handlers:

**Before:**
```typescript
const server = await getServerConnection(config.library, config);
const serverClient = server ? new ServerClient(server.baseUrl) : undefined;
const library = await Library.load(config.library);  // Always loads!
```

**After:**
```typescript
const context = await createExecutionContext(config);
const result = await executeList(options, context);
```

- [ ] `handleListAction`
- [ ] `handleSearchAction`
- [ ] `handleAddAction`
- [ ] `handleRemoveAction`
- [ ] `handleUpdateAction`
- [ ] `handleCiteAction`

#### Step 9.4: Server API Refactoring for Single Item Lookup

`handleRemoveAction` requires fetching a single reference for confirmation display.
Currently uses `client.getAll()` which is inefficient.

**Route Naming Convention Update:**

Rename existing routes for clarity and add ID-based lookup:

| Before | After | Description |
|--------|-------|-------------|
| `GET /:uuid` | `GET /uuid/:uuid` | Get by UUID |
| `PUT /:uuid` | `PUT /uuid/:uuid` | Update by UUID |
| `DELETE /:uuid` | `DELETE /uuid/:uuid` | Remove by UUID |
| (new) | `GET /id/:id` | Get by citation ID |

Server routes (`server/routes/references.ts`):
- [ ] Rename `GET /:uuid` → `GET /uuid/:uuid`
- [ ] Rename `PUT /:uuid` → `PUT /uuid/:uuid`
- [ ] Rename `DELETE /:uuid` → `DELETE /uuid/:uuid`
- [ ] Add `GET /id/:id` route

ServerClient updates (`cli/server-client.ts`):
- [ ] Update `findByUuid()` URL: `/api/references/uuid/${uuid}`
- [ ] Update `update()` URL: `/api/references/uuid/${uuid}`
- [ ] Update `remove()` URL: `/api/references/uuid/${uuid}`
- [ ] Add `findById(id: string): Promise<CslItem | null>`

CLI updates:
- [ ] Update `findReferenceToRemove()` to use `findByUuid()` / `findById()`

#### Step 9.5: Tests and Validation

- [ ] Update existing unit tests for new signatures
- [ ] Add tests verifying library is NOT loaded in server mode
- [ ] Performance test: Measure CLI startup time with/without server
- [ ] E2E tests for both modes

#### Step 9.6: Documentation

- [ ] Update spec/architecture/module-dependencies.md
- [ ] Add inline documentation for ExecutionContext
- [ ] Commit and update CHANGELOG

#### Architecture (Updated)

```
cli/index.ts
  handleXxxAction()
    → createExecutionContext(config)
      → server available? { type: "server", client }
      → otherwise:        { type: "local", library }
    → executeXxx(options, context)

cli/commands/xxx.ts
  executeXxx(options, context)
    → context.type === "server" ? client.xxx() : localOperation()
```

## Future Phases

### Phase 10: Full-text PDF Management

- PDF file attachment and storage
- Automatic metadata extraction from PDFs
- Full-text search in attached PDFs
- PDF viewer integration

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
