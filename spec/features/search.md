# Search

## Normalization

- Unicode NFKC
- Lowercase
- Punctuation removed
- Whitespace normalized

Authors:
- All authors
- `family` + given initial

Year:
- From `issued.date-parts`
- Fallback extraction
- Missing → `0000`

## Matching

- Exact
- Partial
- Fuzzy: not enabled initially

## Sorting (Default)

1. Match strength
2. Year
3. Author
4. Title
5. Registration order

## Output Formats

- Default: pretty-printed CSL-JSON
- Options:
  - `--json`
  - `--ids-only`
  - `--bibtex`
