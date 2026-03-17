# Task: PDF-to-Markdown Conversion Support

## Purpose

Extend `fulltext convert` to support PDF-to-Markdown conversion using external CLI tools (marker, docling, mineru, pymupdf). Include a pluggable custom converter system so users can integrate any CLI tool or script.

## References

- Spec: `spec/features/fulltext-retrieval.md` (PDF Converter section)
- ADR: `spec/decisions/ADR-016-pdf-to-markdown-external-converters.md`
- Related: `src/features/operations/fulltext/convert.ts`
- Related: `src/config/schema.ts`
- Related: `src/cli/commands/fulltext.ts`
- Related: `src/mcp/tools/fulltext.ts`

## TDD Workflow

For each step, follow the Red-Green-Refactor cycle (see `spec/guidelines/testing.md`):

1. **Write test**: Create test file with comprehensive test cases
2. **Create stub**: Create implementation file with empty functions (`throw new Error("Not implemented")`)
3. **Verify Red**: Run tests, confirm they fail with "Not implemented"
4. **Implement**: Write actual logic until tests pass (Green)
5. **Refactor**: Clean up code while keeping tests green
6. **Quality checks**: Pass lint/typecheck

## Steps

### Step 1: PdfConverter Interface and Types

Define the core interface and types for the converter system.

- [x] Write test: `src/features/operations/fulltext/pdf-converter.test.ts`
  - Test `PdfConverter` interface structure
  - Test `PdfConvertResult` type
  - Test `CustomConverterConfig` type validation
- [x] Create stub: `src/features/operations/fulltext/pdf-converter.ts`
  - Export `PdfConverter` interface
  - Export `PdfConvertResult` interface
  - Export `CustomConverterConfig` interface
  - Export `PdfConvertError` type with error codes
- [x] Verify Red
- [x] Implement
- [x] Verify Green
- [x] Lint/Type check

### Step 2: Command Template Expansion

Implement placeholder expansion for custom converter command templates.

- [ ] Write test: `src/features/operations/fulltext/command-template.test.ts`
  - `{input}`, `{output}` basic substitution
  - `{input_dir}`, `{input_name}`, `{output_name}` substitution
  - All placeholders in single command
  - Paths with spaces (quoted correctly)
  - Windows-style paths
- [ ] Create stub: `src/features/operations/fulltext/command-template.ts`
  - `expandTemplate(template, vars)` function
- [ ] Verify Red
- [ ] Implement
- [ ] Verify Green
- [ ] Lint/Type check

### Step 3: Converter Availability Check

Implement tool availability detection (which/where and custom check_command).

- [ ] Write test: `src/features/operations/fulltext/converter-check.test.ts`
  - `isCommandAvailable()` with existing command
  - `isCommandAvailable()` with non-existing command
  - Custom `check_command` execution
  - Platform-aware which/where selection
- [ ] Create stub: `src/features/operations/fulltext/converter-check.ts`
  - `isCommandAvailable(command)` function
  - `runCheckCommand(checkCommand)` function
- [ ] Verify Red
- [ ] Implement
- [ ] Verify Green
- [ ] Lint/Type check

### Step 4: Custom Converter Implementation

Implement the `CustomPdfConverter` class that wraps user-defined commands.

- [ ] Write test: `src/features/operations/fulltext/custom-converter.test.ts`
  - `isAvailable()` delegates to converter-check
  - `convert()` with file output mode (executes command, verifies output file)
  - `convert()` with stdout output mode (captures stdout, writes to file)
  - Timeout handling (SIGTERM then SIGKILL)
  - Non-zero exit code error with stderr capture
  - Output file not created error
  - `command_windows` override on win32 platform
- [ ] Create stub: `src/features/operations/fulltext/custom-converter.ts`
  - `CustomPdfConverter` class implementing `PdfConverter`
- [ ] Verify Red
- [ ] Implement
- [ ] Verify Green
- [ ] Lint/Type check

### Step 5: Built-in Converter Definitions

Implement built-in converter configurations for marker, docling, mineru, pymupdf.

- [ ] Write test: `src/features/operations/fulltext/builtin-converters.test.ts`
  - Each built-in produces correct CLI command
  - Each built-in has correct availability check
  - Built-in converter list and names
- [ ] Create stub: `src/features/operations/fulltext/builtin-converters.ts`
  - `getBuiltinConverter(name)` function
  - `BUILTIN_CONVERTER_NAMES` constant
  - Individual converter factory functions
- [ ] Verify Red
- [ ] Implement
- [ ] Verify Green
- [ ] Lint/Type check

### Step 6: Converter Resolution (auto mode)

Implement the resolver that finds the best available converter.

- [ ] Write test: `src/features/operations/fulltext/converter-resolver.test.ts`
  - Auto mode: returns first available from priority list
  - Auto mode: skips unavailable converters
  - Auto mode: custom converter takes precedence over built-in with same name
  - Auto mode: no converter available → structured error with hints
  - Explicit name: returns specific converter or not-installed error
  - Priority list from config
