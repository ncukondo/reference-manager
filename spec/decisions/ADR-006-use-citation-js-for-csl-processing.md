# ADR-006: Use Citation.js for CSL Processing

Date: 2025-12-19

## Status

Accepted

## Context

The cite command requires generating formatted citations and bibliographies according to CSL (Citation Style Language) styles. We need to choose a CSL processor library that can:

1. Accept CSL-JSON input (our native data format)
2. Generate citations in multiple styles (APA, Vancouver, Chicago, etc.)
3. Support multiple output formats (text, HTML, RTF)
4. Provide both in-text citations and bibliography entries
5. Be actively maintained and reliable

## Decision

Use **@citation-js/core** with **@citation-js/plugin-csl** for CSL processing.

## Rationale

### 1. Native CSL-JSON Support

Citation.js treats CSL-JSON as a first-class input format without requiring conversion. Since our entire data model is built on CSL-JSON, this provides seamless integration.

### 2. Built on Industry Standard (citeproc-js)

The @citation-js/plugin-csl uses citeproc-js internally, which is:
- The definitive implementation of CSL
- Battle-tested in Zotero and Mendeley word processor integrations
- Passes 1,300+ integration tests
- Compliant with CSL specification 1.0.1

### 3. Modular Architecture

Citation.js uses a plugin-based architecture:
- `@citation-js/core`: Core functionality
- `@citation-js/plugin-csl`: CSL output generation
- Additional plugins available if needed (e.g., DOI resolution)

This allows us to include only what we need, keeping bundle size reasonable.

### 4. Active Maintenance

- Latest version: 0.7.21 (as of 2025-12)
- Regular updates and bug fixes
- Good documentation at https://citation.js.org/
- Active GitHub repository

### 5. Comprehensive Format Support

Supports the formats we need:
- Text (plain text)
- HTML (with CSL-standard classes)
- RTF (for word processors)

### 6. API Simplicity

Simple API for our use case:

```javascript
import { Cite } from '@citation-js/core'
import '@citation-js/plugin-csl'

const cite = new Cite(cslJsonArray)
const output = cite.format('bibliography', {
  format: 'text',
  template: 'apa',
  lang: 'en-US'
})
```

## Consequences

### Positive

1. **Reliable**: Inherits stability and correctness from citeproc-js
2. **Maintainable**: Well-documented API and active community
3. **Compatible**: Direct CSL-JSON support means no data transformation
4. **Extensible**: Plugin architecture allows future enhancements
5. **Standards-compliant**: Full CSL 1.0.1 specification support
6. **Proven**: Used in production by various academic tools

### Negative

1. **Bundle size**: Adds dependencies (@citation-js/core + @citation-js/plugin-csl)
   - Mitigation: Both packages are reasonably sized and tree-shakeable

2. **Additional layer**: Wraps citeproc-js rather than using it directly
   - Mitigation: The abstraction provides value (format conversion, plugin system)
   - The API is simpler and more modern than raw citeproc-js

3. **Learning curve**: Need to understand Citation.js API
   - Mitigation: API is straightforward for our use case
   - Good documentation available

## Alternatives Considered

### Option A: Direct citeproc-js

- **Description**: Use citeproc-js directly without Citation.js wrapper
- **Why rejected**:
  - More complex API requiring manual CSL-JSON to citeproc format conversion
  - Less modern codebase (older JavaScript patterns)
  - Citation.js provides valuable abstractions while using citeproc-js internally

### Option B: citeproc-plus

- **Description**: Package bundling citeproc-js with 2000+ styles and 50+ locales
- **Why rejected**:
  - Much larger bundle size (includes all styles)
  - We only need a few common styles bundled
  - User-provided custom styles should be possible
  - Less flexible than Citation.js plugin approach

### Option C: Custom implementation

- **Description**: Write our own CSL processor from scratch
- **Why rejected**:
  - CSL specification is complex (1.0.1 is a substantial spec)
  - Would require significant development and testing effort
  - Risk of bugs and spec non-compliance
  - citeproc-js is already field-tested with 1,300+ tests
  - Not a core competency of this project

### Option D: Pandoc integration

- **Description**: Shell out to Pandoc for citation generation
- **Why rejected**:
  - External dependency (Pandoc must be installed)
  - Process spawning overhead
  - More complex error handling
  - Less control over output formatting
  - Our library already provides CSL-JSON that Pandoc can use directly

## Implementation Notes

### Dependencies to Add

```json
{
  "dependencies": {
    "@citation-js/core": "^0.7.21",
    "@citation-js/plugin-csl": "^0.7.21"
  }
}
```

### Style Management

- Bundle 6 common styles (apa, chicago, vancouver, harvard, mla, ama)
- Support custom CSL files via:
  - `--csl-file <path>` option
  - `csl_directory` config (array of search paths)

### Fallback Strategy

When CSL processor fails or is unavailable:
- Implement simplified AMA-like formatter
- Log warning to stderr
- Continue execution with fallback output

## References

- Citation.js website: https://citation.js.org/
- Citation.js GitHub: https://github.com/citation-js/citation-js
- citeproc-js documentation: https://citeproc-js.readthedocs.io/
- CSL specification: https://citationstyles.org/