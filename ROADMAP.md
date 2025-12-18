# ROADMAP

## Current Status

✅ **Version 0.1.0 - All implementation phases complete** (2025-12-18)

The project is feature-complete and ready for distribution with 606 tests passing.

## Implementation History

All 5 phases (Phase 1-5) have been successfully completed:
- Phase 1: Core Foundation
- Phase 2: Utils & Config
- Phase 3: Features
- Phase 4: Server & CLI
- Phase 5: Build & Distribution

For detailed implementation history, see Git commit history or `README.md`.

---

## Next Steps

### Version 0.2.0 - Citation Generation (cite command)

Implementation of the `cite` command for formatted citation generation.

See `spec/features/cite.md` and `spec/features/cite-implementation.md` for full specifications.

---

## File Structure Overview

### New Files

**`src/features/cite/`** (New Directory)
- `types.ts` - Type definitions
- `output.ts`, `output.test.ts` - Non-CSL formatters (Pandoc, BibTeX, Plain, JSON)
- `style-resolver.ts`, `style-resolver.test.ts` - CSL style file resolution and download
- `formatter.ts`, `formatter.test.ts` - CSL-based citation formatting
- `interactive.ts`, `interactive.test.ts` - Interactive selection UI
- `clipboard.ts`, `clipboard.test.ts` - Clipboard integration
- `index.ts` - Main exports

**`src/cli/commands/`**
- `cite.ts`, `cite.test.ts` - CLI command implementation

### Modified Files

**`src/config/schema.ts`** (Staged additions)
- Phase 2: Add basic cite config (`cslDirectory`, `defaultCslStyle`)
- Phase 4: Add UX config (`defaultMode`, `autoCopy`)
- Phase 5: Add locale config (`defaultLocale`)

**`src/config/defaults.ts`** (Staged additions)
- Phase 2: Add basic cite defaults
- Phase 4: Add UX defaults
- Phase 5: Add locale default

**`src/cli/commands/index.ts`**
- Phase 2: Register cite command

**`package.json`** (Staged additions)
- Phase 2: `@citation-js/core`, `@citation-js/plugin-csl`
- Phase 4: `inquirer`, `@types/inquirer`, `clipboardy`

---

## Implementation Phases

### Phase 1: Basic Output Formatters 📝

**Goal**: Non-CSL output formats (Pandoc, BibTeX, Plain, JSON)

**Files**:
- [ ] `src/features/cite/types.ts`
- [ ] `src/features/cite/output.ts`
- [ ] `src/features/cite/output.test.ts`

**Tasks**:
- [ ] Define all TypeScript types and interfaces
- [ ] Implement Pandoc format: `[@key]`, `@key`, `[-@key]`, with prefix/suffix support
- [ ] Implement BibTeX format: `\cite{key}`, `\citet{key}`
- [ ] Implement Plain format: plain citation keys
- [ ] Implement JSON format: `{id, uuid, pandoc}`
- [ ] Write comprehensive tests for all formats
- [ ] Quality checks: typecheck, lint, tests passing

**Deliverables**:
- ✓ All non-CSL output formats working independently
- ✓ Test coverage for output module

---

### Phase 2: CSL Foundation & Basic Citation 🏗️

**Goal**: CSL style resolution + basic bibliography mode

**Dependencies**: `@citation-js/core`, `@citation-js/plugin-csl`

**Files**:
- [ ] `package.json` - Add CSL dependencies
- [ ] `src/config/schema.ts` - Add basic cite config (cslDirectory, defaultCslStyle)
- [ ] `src/config/defaults.ts` - Add basic cite defaults
- [ ] `src/features/cite/style-resolver.ts`
- [ ] `src/features/cite/style-resolver.test.ts`
- [ ] `src/features/cite/formatter.ts` (bibliography mode only)
- [ ] `src/features/cite/formatter.test.ts`
- [ ] `src/features/cite/index.ts` (partial)
- [ ] `src/cli/commands/cite.ts` (basic implementation)
- [ ] `src/cli/commands/cite.test.ts`
- [ ] `src/cli/commands/index.ts` - Register command

**Tasks**:
- [ ] Install `@citation-js/core` and `@citation-js/plugin-csl`
- [ ] Add basic cite config to schema.ts:
  - `cslDirectory`: CSL styles directory path
  - `defaultCslStyle`: Default CSL style name
- [ ] Add basic cite defaults to defaults.ts
- [ ] Implement CSL directory search (project-local → env var → user config)
- [ ] Implement CSL style file resolution
- [ ] Implement on-demand download from official CSL repository
- [ ] Implement bibliography formatting with citation-js
- [ ] Create basic CLI command handler
- [ ] Implement reference lookup by citation key
- [ ] Implement `--uuid` option
- [ ] Implement `--format` option (csl, pandoc, bibtex, plain)
- [ ] Implement `--csl` option for style selection
- [ ] Write tests for style resolver and formatter
- [ ] Write integration tests for cite command
- [ ] Write tests for config loading (cite section)
- [ ] Quality checks: typecheck, lint, tests passing

**Deliverables**:
- ✓ `reference-manager cite Smith2020` works with APA bibliography
- ✓ `reference-manager cite --format pandoc Smith2020` works
- ✓ `reference-manager cite --csl nature Smith2020` works
- ✓ CSL styles download automatically on first use
- ✓ Basic error handling (reference not found, style not found)

**MVP Complete**: Core citation generation functional

---

