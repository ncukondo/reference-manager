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
  - `author:` - Search in author names
  - `title:` - Search in title
  - `doi:` - Search in DOI field
  - `pmid:` - Search in PMID field
  - `pmcid:` - Search in PMCID field
  - `url:` - Search in URL field (both primary `URL` and `custom.additional_urls`)
  - `keyword:` - Search in keyword field
  - `tag:` - Search in custom tags field (`custom.tags`)
- If no field prefix is specified, search all fields

### Case Sensitivity for Consecutive Uppercase

Tokens containing **2 or more consecutive uppercase letters** (e.g., AI, API, RNA, CRISPR) are treated specially:

- **The consecutive uppercase portion is matched case-sensitively**
- The remaining portion of the token is matched case-insensitively (with normalization)
- This applies to all search contexts: bare tokens, field-specified, and phrase searches

**Detection pattern:** `/[A-Z]{2,}/g`

**Examples:**

| Query | Target | Match? | Reason |
|-------|--------|--------|--------|
| `AI` | "AI therapy" | ✓ | Exact case match for "AI" |
| `AI` | "ai therapy" | ✗ | "ai" ≠ "AI" |
| `AI` | "Ai therapy" | ✗ | "Ai" ≠ "AI" |
| `api` | "API endpoint" | ✓ | No consecutive uppercase in query |
| `RNA` | "mRNA synthesis" | ✓ | Partial match, "RNA" found in "mRNA" |
| `AI therapy` | "AI Therapy" | ✓ | "AI" case-sensitive, "therapy" case-insensitive |
| `AI-based` | "AI-Based method" | ✓ | "AI" case-sensitive, "based" case-insensitive |
| `title:AI` | "AI model" | ✓ | Field prefix does not change behavior |
| `"AI model"` | "AI Model" | ✓ | Phrase search: "AI" case-sensitive, "model" case-insensitive |

### Boolean Logic

- **AND search**: All tokens must match (in any field)
- Each token must match at least one field for the reference to be included
- Example: `Smith 2020` matches references where:
  - At least one field contains "Smith" (case-insensitive partial match)
  - AND at least one field contains "2020" (case-insensitive partial match)

## Search Fields

### ID Fields (Exact Match, Case-Sensitive)

- `PMID` - PubMed ID
- `PMCID` - PubMed Central ID
- `DOI` - Digital Object Identifier
- `URL` - Primary URL
- `custom.additional_urls` - Additional URLs (array)

**Matching behavior:**
- Exact match required (complete string equality)
- Case-sensitive comparison
- No normalization applied
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

For content fields (non-ID fields), the following normalization is applied:

- Unicode NFKC
- Lowercase
- Punctuation removed
- Whitespace normalized

**Exception:** When the query contains consecutive uppercase letters (2+), those portions are matched case-sensitively against the original (non-normalized) field value. See "Case Sensitivity for Consecutive Uppercase" above.

Authors:
- All authors
- `family` + given initial

Year:
- From `issued.date-parts`
- Fallback extraction
- Missing → `0000`

## Matching

- **Exact**: Complete string equality (ID fields only)
- **Partial**: Substring match (content fields)
- **Fuzzy**: Not enabled initially

## Result Inclusion

A reference is included in search results if:
- **All tokens** match (AND logic)
- For each token, **at least one field** matches

## Sorting (Default)

1. Match strength
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