- [ ] Create stub: `src/features/operations/fulltext/converter-resolver.ts`
  - `resolveConverter(name, config)` function
  - `buildNoConverterHints()` function
- [ ] Verify Red
- [ ] Implement
- [ ] Verify Green
- [ ] Lint/Type check

### Step 7: Extend Config Schema

Add PDF converter settings to the configuration schema.

- [ ] Write test: update `src/config/schema.test.ts` (or existing config tests)
  - `pdfConverter` field validation
  - `pdfConverterPriority` field validation
  - `pdfConverterTimeout` field validation
  - `converters` map validation (custom converter config)
  - snake_case normalization for new fields
- [ ] Implement: update `src/config/schema.ts`
  - Add `pdfConverter`, `pdfConverterPriority`, `pdfConverterTimeout` to `fulltextConfigSchema`
  - Add `converters` record schema with `customConverterSchema`
  - Add snake_case variants to `partialConfigSchema`
  - Update `normalizeFulltextConfig()`
  - Update `DeepPartialConfig` type
- [ ] Implement: update `src/config/defaults.ts` (if exists)
  - Default values: `pdfConverter: "auto"`, `pdfConverterPriority: [...]`, `pdfConverterTimeout: 300`
- [ ] Verify Green
- [ ] Lint/Type check

### Step 8: Extend fulltext convert Operation

Update `fulltextConvert()` to support PDF input with auto-detection.

- [ ] Write test: update `src/features/operations/fulltext/convert.test.ts`
  - Auto-detect: XML exists → uses XML conversion (existing behavior unchanged)
  - Auto-detect: PDF only → uses PDF converter
  - Auto-detect: both XML and PDF → prefers XML
  - `--from pdf`: forces PDF conversion even when XML exists
  - `--from xml`: forces XML conversion (existing behavior)
  - `--converter marker`: uses specific converter
  - No PDF attached with `--from pdf` → actionable error
  - No converter available → error with install hints
  - Converter fails → error with stderr and alternative hint
  - Timeout → error message
- [ ] Implement: update `src/features/operations/fulltext/convert.ts`
  - Add `from` and `converter` options to `FulltextConvertOptions`
  - Add `findPdfFile()` helper (parallel to existing `findXmlFile()`)
  - Add auto-detection logic
  - Integrate converter resolution
  - Add structured error results
- [ ] Verify Green
- [ ] Lint/Type check

### Step 9: Extend CLI Command

Update CLI `fulltext convert` command with new options.

- [ ] Write test: update `src/cli/commands/fulltext.test.ts`
  - `--from pdf` option parsing
  - `--from xml` option parsing
  - `--converter marker` option parsing
  - `--force` option
  - Error output formatting (no converter, not installed, conversion failed)
  - Progress display mode (inherit vs quiet)
- [ ] Implement: update `src/cli/commands/fulltext.ts`
  - Add `--from`, `--converter`, `--force` options
  - Update output formatting for PDF conversion results
  - Format error messages with hints
- [ ] Implement: update `src/cli/index.ts`
  - Register new options on convert command
- [ ] Verify Green
- [ ] Lint/Type check

### Step 10: Extend MCP and HTTP Server

Update MCP tool and HTTP endpoint for PDF conversion support.

- [ ] Write test: update `src/mcp/tools/fulltext.test.ts`
  - `fulltext_convert` with `from` parameter
  - `fulltext_convert` with `converter` parameter
  - Error formatting for MCP context
- [ ] Implement: update `src/mcp/tools/fulltext.ts`
  - Add `from` and `converter` parameters to `fulltext_convert` tool
  - Ensure stderr is captured (not inherited) in MCP context
- [ ] Implement: update HTTP server route (if `fulltext/convert` route exists)
  - Add `from` and `converter` to request body
- [ ] Verify Green
- [ ] Lint/Type check

### Step 11: Integration with fulltext fetch

Auto-convert PDF to Markdown when `preferred_type = "markdown"` after fetch.

- [ ] Write test: update `src/features/operations/fulltext/fetch.test.ts`
  - PDF fetched + `preferredType: "markdown"` + converter available → auto-convert
  - PDF fetched + `preferredType: "markdown"` + no converter → fetch succeeds, warning logged
  - PDF fetched + no preferred type → no auto-convert
- [ ] Implement: update `src/features/operations/fulltext/fetch.ts`
  - After PDF download and attach, check preferred type
  - If markdown preferred and converter available, run conversion
  - Log warning if converter not available (non-fatal)
- [ ] Verify Green
- [ ] Lint/Type check

## Completion Checklist

- [ ] All tests pass (`npm run test`)
- [ ] Lint passes (`npm run lint`)
- [ ] Type check passes (`npm run typecheck`)
- [ ] Build succeeds (`npm run build`)
- [ ] CHANGELOG.md updated
- [ ] Close linked issue (include `Closes #XX` in PR description)
- [ ] Move this file to `spec/tasks/completed/`
