# ADR-016: Use External CLI Tools for PDF-to-Markdown Conversion

Date: 2026-03-17

## Status

Accepted

## Context

The `fulltext convert` command currently supports only PMC JATS XML to Markdown conversion via `@ncukondo/academic-fulltext`. However, many academic papers are only available as PDF files. Users need a way to convert attached PDFs to Markdown for AI-readable content.

### Challenges of Academic PDF Conversion

Academic PDFs are particularly difficult to convert due to:

- Multi-column layouts requiring layout analysis for correct reading order
- Mathematical equations embedded as fonts/vectors requiring specialized OCR
- Complex tables with merged cells and invisible borders
- Headers, footers, and page numbers mixed into body text
- Scanned older papers requiring full OCR

### Node.js/Bun Ecosystem Gap

There is no mature, high-quality npm package for academic PDF-to-Markdown conversion. The leading tools are all Python-based:

| Tool | License | Quality | GPU | Speed |
|------|---------|---------|-----|-------|
| Marker | GPL | High | Recommended | 0.86s/pg |
| Docling | MIT | High | Optional | 0.49s/pg |
| MinerU | Apache 2.0 | Very High | Recommended | 0.21s/pg |
| PyMuPDF4LLM | AGPL | Moderate | No | Very fast |

### Requirements

1. Support multiple PDF conversion tools (users have different environments/preferences)
2. Allow user-defined custom converters for maximum flexibility
3. Provide actionable error messages when no converter is available
4. Handle long-running conversions with progress display and timeout
5. Work cross-platform (Unix, Windows, WSL)

## Decision

### 1. Pluggable Converter Architecture via Subprocess

Call external CLI tools as subprocesses rather than embedding conversion logic. Each converter implements a common `PdfConverter` interface:

```typescript
interface PdfConverter {
  readonly name: string;
  isAvailable(): Promise<boolean>;
  convert(pdfPath: string, outputPath: string): Promise<PdfConvertResult>;
}
```

### 2. Command Template Protocol for Custom Converters

Custom converters are defined in configuration using a command template with placeholders:

```toml
[fulltext.converters.my_tool]
command = "my-pdf-converter {input} {output}"
```

Placeholders: `{input}`, `{output}`, `{input_dir}`, `{input_name}`, `{output_name}`

Two output modes:
- `file` (default): tool writes to `{output}` path
- `stdout`: stdout is captured as Markdown content

### 3. Auto-Detection with Priority List

In `auto` mode (default), iterate through `pdfConverterPriority` and use the first available converter. Custom and built-in converters participate equally in the priority list.

### 4. Shell Execution

Commands are executed via shell (`shell: true` in Node.js/Bun, which uses `sh` on Unix and `cmd.exe` on Windows), enabling pipes, environment variables, and redirections in custom commands.

### 5. Platform-Specific Command Override

Optional `command_windows` and `check_command_windows` fields allow platform-specific command definitions for cross-platform custom converters.

## Rationale

1. **Subprocess over FFI/binding**: External CLI tools have their own dependency management (Python, GPU drivers). Subprocess isolation prevents version conflicts and simplifies installation. The CLI interface of these tools is stable and well-documented.

2. **Pluggable over single-tool**: Users' environments vary widely (GPU availability, OS, preferred tools). A single hardcoded tool would exclude many users.

3. **Command template over fixed protocol**: Different tools use different CLI conventions (`--input`/`--output`, positional args, etc.). Templates accommodate any tool without wrapper scripts for simple cases.

4. **Shell execution over execFile**: Custom commands may need pipes, environment variables, or complex argument passing. Shell execution is more flexible and matches user expectations for CLI configuration.

5. **Auto-detection over mandatory config**: Most users want zero-configuration. Auto-detection with a sensible priority list provides this while allowing explicit override.

6. **XML preferred over PDF when both exist**: PMC JATS XML conversion is deterministic and produces higher quality Markdown (semantic structure is preserved in XML). PDF conversion is lossy by nature.

## Consequences

### Positive

- Users can convert PDF attachments to Markdown without manual work
- Any CLI tool can be integrated as a converter, including user-created scripts
- No new npm dependencies required for PDF conversion
- Built-in support for the most popular academic PDF conversion tools
- Actionable error messages guide users to install a converter

### Negative

- External tool dependency: PDF conversion requires Python tool installation (not bundled)
- Subprocess overhead: slower than native library, process spawn cost
- Cross-platform complexity: shell syntax, path separators, command resolution differ
- Testing difficulty: E2E tests require actual tool installation

### Neutral

- Existing XML conversion behavior is unchanged
- Configuration schema grows (converters section)
- PDF conversion quality depends entirely on the external tool

## Alternatives Considered

### Option A: Embed a JavaScript/WASM PDF Parser

**Description**: Use a native Node.js library like `pdf-parse` or `pdfjs-dist` for extraction, with custom Markdown formatting.

**Pros**:
- No external dependencies
- Cross-platform by default
- Bundleable in single binary

**Cons**:
- No existing npm library handles academic PDFs well (equations, tables, multi-column)
- Would require building and maintaining a complex conversion pipeline
- Quality far below Python tools

**Why rejected**: Quality gap is too large for academic use cases. Building a competitive converter is outside project scope.

### Option B: API-Only Approach (Mathpix, Document AI)

**Description**: Use cloud APIs exclusively for PDF conversion.

**Pros**:
- No local installation required
- High quality (especially Mathpix for equations)
- Cross-platform

**Cons**:
- Per-page cost ($0.005-0.03/page)
- Requires internet connection
- Privacy concerns (uploading papers to third-party services)
- API key management

**Why rejected**: Cost and privacy concerns make this unsuitable as the primary approach. Could be supported as a custom converter if users configure an API wrapper.

### Option C: Single Tool Dependency (e.g., Marker only)

**Description**: Support only one specific converter tool.

**Pros**:
- Simpler implementation
- Easier to test and document
- Consistent output quality

**Cons**:
- Excludes users who can't install that specific tool
- Risk if the tool becomes unmaintained
- Doesn't accommodate users with preferred tools

**Why rejected**: Too restrictive for a CLI tool targeting diverse user environments.

## References

- Spec: `spec/features/fulltext-retrieval.md` (PDF Converter section)
- ADR-013: Attachments Architecture (fulltext file management)
- [Marker](https://github.com/datalab-to/marker) - GPL, deep learning PDF conversion
- [Docling](https://github.com/docling-project/docling) - MIT, IBM document conversion
- [MinerU](https://github.com/opendatalab/MinerU) - Apache 2.0, Shanghai AI Lab
- [PyMuPDF4LLM](https://pymupdf.readthedocs.io/en/latest/pymupdf4llm/) - AGPL, rule-based extraction
