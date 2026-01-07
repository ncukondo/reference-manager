# Task: Fulltext Open Command

## Purpose

Add `fulltext open` subcommand to open PDF/Markdown files with the system's default application, enabling quick access to attached full-text files from the command line.

## References

- Spec: `spec/features/fulltext.md` (section: `fulltext open`)
- CLI: `src/cli/commands/fulltext.ts`
- Tests: `src/cli/commands/fulltext.test.ts`, `src/cli/fulltext.e2e.test.ts`

## TDD Workflow

For each step:
1. Write failing test
2. Write minimal implementation to pass
3. Clean up, pass lint/typecheck, verify tests still pass

## Steps

### Step 1: Platform Opener Utility

Create utility function to open files with system default application.

- [x] Write test: `src/utils/opener.test.ts`
  - Test command selection by platform (darwin/linux/win32)
  - Test spawn arguments construction
- [x] Implement: `src/utils/opener.ts`
  - `getOpenerCommand(platform: string): string[]`
  - `openWithSystemApp(filePath: string): Promise<void>`
- [x] Verify: `npm run test:unit`
- [x] Lint/Type check: `npm run lint && npm run typecheck`

### Step 2: Open Subcommand - Basic Implementation

Add basic `open` subcommand to fulltext command.

- [x] Write test: `src/cli/commands/fulltext.test.ts`
  - Test with `--pdf` option
  - Test with `--markdown` option
  - Test priority (PDF over Markdown when both exist)
- [x] Implement: `src/cli/commands/fulltext.ts`
  - Add `open` subcommand with `--pdf` and `--markdown` options
  - Resolve file path from reference metadata
  - Call opener utility
- [x] Verify: `npm run test:unit`
- [x] Lint/Type check: `npm run lint && npm run typecheck`

### Step 3: Stdin Support for Pipeline Usage

Add stdin support for non-tty environments.

- [ ] Write test: `src/cli/commands/fulltext.test.ts`
  - Test reading ref-id from stdin when no argument and non-tty
  - Test error when no argument and tty
- [ ] Implement: `src/cli/commands/fulltext.ts`
  - Check `process.stdin.isTTY`
  - Read from stdin if non-tty and no argument
- [ ] Verify: `npm run test:unit`
- [ ] Lint/Type check: `npm run lint && npm run typecheck`

### Step 4: Error Handling

Implement descriptive error messages for various failure scenarios.

- [ ] Write test: `src/cli/commands/fulltext.test.ts`
  - Reference not found
  - No fulltext attached
  - Specified format not attached
  - File missing on disk (metadata exists but file gone)
- [ ] Implement: `src/cli/commands/fulltext.ts`
  - Add specific error messages for each scenario
  - Check file existence before opening
- [ ] Verify: `npm run test:unit`
- [ ] Lint/Type check: `npm run lint && npm run typecheck`

### Step 5: E2E Tests

Add end-to-end tests for the complete workflow.

- [ ] Write test: `src/cli/fulltext.e2e.test.ts`
  - Test open command with attached PDF
  - Test open command with attached Markdown
  - Test pipeline usage (echo id | fulltext open)
  - Test error scenarios
- [ ] Verify: `npm run test:e2e`
- [ ] Lint/Type check: `npm run lint && npm run typecheck`

### Step 6: Shell Completion Support

Add completion for `fulltext open` subcommand.

- [ ] Update: `src/cli/completion.ts` (if needed)
  - Add `open` to fulltext subcommands
  - Add `--pdf` and `--markdown` options
- [ ] Verify: `npm run test:unit`
- [ ] Lint/Type check: `npm run lint && npm run typecheck`

## Completion Checklist

- [ ] All tests pass (`npm run test`)
- [ ] Lint passes (`npm run lint`)
- [ ] Type check passes (`npm run typecheck`)
- [ ] Build succeeds (`npm run build`)
- [ ] Manual verification
  - [ ] `reference-manager fulltext open <ref-id>` opens PDF
  - [ ] `reference-manager fulltext open <ref-id> --markdown` opens Markdown
  - [ ] `echo <ref-id> | reference-manager fulltext open` works
  - [ ] Error messages are descriptive
- [ ] CHANGELOG.md updated
- [ ] Move this file to `spec/tasks/completed/`
