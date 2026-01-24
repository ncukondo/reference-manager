# Task: Attachments Architecture

## Purpose

Replace the limited fulltext feature with a comprehensive attachments system that supports multiple files per reference, role-based categorization, and manual file management via file manager.

## References

- Spec: `spec/features/attachments.md`
- ADR: `spec/decisions/ADR-013-attachments-architecture.md`
- Data Model: `spec/core/data-model.md`
- Related: `src/features/operations/fulltext/`, `src/utils/opener.ts`

## TDD Workflow

For each step:
1. Write failing test
2. Write minimal implementation to pass
3. Clean up, pass lint/typecheck, verify tests still pass

## E2E Testing Guidelines

**Critical**: E2E tests must verify real user scenarios without mocks.

- **No mocks in E2E**: Test actual file operations, directory creation, metadata updates
- **Root cause analysis**: When a test fails, investigate and fix the actual bug
- **Never adjust expectations to match wrong behavior**: If the result is wrong, fix the implementation
- **Never delete E2E tests because unit tests pass**: Unit tests and E2E tests serve different purposes
- **Never replace real operations with mocks to make tests pass**: This defeats the purpose of E2E testing

**User scenarios to verify in E2E**:
1. Add attachment via CLI → file copied, metadata updated, can be retrieved
2. Open directory → directory created if needed, opened in file manager
3. Manual file addition → sync detects files, updates metadata correctly
4. Detach file → metadata updated, file optionally deleted
5. Fulltext command compatibility → existing workflows still function
6. Interactive mode → naming convention shown, auto-sync after Enter

## Steps

### Step 1: Data Model & Types

Define TypeScript types for the new attachments data model.

- [x] Write test: `src/features/attachments/types.test.ts`
  - Test attachment file interface
  - Test attachments container interface
  - Test role validation (reserved vs custom)
- [x] Implement: `src/features/attachments/types.ts`
  - `AttachmentFile` interface (filename, role, label?)
  - `Attachments` interface (directory, files)
  - `ReservedRole` type and validation
- [x] Verify: `npm run test:unit`
- [x] Lint/Type check: `npm run lint && npm run typecheck`

### Step 2: Directory Name Generation

Generate per-reference directory names.

- [x] Write test: `src/features/attachments/directory.test.ts`
  - Test with PMID: `Smith-2024-PMID12345678-123e4567`
  - Test without PMID: `Smith-2024-123e4567`
  - Test UUID prefix extraction (first 8 chars)
- [x] Implement: `src/features/attachments/directory.ts`
  - `generateDirectoryName(reference: Reference): string`
  - `parseDirectoryName(name: string): { id, pmid?, uuidPrefix }`
- [x] Verify: `npm run test:unit`
- [x] Lint/Type check: `npm run lint && npm run typecheck`

### Step 3: File Name Generation & Parsing

Generate and parse filenames following `{role}[-{label}].{ext}` convention.

- [x] Write test: `src/features/attachments/filename.test.ts`
  - Test generation: `fulltext.pdf`, `supplement-table-s1.xlsx`
  - Test parsing: extract role, label from filename
  - Test label slugification (filesystem-safe)
- [x] Implement: `src/features/attachments/filename.ts`
  - `generateFilename(role, ext, label?): string`
  - `parseFilename(filename): { role, ext, label? }`
  - `slugifyLabel(label): string`
- [x] Verify: `npm run test:unit`
- [x] Lint/Type check: `npm run lint && npm run typecheck`

### Step 4: WSL Detection & Opener Enhancement

Add WSL support to the file opener utility.

- [x] Write test: `src/utils/opener.test.ts`
  - Test WSL detection logic
  - Test opener command selection for WSL
- [x] Implement: `src/utils/opener.ts`
  - `isWSL(): boolean`
  - Update `getOpenerCommand()` to return `wslview` for WSL
- [x] Verify: `npm run test:unit`
- [x] Lint/Type check: `npm run lint && npm run typecheck`

### Step 5: Directory Management

Core directory operations (create, delete, rename, open).

- [x] Write test: `src/features/attachments/directory-manager.test.ts`
  - Test directory creation
  - Test directory deletion (when empty)
  - Test directory rename (on id/PMID change)
  - Test getDirectoryPath
- [x] Implement: `src/features/attachments/directory-manager.ts`
  - `ensureDirectory(reference): Promise<string>`
  - `deleteDirectoryIfEmpty(reference): Promise<void>`
  - `renameDirectory(oldRef, newRef): Promise<void>`
  - `getDirectoryPath(reference): string`
- [x] Verify: `npm run test:unit`
- [x] Lint/Type check: `npm run lint && npm run typecheck`

### Step 6: Attachment Operations - Add

Add file to reference attachments.

