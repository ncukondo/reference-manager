# Task: CslCustomSchema Type Refinement

## Purpose

Add typed optional fields to `CslCustomSchema` for `attachments`, `check`, and `arxiv_id`.
Currently `attachments` and `check` rely on `.passthrough()` and are accessed via `as Record<string, unknown>` casts throughout the codebase. Adding explicit types improves type safety, IDE completion, and schema validation.

## References

- Spec: `spec/features/metadata.md`
- Schema: `src/core/csl-json/types.ts`
- Attachments type: `src/features/attachments/types.ts`
- Check usage: `src/features/operations/check.ts`

## TDD Workflow

For each step, follow the Red-Green-Refactor cycle (see `spec/guidelines/testing.md`):

1. **Write test**: Create test file with comprehensive test cases
2. **Create stub**: Create implementation file with empty functions (`throw new Error("Not implemented")`)
3. **Verify Red**: Run tests, confirm they fail with "Not implemented"
4. **Implement**: Write actual logic until tests pass (Green)
5. **Refactor**: Clean up code while keeping tests green
6. **Quality checks**: Pass lint/typecheck

## Steps

### Step 1: Extend CslCustomSchema with typed fields

Add optional typed fields to `CslCustomSchema` in `src/core/csl-json/types.ts`:

- `arxiv_id: z.string().optional()` — arXiv identifier (e.g. `"2301.13867"`, `"2301.13867v2"`)
- `attachments: AttachmentsSchema.optional()` — attachment metadata (directory + files)
- `check: CheckDataSchema.optional()` — check result data (checked_at, status, findings)

The `AttachmentsSchema` and `CheckDataSchema` should be zod schemas that match the existing TypeScript interfaces (`Attachments`, `AttachmentFile` in `types.ts`, and the shape written by `saveCheckResult`).

**Important**: `.passthrough()` must be retained on `CslCustomSchema` for external tool compatibility.

- [ ] Write test: `src/core/csl-json/types.test.ts` — validate that CslCustomSchema accepts and correctly parses `attachments`, `check`, and `arxiv_id` fields; verify passthrough still works for unknown fields
- [ ] Implement: Add zod schemas and update `CslCustomSchema`
- [ ] Verify Green: `npm run test:unit -- types.test.ts`
- [ ] Lint/Type check: `npm run lint && npm run typecheck`

### Step 2: Remove `as Record<string, unknown>` casts for `check`

Update `src/features/operations/check.ts` to use typed access instead of casts.

Affected lines:
- `(task.item.custom?.check as Record<string, unknown>)?.checked_at as string` → `task.item.custom?.check?.checked_at`
- `const check = item.custom?.check as Record<string, unknown> | undefined` → direct typed access
- `const existingCustom = (item.custom ?? {}) as Record<string, unknown>` → typed spread

- [ ] Write test: verify existing check tests still pass with typed access
- [ ] Implement: update `check.ts` to use typed custom fields
- [ ] Verify Green: `npm run test:unit -- check`
- [ ] Lint/Type check: `npm run lint && npm run typecheck`

### Step 3: Remove untyped access for `attachments`

Update attachment-related code to use typed `custom.attachments` access.

Affected files:
- `src/features/attachments/directory-manager.ts`
- Any other files accessing `custom.attachments` via cast

- [ ] Implement: update to use typed custom fields
- [ ] Verify Green: `npm run test:unit -- attachments`
- [ ] Lint/Type check: `npm run lint && npm run typecheck`

### Step 4: Update metadata spec

Update `spec/features/metadata.md` to document the typed custom fields including `arxiv_id`.

- [ ] Update spec with `arxiv_id`, `attachments`, and `check` field documentation

## Completion Checklist

- [ ] All tests pass (`npm run test`)
- [ ] Lint passes (`npm run lint`)
- [ ] Type check passes (`npm run typecheck`)
- [ ] Build succeeds (`npm run build`)
- [ ] CHANGELOG.md updated
- [ ] Move this file to `spec/tasks/completed/`
