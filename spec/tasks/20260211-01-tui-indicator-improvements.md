# Task: TUI Indicator & Meta Line Improvements

## Purpose

Improve TUI resource indicators and meta line display:

1. **Fix**: Resource indicators not shown in `ref fulltext get` (and other interactive selection TUIs)
2. **Improve**: Replace emoji indicators with dim-compatible text labels for subtler appearance
3. **Improve**: Show journal/publisher name instead of item type in meta line
4. **Refactor**: Unify duplicated `toChoice` and helper functions into a shared module

## References

- Spec: `spec/features/resource-indicators.md`
- Related: `src/features/interactive/apps/runSearchFlow.ts`
- Related: `src/features/interactive/search-prompt.ts`
- Related: `src/features/format/resource-indicators.ts`

## TDD Workflow

For each step, follow the Red-Green-Refactor cycle (see `spec/guidelines/testing.md`):

1. **Write test**: Create test file with comprehensive test cases
2. **Create stub**: Create implementation file with empty functions (`throw new Error("Not implemented")`)
3. **Verify Red**: Run tests, confirm they fail with "Not implemented"
4. **Implement**: Write actual logic until tests pass (Green)
5. **Refactor**: Clean up code while keeping tests green
6. **Quality checks**: Pass lint/typecheck

## Steps

### Step 1: Replace emoji indicators with text labels

Update `buildResourceIndicators()` to return text labels instead of emoji.

| Before | After |
|--------|-------|
| `📄` | `pdf` |
| `📝` | `md` |
| `📎` | `file` |
| `🔗` | `url` |
| `🏷` | `tag` |

Join separator changes from `""` to `" "` (space-separated).

- [ ] Update test: `src/features/format/resource-indicators.test.ts`
  - `"📄"` → `"pdf"`, `"📝"` → `"md"`, `"📎"` → `"file"`, etc.
  - `"📄📝📎🔗🏷"` → `"pdf md file url tag"`
  - `"📄📎"` → `"pdf file"`, etc.
- [ ] Implement: Update `buildResourceIndicators()` in `src/features/format/resource-indicators.ts`
- [ ] Verify Green: `npm run test:unit -- resource-indicators.test.ts`
- [ ] Lint/Type check: `npm run lint && npm run typecheck`

### Step 2: Add `formatSource` function

Create a new function that returns the source name (journal, publisher, or type) for the meta line.

Fallback order:
1. `container-title-short` (abbreviated journal name)
2. `container-title` (full journal name / book title for chapters)
3. Type-specific fallback:
   - `book` → `publisher`
   - All others → formatted type name (e.g., `Thesis`, `Report`)

- [ ] Write test: `src/features/interactive/choice-builder.test.ts`
  - Article with `container-title-short` → returns short name (e.g., `"J Med Inform"`)
  - Article with `container-title` only → returns full name (e.g., `"Journal of Medical Informatics"`)
  - Article with neither → returns `"Journal article"`
  - Book with `publisher` → returns publisher (e.g., `"Cambridge University Press"`)
  - Book with neither → returns `"Book"`
  - Chapter with `container-title` → returns book name
  - Thesis with no container → returns `"Thesis"`
- [ ] Implement: `formatSource(item: CslItem): string` in `src/features/interactive/choice-builder.ts`
- [ ] Verify Green: `npm run test:unit -- choice-builder.test.ts`
- [ ] Lint/Type check: `npm run lint && npm run typecheck`

### Step 3: Create shared `choice-builder.ts` module

Extract duplicated functions from `runSearchFlow.ts` and `search-prompt.ts` into `src/features/interactive/choice-builder.ts`.

Functions to extract (identical in both files):
- `toChoice(item: CslItem): Choice<CslItem>` — builds Choice object with indicators and new `formatSource`
- `extractYear(item: CslItem): number | undefined`
- `extractUpdatedDate(item: CslItem): Date | undefined`
- `extractCreatedDate(item: CslItem): Date | undefined`
- `extractPublishedDate(item: CslItem): Date | undefined`
- `formatIdentifiers(item: CslItem): string`
- `formatType(type: string): string` — kept for `formatSource` fallback

- [ ] Write test: `src/features/interactive/choice-builder.test.ts` (extend from Step 2)
  - `toChoice` with indicators → meta starts with `"pdf url tag · "` etc.
  - `toChoice` without indicators → meta starts with year
  - `toChoice` with `container-title-short` → meta uses short journal name
  - `toChoice` for book with publisher → meta uses publisher name
- [ ] Create module: `src/features/interactive/choice-builder.ts`
  - Move and export: `toChoice`, `extractYear`, `extractUpdatedDate`, `extractCreatedDate`, `extractPublishedDate`, `formatIdentifiers`, `formatSource`
  - Keep `formatType` as internal helper used by `formatSource`
- [ ] Verify Green: `npm run test:unit -- choice-builder.test.ts`
- [ ] Lint/Type check: `npm run lint && npm run typecheck`

### Step 4: Update `runSearchFlow.ts` to use shared module

- [ ] Remove duplicated functions from `src/features/interactive/apps/runSearchFlow.ts`
- [ ] Import `toChoice` from `../choice-builder.js`
- [ ] Update test: `src/features/interactive/apps/runSearchFlow.test.ts`
  - Change import from `./runSearchFlow.js` to `../choice-builder.js`
  - Update expected indicator format: `📄🔗🏷` → `pdf url tag`
  - Update expected type display: `"Journal article"` → journal name or type fallback
- [ ] Verify Green: `npm run test:unit -- runSearchFlow.test.ts`
- [ ] Lint/Type check: `npm run lint && npm run typecheck`

### Step 5: Update `search-prompt.ts` to use shared module

- [ ] Remove duplicated functions from `src/features/interactive/search-prompt.ts`
- [ ] Import `toChoice` from `./choice-builder.js`
- [ ] Remove unused legacy functions (`createChoices`, `parseSelectedValues`) if confirmed unused
- [ ] Verify Green: `npm run test:unit -- search-prompt.test.ts`
- [ ] Lint/Type check: `npm run lint && npm run typecheck`

### Step 6: Full test suite and build verification

- [ ] Run full test suite: `npm run test`
- [ ] Run lint: `npm run lint`
- [ ] Run typecheck: `npm run typecheck`
- [ ] Run build: `npm run build`

## Manual Verification

TTY-required tests (run manually in a terminal):
- [ ] `ref search -t` shows text indicators (`pdf`, `md`, `file`, `url`, `tag`) dimmed in meta line
- [ ] `ref search -t` shows journal short name instead of "Journal article" for journal articles
- [ ] `ref search -t` shows publisher for books without container-title
- [ ] `ref fulltext get` (no args, TTY) shows indicators in interactive selection
- [ ] `ref edit` (no args, TTY) shows indicators in interactive selection
- [ ] `ref attach` (no args, TTY) shows indicators in interactive selection
- [ ] Indicators and surrounding text are uniformly dimmed (no bright emoji)

## Completion Checklist

- [ ] All tests pass (`npm run test`)
- [ ] Lint passes (`npm run lint`)
- [ ] Type check passes (`npm run typecheck`)
- [ ] Build succeeds (`npm run build`)
- [ ] Manual verification completed
- [ ] CHANGELOG.md updated
- [ ] Move this file to `spec/tasks/completed/`
