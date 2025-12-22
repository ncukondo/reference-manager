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

#### Step 9.2: Update Commands to Use ExecutionContext (Part 1)

Update each command's `executeXxx` function and corresponding `handleXxxAction` together, testing after each command.

**Note:** `remove` and `update` commands depend on Step 9.3 (Server API refactoring) because they use `serverClient.getAll()` to find references by ID. These will be updated in Step 9.4.

**Execute function change:**
```typescript
// Before:
executeList(options, library, serverClient)

// After:
executeList(options, context: ExecutionContext)
```

**Action handler change:**
```typescript
// Before:
const server = await getServerConnection(config.library, config);
const serverClient = server ? new ServerClient(server.baseUrl) : undefined;
const library = await Library.load(config.library);  // Always loads!

// After:
const context = await createExecutionContext(config);
const result = await executeList(options, context);
```

| Command | Execute Function | Action Handler | Tests | Status |
|---------|------------------|----------------|-------|--------|
| list | `executeList` | `handleListAction` | `list.test.ts` | [x] |
| search | `executeSearch` | `handleSearchAction` | `search.test.ts` | [x] |
| add | `executeAdd` | `handleAddAction` | `add.test.ts` | [x] |
| cite | `executeCite` | `handleCiteAction` | `cite.test.ts` | [x] |

For each command:
1. Update `executeXxx` signature to accept `ExecutionContext`
2. Use discriminated union pattern: `if (context.type === "server") { ... }`
3. Update `handleXxxAction` to use `createExecutionContext()`
4. Update tests
5. Run tests to verify

#### Step 9.3: Server API Refactoring with byUuid Option

**Problem:** Currently `executeRemove`/`executeUpdate` use `client.getAll()` to find references by ID, which is inefficient.

**Solution:** Add `byUuid` option to ServerClient methods, allowing direct ID or UUID lookup.

**Route Updates** (`server/routes/references.ts`):

Add ID-based routes alongside existing UUID routes:

| Route | Description |
|-------|-------------|
| `GET /uuid/:uuid` | Get by UUID (rename from `/:uuid`) |
| `PUT /uuid/:uuid` | Update by UUID (rename from `/:uuid`) |
| `DELETE /uuid/:uuid` | Remove by UUID (rename from `/:uuid`) |
| `GET /id/:id` | Get by citation ID (new) |
| `PUT /id/:id` | Update by citation ID (new) |
| `DELETE /id/:id` | Remove by citation ID (new) |

Tasks:
- [ ] Rename existing routes: `/:uuid` → `/uuid/:uuid`
- [ ] Add new routes: `/id/:id` for GET, PUT, DELETE

**ServerClient Updates** (`cli/server-client.ts`):

Add `byUuid` option to methods:

```typescript
// Before:
remove(uuid: string): Promise<RemoveResult>
update(uuid: string, updates): Promise<UpdateResult>

// After:
remove(identifier: string, options?: { byUuid?: boolean }): Promise<RemoveResult>
update(identifier: string, updates, options?: { byUuid?: boolean }): Promise<UpdateResult>
findByUuid(uuid: string) → find(identifier: string, options?: { byUuid?: boolean })
```

Internal URL routing:
```typescript
const path = options?.byUuid
  ? `/api/references/uuid/${identifier}`
  : `/api/references/id/${identifier}`;
```

Tasks:
- [ ] Update `remove()` to accept `{ byUuid?: boolean }` option
- [ ] Update `update()` to accept `{ byUuid?: boolean }` option
- [ ] Rename `findByUuid()` → `find()` with `{ byUuid?: boolean }` option
- [ ] Update tests

**CLI Updates**:
- [ ] Update `findReferenceToRemove()` to use new `find()` method

#### Step 9.4: Update Commands to Use ExecutionContext (Part 2)

Update `remove` and `update` commands using the new ServerClient API.

| Command | Execute Function | Action Handler | Tests | Status |
|---------|------------------|----------------|-------|--------|
| remove | `executeRemove` | `handleRemoveAction` | `remove.test.ts` | [ ] |
| update | `executeUpdate` | `handleUpdateAction` | `update.test.ts` | [ ] |

**Simplified implementation with byUuid option:**

```typescript
// Before (complex):
if (serverClient) {
  if (byUuid) {
    return serverClient.remove(identifier);
  }
  const items = await serverClient.getAll();  // Inefficient!
  const found = items.find((item) => item.id === identifier);
  return serverClient.remove(found.custom.uuid);
}

// After (simple):
if (context.type === "server") {
  return context.client.remove(identifier, { byUuid });
}
```

For each command:
1. Update signature to accept `ExecutionContext`
2. Simplify server mode to use `client.remove/update(identifier, { byUuid })`
3. Update `handleXxxAction` to use `createExecutionContext()`
4. Update tests
5. Run tests to verify

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
