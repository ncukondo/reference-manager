# Search

## Query Processing

### Tokenization

- Query string is split by whitespace into tokens
- Tokens within double quotes (`"`) are treated as a single phrase
- Example: `author:Smith "machine learning" 2020`
  - Token 1: `author:Smith`
  - Token 2: `"machine learning"` (phrase)
  - Token 3: `2020`

### Field-Specified Search

- Syntax: `fieldname:value`
- Supported field prefixes:
  - `id:` - Search in citation key (exact match)
  - `author:` - Search in author names
  - `title:` - Search in title
  - `year:` - Search in publication year (extracted from `issued` field)
  - `doi:` - Search in DOI field
  - `pmid:` - Search in PMID field
  - `pmcid:` - Search in PMCID field
  - `isbn:` - Search in ISBN field
  - `url:` - Search in URL field (both primary `URL` and `custom.additional_urls`)
  - `keyword:` - Search in keyword field
  - `tag:` - Search in custom tags field (`custom.tags`)
- If no field prefix is specified, search all fields

### Case Sensitivity for Consecutive Uppercase

Tokens containing **2+ consecutive uppercase letters** (AI, RNA, CRISPR) are matched case-sensitively for that portion.

- `AI` → matches "AI therapy", not "ai therapy" or "Ai therapy"
- `api` → matches "API endpoint" (no consecutive uppercase in query)
- `RNA` → matches "mRNA synthesis" (partial match)

See: `src/features/search/uppercase.ts` for implementation, `uppercase.test.ts` for examples.

### Boolean Logic

- **AND search**: All tokens must match (in any field)
- Each token must match at least one field for the reference to be included
- Example: `Smith 2020` matches references where:
  - At least one field contains "Smith" (case-insensitive partial match)
  - AND at least one field contains "2020" (case-insensitive partial match)

## Search Fields

### ID Fields (Exact Match, Case-Insensitive)

- `id` - Citation key
- `PMID` - PubMed ID
- `PMCID` - PubMed Central ID
- `DOI` - Digital Object Identifier
- `ISBN` - International Standard Book Number
- `URL` - Primary URL
- `custom.additional_urls` - Additional URLs (array)

**Matching behavior:**
- Exact match required (complete string equality)
- Case-insensitive comparison
- No normalization applied (except case folding)
- For `url:` prefix: matches if the query value exactly matches **either** the primary `URL` field **or** any element in `custom.additional_urls` array

### Content Fields (Partial Match, Case-Insensitive)

- `title` - Title
- `author` - Authors (all author names, normalized as `family` + given initial)
- `keyword` - Keywords (array in memory, each element searched individually)
- `custom.tags` - User-defined tags (array, each element searched individually)
- `container-title` - Journal/book title
- `publisher` - Publisher name
- `abstract` - Abstract text
- Other metadata fields

**Matching behavior:**
- Partial match (substring search)
- Case-insensitive comparison
- Normalization applied (see below)

**Array field handling:**
- For array fields (e.g., `keyword`, `custom.tags`), each array element is treated as a separate searchable value
- A match occurs if the query matches any element in the array
- Example: For `keyword: ["machine learning", "deep learning", "neural networks"]`:
  - Query `"machine"` matches (found in "machine learning")
  - Query `"deep"` matches (found in "deep learning")
  - Query `"keyword:neural"` matches (found in "neural networks")
- Example: For `custom.tags: ["review", "important", "to-read"]`:
  - Query `"tag:review"` matches
  - Query `"important"` matches (in multi-field search)

## Normalization

Content fields are normalized before matching: Unicode NFKC, lowercase, punctuation removed, whitespace normalized.

**Exception:** Consecutive uppercase portions (2+) are matched case-sensitively.

See: `src/features/search/matcher.ts` for normalization and matching logic.

## Matching

- **Exact**: Complete string equality (ID fields only)
- **Partial**: Substring match (content fields)
- **Fuzzy**: Not enabled initially

## Result Inclusion

A reference is included in search results if:
- **All tokens** match (AND logic)
- For each token, **at least one field** matches

## Sorting and Pagination

See `spec/features/pagination.md` for complete sorting and pagination options.

**Defaults for search:**
- Sort: `updated` (descending) - most recently modified first
- Limit: unlimited (CLI/HTTP), 20 (MCP)

**`relevance` sort** uses weighted scoring:
1. Match strength (exact > partial)
2. Year (descending)
3. Author (alphabetical)
4. Title (alphabetical)
5. Registration order

## Output Formats

- Default: pretty-printed CSL-JSON
- Options:
  - `--json` - Compact JSON
  - `--ids-only` - Only reference IDs (CSL-JSON `id` field)
  - `--uuid` - Only internal UUIDs (`custom.uuid` field)
  - `--bibtex` - BibTeX format
