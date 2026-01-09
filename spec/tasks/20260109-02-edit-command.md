# Task: Edit Command

## Purpose

Add `edit` command to open references in external editor for interactive editing. Supports YAML (default) and JSON formats with protected fields shown as comments.

## References

- Spec: `spec/features/edit.md`
- Related: `src/cli/`, `src/features/`

## TDD Workflow

For each step:
1. Write failing test
2. Write minimal implementation to pass
3. Clean up, pass lint/typecheck, verify tests still pass

## Steps

### Step 1: Add js-yaml dependency

- [x] Install: `npm install js-yaml && npm install -D @types/js-yaml`
- [x] Verify types are available

### Step 2: Editor resolution utility

- [x] Write test: `src/features/edit/editor-resolver.test.ts`
  - Test `$VISUAL` takes precedence
  - Test `$EDITOR` fallback
  - Test platform-specific fallback (vi/notepad)
- [x] Implement: `src/features/edit/editor-resolver.ts`
- [x] Verify: `npm run test:unit`
- [x] Lint/Type check: `npm run lint && npm run typecheck`

### Step 3: Field transformers (date, keyword)

- [x] Write test: `src/features/edit/field-transformer.test.ts`
  - Test date-parts to ISO string (`[[2024, 3, 15]]` → `"2024-03-15"`)
  - Test partial dates (`[[2024]]` → `"2024"`, `[[2024, 3]]` → `"2024-03"`)
  - Test ISO string to date-parts (reverse)
  - Test keyword array passthrough (internal already array)
- [x] Implement: `src/features/edit/field-transformer.ts`
- [x] Verify: `npm run test:unit`
- [x] Lint/Type check: `npm run lint && npm run typecheck`

### Step 4: YAML serializer with protected fields as comments

- [x] Write test: `src/features/edit/yaml-serializer.test.ts`
  - Test single reference serialization
  - Test multiple references serialization
  - Test protected fields as YAML comments
  - Test field transformations (date, keyword)
  - Test special characters and multi-line text
- [x] Implement: `src/features/edit/yaml-serializer.ts`
- [x] Verify: `npm run test:unit`
- [x] Lint/Type check: `npm run lint && npm run typecheck`

### Step 5: YAML deserializer with UUID extraction from comments

- [x] Write test: `src/features/edit/yaml-deserializer.test.ts`
  - Test parsing valid YAML
  - Test extracting UUID from comment block
  - Test handling modified protected fields (ignore)
  - Test reverse field transformations (ISO → date-parts)
  - Test error handling for invalid YAML
- [x] Implement: `src/features/edit/yaml-deserializer.ts`
- [x] Verify: `npm run test:unit`
- [x] Lint/Type check: `npm run lint && npm run typecheck`

### Step 6: JSON serializer/deserializer with _protected field

- [x] Write test: `src/features/edit/json-serializer.test.ts`
  - Test serialization with `_protected` nested object
  - Test field transformations (date, keyword)
  - Test deserialization ignoring `_protected`
- [x] Implement: `src/features/edit/json-serializer.ts`
- [x] Verify: `npm run test:unit`
- [x] Lint/Type check: `npm run lint && npm run typecheck`

### Step 7: Edit session manager

- [x] Write test: `src/features/edit/edit-session.test.ts`
  - Test temp file creation and cleanup
  - Test editor invocation (mock)
  - Test validation workflow
  - Test error recovery flow
- [x] Implement: `src/features/edit/edit-session.ts`
- [x] Verify: `npm run test:unit`
- [x] Lint/Type check: `npm run lint && npm run typecheck`

### Step 8: Edit feature entry point

- [x] Write test: `src/features/edit/index.test.ts`
  - Test full edit flow (mock editor)
  - Test multiple references
  - Test format option
- [x] Implement: `src/features/edit/index.ts`
- [x] Verify: `npm run test:unit`
- [x] Lint/Type check: `npm run lint && npm run typecheck`

### Step 9: CLI command integration

- [ ] Write test: `src/cli/commands/edit.test.ts`
  - Test command parsing
  - Test identifier resolution
  - Test --uuid flag
  - Test --format option
  - Test TTY requirement
- [ ] Implement: `src/cli/commands/edit.ts`
- [ ] Register in `src/cli/index.ts`
- [ ] Verify: `npm run test:unit`
- [ ] Lint/Type check: `npm run lint && npm run typecheck`

### Step 10: Configuration support

- [ ] Add `[cli.edit]` section to config schema
- [ ] Add `default_format` option
- [ ] Update config documentation

### Step 11: E2E tests

- [ ] Write E2E test: `e2e/edit.test.ts`
  - Test basic edit flow with mock editor
  - Test validation error recovery
  - Test multiple references
- [ ] Verify: `npm run test:e2e`

## Completion Checklist

- [ ] All tests pass (`npm run test`)
- [ ] Lint passes (`npm run lint`)
- [ ] Type check passes (`npm run typecheck`)
- [ ] Build succeeds (`npm run build`)
- [ ] Manual verification with real editor
- [ ] CHANGELOG.md updated
- [ ] Move this file to `spec/tasks/completed/`
