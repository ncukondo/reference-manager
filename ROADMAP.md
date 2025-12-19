# ROADMAP

## Completed Phases

- ✅ Phase 1-5: Core functionality, CLI commands, Server, Build & Distribution

## Phase 6: Citation Generation (cite command)

### Overview

Add `cite` command to generate formatted citations using CSL (Citation Style Language) styles.

### Tasks

- [ ] **Task 6.1: Install dependencies**
  - Add `@citation-js/core` and `@citation-js/plugin-csl` to package.json
  - Verify dependencies work correctly
  - Acceptance: `npm install` succeeds, packages are in node_modules

- [ ] **Task 6.2: Implement fallback formatter**
  - Create `src/cli/output/citation-fallback.ts`
  - Implement AMA-like simplified format for bibliography
  - Implement simplified format for in-text citations
  - Handle edge cases (missing fields, single/multiple authors)
  - Write comprehensive tests in `src/cli/output/citation-fallback.test.ts`
  - Acceptance: All tests pass, handles all CSL-JSON field variations

- [ ] **Task 6.3: Implement CSL processor wrapper**
  - Create `src/cli/output/citation-csl.ts`
  - Wrap @citation-js/core for bibliography generation
  - Wrap @citation-js/core for in-text citation generation
  - Support text, HTML, RTF output formats
  - Handle CSL processor errors gracefully (fallback to simplified format)
  - Write comprehensive tests in `src/cli/output/citation-csl.test.ts`
  - Acceptance: All tests pass, generates correct citations for various styles

- [ ] **Task 6.4: Implement CSL style management**
  - Create `src/config/csl-styles.ts`
  - Bundle common CSL styles (apa, chicago, vancouver, harvard, mla, ama)
  - Implement style resolution logic:
    - Load from `--csl-file` path
    - Search built-in styles
    - Search in `csl_directory` paths (array, in order)
    - Fall back to default style
  - Write tests in `src/config/csl-styles.test.ts`
  - Acceptance: All tests pass, correctly resolves styles from multiple sources

- [ ] **Task 6.5: Add citation config schema**
  - Update `src/config/schema.ts` to include citation settings
  - Add `citation.default_style` (string, default: "apa")
  - Add `citation.csl_directory` (string | string[], default: ["~/.reference-manager/csl/"])
  - Add `citation.default_locale` (string, default: "en-US")
  - Add `citation.default_format` (enum: text|html|rtf, default: "text")
  - Write tests for config validation
  - Acceptance: Config schema validates citation settings correctly

- [ ] **Task 6.6: Implement cite command**
  - Create `src/cli/commands/cite.ts`
  - Implement ID/UUID reference resolution
  - Integrate CSL processor wrapper
  - Integrate fallback formatter
  - Support command-line options:
    - `--uuid`: Treat arguments as UUIDs
    - `--style <style>`: CSL style name
    - `--csl-file <path>`: Custom CSL file path
    - `--locale <locale>`: Locale code
    - `--format <format>`: Output format (text|html|rtf)
    - `--in-text`: Generate in-text citations
  - Handle single and multiple IDs
  - Handle errors (not found, invalid style, etc.)
  - Write comprehensive tests in `src/cli/commands/cite.test.ts`
  - Acceptance: All tests pass, command works for all option combinations

- [ ] **Task 6.7: Register cite command in CLI**
  - Update `src/cli/index.ts` to register cite command
  - Add command help text and examples
  - Export cite function and types from `src/cli/commands/index.ts`
  - Write integration tests
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
- [ ] Task 6.1: Install dependencies ← **NEXT**
- [ ] Task 6.2: Implement fallback formatter
- [ ] Task 6.3: Implement CSL processor wrapper
- [ ] Task 6.4: Implement CSL style management
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