### Phase 3: Extended CSL Modes 📖

**Goal**: Inline citations, narrative mode, multiple styles

**Files**:
- [ ] `src/features/cite/formatter.ts` (add inline/both/narrative modes)
- [ ] `src/features/cite/formatter.test.ts` (update)
- [ ] `src/cli/commands/cite.ts` (add inline options)
- [ ] `src/cli/commands/cite.test.ts` (update)

**Tasks**:
- [ ] Implement inline citation mode (`--inline`)
- [ ] Implement narrative citation mode (`--narrative`)
- [ ] Implement both output mode (`--both`)
- [ ] Implement `--csl-file` for custom CSL files
- [ ] Add Pandoc format options: `--year-only`, `--prefix`, `--suffix`
- [ ] Test all built-in CSL styles (apa, chicago, mla, vancouver, harvard, ieee, nature, science, ama)
- [ ] Write tests for all CSL modes and style variations
- [ ] Quality checks: typecheck, lint, tests passing

**Deliverables**:
- ✓ `reference-manager cite --inline Smith2020` → `(Smith, 2020)`
- ✓ `reference-manager cite --inline --narrative Smith2020` → `Smith (2020)`
- ✓ `reference-manager cite --both Smith2020` → both formats
- ✓ All 9 built-in CSL styles working
- ✓ Custom CSL files supported

---

### Phase 4: Enhanced UX 🎯

**Goal**: Interactive selection, clipboard, search integration, extended configuration

**Dependencies**: `inquirer`, `clipboardy`

**Files**:
- [ ] `package.json` - Add UX dependencies
- [ ] `src/features/cite/interactive.ts`
- [ ] `src/features/cite/interactive.test.ts`
- [ ] `src/features/cite/clipboard.ts`
- [ ] `src/features/cite/clipboard.test.ts`
- [ ] `src/features/cite/index.ts` (complete)
- [ ] `src/cli/commands/cite.ts` (add search/interactive/copy options)
- [ ] `src/cli/commands/cite.test.ts` (update)
- [ ] `src/config/schema.ts` - Add extended cite config (defaultMode, autoCopy)
- [ ] `src/config/defaults.ts` - Add extended cite defaults

**Tasks**:
- [ ] Install `inquirer` and `clipboardy`
- [ ] Implement interactive selection UI
- [ ] Implement clipboard integration
- [ ] Implement `--search` option (integrate with existing search feature)
- [ ] Implement `--interactive` option
- [ ] Implement `--copy` option
- [ ] Add extended cite config to schema.ts:
  - `defaultMode`: Default citation mode (bibliography/inline)
  - `autoCopy`: Automatically copy to clipboard
- [ ] Add extended cite defaults to defaults.ts
- [ ] Write tests for interactive and clipboard modules
- [ ] Write tests for extended configuration loading
- [ ] Quality checks: typecheck, lint, tests passing

**Deliverables**:
- ✓ `reference-manager cite --search "deep learning" --interactive` works
- ✓ `reference-manager cite --copy Smith2020` copies to clipboard
- ✓ Configuration file support for cite preferences
- ✓ `auto_copy`, `default_csl_style`, etc. configurable

---

### Phase 5: Polish & Optimization ✨

**Goal**: Performance, error handling, server integration, documentation

**Files**:
- [ ] `src/features/cite/formatter.ts` (add caching)
- [ ] `src/cli/commands/cite.ts` (add server integration, improve errors)
- [ ] `src/cli/commands/cite.test.ts` (add server/error tests)
- [ ] `src/config/schema.ts` - Add locale config (defaultLocale)
- [ ] `src/config/defaults.ts` - Add locale default
- [ ] `README.md` - Add cite documentation

**Tasks**:
- [ ] Implement `--json` output option
- [ ] Implement CSL processor caching for performance
- [ ] Optimize style file loading
- [ ] Optimize locale file loading
- [ ] Add locale config to schema.ts:
  - `defaultLocale`: Default locale (en-US, en-GB, etc.)
- [ ] Add locale default to defaults.ts
- [ ] Implement server integration (hybrid: server for data, CLI for CSL)
- [ ] Add server connection detection
- [ ] Improve error messages for all failure cases
- [ ] Add exit codes (0=success, 1=not found, 2=style not found, 3=invalid CSL, 4=other)
- [ ] Test multiple references handling (bibliography, inline, pandoc)
- [ ] Write E2E tests with real library
- [ ] Write performance benchmarks
- [ ] Update CLI help text
- [ ] Add usage examples to README
- [ ] Document all configuration options
- [ ] Quality checks: typecheck, lint, all tests passing
- [ ] Verify performance targets (< 100ms single citation)

**Deliverables**:
- ✓ `reference-manager cite --json Smith2020` works
- ✓ Performance optimized (caching, lazy loading)
- ✓ Server integration working (with fallback to direct access)
- ✓ Comprehensive error handling with helpful messages
- ✓ Full documentation in README
- ✓ All tests passing with high coverage
- ✓ Production-ready code

**Version 0.2.0 Complete**: Full cite feature implementation

---

### Version 0.3.0 (Future)

Potential features for future versions (see `spec/guidelines/future.md`):
- Locale support (en-GB, ja-JP)
- Citation clustering and sorting
- Additional export formats
- Advanced search features
- Performance optimizations
- Community-requested features

---

### Contributing

For bug reports and feature requests, please visit:
https://github.com/ncukondo/reference-manager/issues
