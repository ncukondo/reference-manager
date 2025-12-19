# ROADMAP

## Completed Phases

- ✅ Phase 1-5: Core functionality, CLI commands, Server, Build & Distribution

## Phase 6: Citation Generation (cite command)

### Overview

Add `cite` command to generate formatted citations using CSL (Citation Style Language) styles.

### Tasks

- [x] **Task 6.1: Install dependencies**
  - Add `@citation-js/core` and `@citation-js/plugin-csl` to package.json
  - Verify dependencies work correctly
  - Acceptance: `npm install` succeeds, packages are in node_modules

- [x] **Task 6.2: Implement fallback formatter**
  - Write comprehensive tests in `src/cli/output/citation-fallback.test.ts`
    - Test AMA-like simplified format for bibliography
    - Test simplified format for in-text citations
    - Test edge cases (missing fields, single/multiple authors)
    - Test all CSL-JSON field variations
    - Test multiple entries support (array-based)
  - Create `src/cli/output/citation-fallback.ts` with empty implementations
  - Run tests to confirm failure: `npm test -- citation-fallback.test.ts`
  - Implement AMA-like simplified format for bibliography
  - Implement simplified format for in-text citations
  - Handle edge cases (missing fields, single/multiple authors)
  - Run tests to confirm success: `npm test -- citation-fallback.test.ts`
  - Acceptance: All tests pass (29/29), handles all CSL-JSON field variations

- [x] **Task 6.3: Implement CSL processor wrapper**
  - Write comprehensive tests in `src/cli/output/citation-csl.test.ts`
    - Test bibliography generation with various CSL styles
    - Test in-text citation generation
    - Test text, HTML, RTF output formats
    - Test error handling and fallback to simplified format
  - Create `src/cli/output/citation-csl.ts` with empty implementations
  - Run tests to confirm failure: `npm test -- citation-csl.test.ts`
  - Wrap @citation-js/core for bibliography generation
  - Wrap @citation-js/core for in-text citation generation
  - Support text, HTML, RTF output formats
  - Handle CSL processor errors gracefully (fallback to simplified format)
  - Create TypeScript type definitions for @citation-js packages
  - Run tests to confirm success: `npm test -- citation-csl.test.ts`
  - Acceptance: All tests pass (31/31), generates correct citations for various styles

- [ ] **Task 6.4: Implement CSL style management**
  - Write tests in `src/config/csl-styles.test.ts`
    - Test loading from `--csl-file` path
    - Test searching built-in styles
    - Test searching in `csl_directory` paths (array, in order)
    - Test fallback to default style
    - Test all bundled styles (apa, chicago, vancouver, harvard, mla, ama)
  - Create `src/config/csl-styles.ts` with empty implementations
  - Run tests to confirm failure: `npm test -- csl-styles.test.ts`
  - Bundle common CSL styles (apa, chicago, vancouver, harvard, mla, ama)
  - Implement style resolution logic
  - Run tests to confirm success: `npm test -- csl-styles.test.ts`
  - Acceptance: All tests pass, correctly resolves styles from multiple sources

- [ ] **Task 6.5: Add citation config schema**
  - Write tests for config validation in existing test file
    - Test `citation.default_style` validation (string, default: "apa")
    - Test `citation.csl_directory` validation (string | string[], default: ["~/.reference-manager/csl/"])
    - Test `citation.default_locale` validation (string, default: "en-US")
    - Test `citation.default_format` validation (enum: text|html|rtf, default: "text")
  - Run tests to confirm failure: `npm test -- schema.test.ts`
  - Update `src/config/schema.ts` to include citation settings
  - Run tests to confirm success: `npm test -- schema.test.ts`
  - Acceptance: Config schema validates citation settings correctly

- [ ] **Task 6.6: Implement cite command**
  - Write comprehensive tests in `src/cli/commands/cite.test.ts`
    - Test ID/UUID reference resolution
    - Test single and multiple IDs
    - Test all command-line options (--uuid, --style, --csl-file, --locale, --format, --in-text)
    - Test error handling (not found, invalid style, etc.)
    - Test integration with CSL processor and fallback formatter
  - Create `src/cli/commands/cite.ts` with empty implementations
  - Run tests to confirm failure: `npm test -- cite.test.ts`
  - Implement ID/UUID reference resolution
  - Integrate CSL processor wrapper
  - Integrate fallback formatter
  - Support all command-line options
  - Handle errors gracefully
  - Run tests to confirm success: `npm test -- cite.test.ts`
  - Acceptance: All tests pass, command works for all option combinations

- [ ] **Task 6.7: Register cite command in CLI**
  - Write integration tests for CLI registration
    - Test `reference-manager cite --help` shows correct usage
    - Test command works end-to-end with various options
  - Run tests to confirm failure: `npm test`
  - Update `src/cli/index.ts` to register cite command
  - Add command help text and examples
  - Export cite function and types from `src/cli/commands/index.ts`
  - Run tests to confirm success: `npm test`
  - Acceptance: `reference-manager cite --help` shows correct usage, command works end-to-end

- [ ] **Task 6.8: Quality checks and documentation**
  - Run full test suite: `npm test`
  - Run type check: `npm run typecheck`
  - Run lint: `npm run lint`
  - Run format: `npm run format`
  - Update CHANGELOG.md with new feature
  - Acceptance: All quality checks pass, documentation is complete

### Dependencies

- Phase 1-5 must be completed (✅ completed)
- Requires spec: `spec/features/citation.md` (✅ created)
- Requires ADR: `spec/decisions/ADR-006-use-citation-js-for-csl-processing.md` (✅ created)

### Acceptance Criteria

**Functional:**
- ✅ `reference-manager cite <id>` generates bibliography entry in APA style
- ✅ `reference-manager cite <id> --in-text` generates in-text citation
- ✅ Multiple IDs are combined into single citation
- ✅ `--style` option changes CSL style
- ✅ `--csl-file` loads custom CSL file
- ✅ `--format html` generates HTML output
- ✅ `--uuid` looks up by UUID instead of ID
- ✅ Config file settings are respected
- ✅ Falls back to simplified format when CSL processor fails
- ✅ Error messages are clear and helpful

**Quality:**
- ✅ All tests pass (`npm test`)
- ✅ No TypeScript errors (`npm run typecheck`)
- ✅ No lint errors (`npm run lint`)
- ✅ Code is formatted (`npm run format`)
- ✅ Test coverage is comprehensive (unit + integration)

**Documentation:**
- ✅ Command help text is clear
- ✅ Spec is up-to-date
- ✅ CHANGELOG.md is updated

### Current Status

- [x] Spec created: `spec/features/citation.md`
- [x] ADR created: `spec/decisions/ADR-006-use-citation-js-for-csl-processing.md`
- [x] Task 6.1: Install dependencies
- [x] Task 6.2: Implement fallback formatter
- [x] Task 6.3: Implement CSL processor wrapper
- [ ] Task 6.4: Implement CSL style management ← **NEXT**
- [ ] Task 6.5: Add citation config schema
- [ ] Task 6.6: Implement cite command
- [ ] Task 6.7: Register cite command in CLI
- [ ] Task 6.8: Quality checks and documentation

---

## Future Phases

### Phase 7: Citation Enhancements (Future)

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

### Phase 8: Advanced Features (Future)

Additional features beyond core functionality:

- Full-text PDF management
- Automatic metadata extraction from PDFs
- Citation graph visualization
- Duplicate detection improvements
- Advanced search operators
- Tag management
- Note-taking integration