- [x] Write test: `src/features/operations/attachments/add.test.ts`
  - Test copy file to directory
  - Test move file option
  - Test metadata update
  - Test fulltext role constraint (max 2 files)
  - Test overwrite with --force
- [x] Implement: `src/features/operations/attachments/add.ts`
  - `addAttachment(library, refId, filePath, options): Promise<AddResult>`
- [x] Verify: `npm run test:unit`
- [x] Lint/Type check: `npm run lint && npm run typecheck`

### Step 7: Attachment Operations - List & Get

List and retrieve attachments.

- [ ] Write test: `src/features/operations/attachments/list.test.ts`
  - Test list all attachments
  - Test filter by role
- [ ] Write test: `src/features/operations/attachments/get.test.ts`
  - Test get file path
  - Test get file content (stdout)
- [ ] Implement: `src/features/operations/attachments/list.ts`
- [ ] Implement: `src/features/operations/attachments/get.ts`
- [ ] Verify: `npm run test:unit`
- [ ] Lint/Type check: `npm run lint && npm run typecheck`

### Step 8: Attachment Operations - Detach

Remove file from reference attachments.

- [ ] Write test: `src/features/operations/attachments/detach.test.ts`
  - Test remove from metadata only
  - Test delete file with --delete
  - Test remove all files of role with --all
  - Test directory cleanup when last file removed
- [ ] Implement: `src/features/operations/attachments/detach.ts`
  - `detachAttachment(library, refId, filename, options): Promise<DetachResult>`
- [ ] Verify: `npm run test:unit`
- [ ] Lint/Type check: `npm run lint && npm run typecheck`

### Step 9: Attachment Operations - Sync

Synchronize metadata with files on disk.

- [ ] Write test: `src/features/operations/attachments/sync.test.ts`
  - Test detect new files
  - Test infer role from filename
  - Test detect missing files
  - Test apply changes with --yes
  - Test remove missing with --fix
- [ ] Implement: `src/features/operations/attachments/sync.ts`
  - `syncAttachments(library, refId, options): Promise<SyncResult>`
- [ ] Verify: `npm run test:unit`
- [ ] Lint/Type check: `npm run lint && npm run typecheck`

### Step 10: Attachment Operations - Open

Open directory or file with system application.

- [ ] Write test: `src/features/operations/attachments/open.test.ts`
  - Test open directory
  - Test open specific file
  - Test open by role
  - Test create directory if not exists
  - Test print path option
- [ ] Implement: `src/features/operations/attachments/open.ts`
  - `openAttachment(library, refId, options): Promise<OpenResult>`
- [ ] Verify: `npm run test:unit`
- [ ] Lint/Type check: `npm run lint && npm run typecheck`

### Step 11: CLI - attach Command

Implement `attach` command with subcommands.

- [ ] Write test: `src/cli/commands/attach.test.ts`
  - Test open subcommand (directory, file, role, print)
  - Test add subcommand
  - Test list subcommand
  - Test get subcommand
  - Test detach subcommand
  - Test sync subcommand
- [ ] Implement: `src/cli/commands/attach.ts`
  - Subcommands: open, add, list, get, detach, sync
- [ ] Verify: `npm run test:unit`
- [ ] Lint/Type check: `npm run lint && npm run typecheck`

### Step 12: CLI - Interactive Mode for attach open

Implement TTY interactive mode for `attach open`.

- [ ] Write test: `src/cli/commands/attach.test.ts`
  - Test TTY mode shows convention and waits for Enter
  - Test non-TTY mode opens only
  - Test --no-sync skips interactive sync
- [ ] Implement: `src/cli/commands/attach.ts`
  - Display naming convention
  - Wait for keypress
  - Auto-sync on Enter
- [ ] Verify: `npm run test:unit`
- [ ] Lint/Type check: `npm run lint && npm run typecheck`

### Step 13: Migrate fulltext Command

Update `fulltext` command to use attachments backend.

- [ ] Write test: `src/cli/commands/fulltext.test.ts`
  - Ensure existing tests still pass
  - Test fulltext uses attachments storage
- [ ] Implement: Update `src/cli/commands/fulltext.ts`
  - Use `addAttachment` with `role: 'fulltext'`
  - Use `openAttachment` for open
  - Use `detachAttachment` for detach
  - Update get to use new paths
- [ ] Verify: `npm run test:unit`
- [ ] Lint/Type check: `npm run lint && npm run typecheck`

### Step 14: ILibraryOperations Integration

Add attachment operations to ILibraryOperations interface.

- [ ] Write test: Update `src/features/operations/library-operations.test.ts`
- [ ] Implement: Update `src/features/operations/library-operations.ts`
  - Add attachment methods to interface
  - Implement in OperationsLibrary
- [ ] Implement: Update `src/cli/server-client.ts`
  - Add HTTP endpoints for attachments
- [ ] Verify: `npm run test:unit`
- [ ] Lint/Type check: `npm run lint && npm run typecheck`

### Step 15: Configuration

Add attachments configuration.

- [ ] Write test: `src/features/config/schema.test.ts`
  - Test attachments.directory config key
- [ ] Implement: Update config schema
  - `[attachments]` section
  - `directory` key with platform-specific default
- [ ] Verify: `npm run test:unit`
- [ ] Lint/Type check: `npm run lint && npm run typecheck`

### Step 16: E2E Tests - Core Workflows

End-to-end tests for core attachment operations. **No mocks allowed.**

- [ ] Write test: `src/cli/attach.e2e.test.ts`
  - **Scenario: Add and retrieve attachment**
    1. Create library with reference
    2. Run `ref attach add <id> file.pdf --role supplement`
    3. Verify file exists in correct directory
    4. Run `ref attach list <id>`
    5. Verify output shows the attachment
    6. Run `ref attach get <id> supplement-file.pdf`
    7. Verify correct path returned
  - **Scenario: Detach with file deletion**
    1. Add attachment
    2. Run `ref attach detach <id> <filename> --delete`
    3. Verify file removed from disk
    4. Verify metadata updated
  - **Scenario: Directory lifecycle**
    1. Verify no directory exists initially
    2. Add first attachment → directory created
    3. Detach last attachment with --delete → directory removed
- [ ] Verify: `npm run test:e2e`

### Step 17: E2E Tests - Sync Workflow

End-to-end tests for manual file addition. **No mocks allowed.**

- [ ] Write test: `src/cli/attach.e2e.test.ts`
  - **Scenario: Manual file addition and sync**
    1. Run `ref attach open <id> --no-sync` to create directory
    2. Copy files directly to directory (simulating user drag-drop)
    3. Run `ref attach sync <id>` (dry-run)
    4. Verify correct files detected with inferred roles
    5. Run `ref attach sync <id> --yes`
    6. Verify metadata updated
    7. Run `ref attach list <id>`
    8. Verify all files listed
  - **Scenario: Missing file detection**
    1. Add attachment via CLI
    2. Delete file directly from filesystem
    3. Run `ref attach sync <id>`
    4. Verify missing file reported
    5. Run `ref attach sync <id> --fix`
    6. Verify metadata cleaned up
- [ ] Verify: `npm run test:e2e`

### Step 18: E2E Tests - Fulltext Compatibility

End-to-end tests for fulltext command migration. **No mocks allowed.**

- [ ] Write test: `src/cli/fulltext.e2e.test.ts` (update existing)
  - **Scenario: Fulltext uses new storage**
    1. Run `ref fulltext attach <id> paper.pdf`
    2. Verify file in new directory structure
    3. Run `ref fulltext open <id>` (verify path resolution)
    4. Run `ref fulltext get <id> --pdf`
    5. Verify correct path returned
    6. Run `ref attach list <id>`
    7. Verify fulltext appears with role=fulltext
  - **Scenario: Mixed attachments**
    1. Add fulltext via `ref fulltext attach`
    2. Add supplement via `ref attach add --role supplement`
    3. Verify both in same directory
    4. Verify both listed correctly
- [ ] Verify: `npm run test:e2e`

### Step 19: Shell Completion

Add completion for attach command.

- [ ] Write test: `src/cli/completion.test.ts`
  - Test attach subcommand completion
  - Test role completion for --role option
- [ ] Implement: Update `src/cli/completion.ts`
- [ ] Verify: `npm run test:unit`
- [ ] Lint/Type check: `npm run lint && npm run typecheck`

### Step 20: Documentation

Update documentation and examples.

- [ ] Update README.md with attach command examples
- [ ] Update README_ja.md
- [ ] Verify examples work by running them

## Completion Checklist

- [ ] All unit tests pass (`npm run test:unit`)
- [ ] All E2E tests pass (`npm run test:e2e`)
- [ ] Lint passes (`npm run lint`)
- [ ] Type check passes (`npm run typecheck`)
- [ ] Build succeeds (`npm run build`)
- [ ] Manual verification (actual commands, not mocked)
  - [ ] `ref attach add <id> file.pdf --role supplement` copies file correctly
  - [ ] `ref attach open <id>` creates directory and opens in file manager
  - [ ] Manual file addition + `ref attach sync <id> --yes` works
  - [ ] `ref attach detach <id> <file> --delete` removes file
  - [ ] `ref fulltext attach/open/get/detach` still works
  - [ ] WSL: `wslview` opens files/directories (if applicable)
  - [ ] Interactive mode shows naming convention and auto-syncs
- [ ] CHANGELOG.md updated
- [ ] Move this file to `spec/tasks/completed/`
