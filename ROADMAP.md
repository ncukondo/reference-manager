# ROADMAP

This document tracks future development plans for reference-manager.

For completed features and changes, see [CHANGELOG.md](./CHANGELOG.md).

For detailed specifications, see [spec/](./spec/).

## Completed Phases

- ✅ **Phase 1-5**: Core functionality, CLI commands, Server, Build & Distribution
- ✅ **Phase 6**: Citation Generation (cite command)
- ✅ **Phase 7**: Multi-Format Import (add command with BibTeX, RIS, DOI, PMID support)
- ✅ **Phase 8**: Operation Integration (unified operations pattern)
- ✅ **Phase 9**: Server Mode Performance Optimization (ExecutionContext pattern)
- ✅ **Phase 10**: Full-text Management (attach, get, detach commands)

See [CHANGELOG.md](./CHANGELOG.md) for details on implemented features.

---

## Current Phase

### Phase 11: Search Enhancements ← **IN PROGRESS**

Enhanced search functionality with case-sensitive uppercase matching and custom tags support.

**Specs**: `spec/features/search.md`, `spec/features/metadata.md`, `spec/core/data-model.md`

#### 11.1 Consecutive Uppercase Detection (Unit)

Pure utility functions with no dependencies on matcher logic.

- [x] **11.1.1**: Test consecutive uppercase detection
  - File: `src/features/search/uppercase.test.ts`
  - Test `hasConsecutiveUppercase`: "AI" → true, "api" → false, "Ai" → false
  - Test `extractUppercaseSegments`: "AI-based" → [{segment: "AI", start: 0, end: 2}]

- [x] **11.1.2**: Implement consecutive uppercase detection
  - File: `src/features/search/uppercase.ts`
  - Function: `hasConsecutiveUppercase(text: string): boolean`
  - Function: `extractUppercaseSegments(text: string): UppercaseSegment[]`

#### 11.2 Case-Sensitive String Matching (Unit)

String matching utility that respects uppercase segments.

- [x] **11.2.1**: Test case-sensitive matching function
  - File: `src/features/search/uppercase.test.ts`
  - Test `matchWithUppercaseSensitivity(query, target)`:
    - ("AI", "AI therapy") → true
    - ("AI", "ai therapy") → false
    - ("AI", "Ai therapy") → false
    - ("RNA", "mRNA") → true (partial)
    - ("api", "API endpoint") → true (no uppercase in query)
    - ("AI therapy", "AI Therapy") → true (mixed)

- [x] **11.2.2**: Implement case-sensitive matching function
  - File: `src/features/search/uppercase.ts`
  - Function: `matchWithUppercaseSensitivity(query: string, target: string): boolean`
  - Depends on: 11.1.2

#### 11.3 Integrate Uppercase Matching into Matcher

Modify existing matcher to use new uppercase-aware matching.

- [ ] **11.3.1**: Test matchFieldValue with uppercase
  - File: `src/features/search/matcher.test.ts`
  - Add tests for title/author fields with uppercase queries
  - Test: title search "AI" matches "AI therapy" but not "ai therapy"

- [ ] **11.3.2**: Modify matchFieldValue for uppercase
  - File: `src/features/search/matcher.ts`
  - Import and use `matchWithUppercaseSensitivity` for content fields
  - Depends on: 11.2.2

- [ ] **11.3.3**: Test matchKeyword with uppercase
  - File: `src/features/search/matcher.test.ts`
  - Test: keyword "RNA" matches ["mRNA sequencing"] but not ["mrna sequencing"]

- [ ] **11.3.4**: Modify matchKeyword for uppercase
  - File: `src/features/search/matcher.ts`
  - Apply uppercase-aware matching to keyword array
  - Depends on: 11.2.2

#### 11.4 Schema & Type Update for `custom.tags`

Add `tags` field to CslCustomSchema for type safety.

- [ ] **11.4.1**: Test schema accepts tags field
  - File: `src/core/csl-json/validator.test.ts`
  - Test: Validate entry with `custom.tags: ["tag1", "tag2"]`
  - Test: Validate entry with empty `custom.tags: []`
  - Test: Validate entry without `custom.tags` (optional)

- [ ] **11.4.2**: Add tags to CslCustomSchema
  - File: `src/core/csl-json/types.ts`
  - Modify: Add `tags: z.array(z.string()).optional()` to CslCustomSchema
  - Result: `CslCustom` type now includes `tags?: string[]`

#### 11.5 Tag Field Tokenizer Support

Add `tag:` prefix to tokenizer.

- [ ] **11.5.1**: Test tag field tokenization
  - File: `src/features/search/tokenizer.test.ts`
  - Test: "tag:review" → {field: "tag", value: "review"}
  - Test: "tag:important" → {field: "tag", value: "important"}

- [ ] **11.5.2**: Add tag to VALID_FIELDS
  - File: `src/features/search/tokenizer.ts`
  - Modify: Add `"tag"` to VALID_FIELDS set
  - Depends on: 11.5.1

#### 11.6 Tag Field Matcher Support

Add matching logic for `custom.tags` array.

- [ ] **11.6.1**: Test matchTag function
  - File: `src/features/search/matcher.test.ts`
  - Test: matchTag("review", {custom: {tags: ["review", "important"]}}) → match
  - Test: matchTag("rev", {custom: {tags: ["review"]}}) → partial match
  - Test: matchTag("review", {custom: {}}) → null
  - Test: matchTag("review", {}) → null

- [ ] **11.6.2**: Implement matchTag function
  - File: `src/features/search/matcher.ts`
  - Function: `matchTag(queryValue: string, reference: CslItem): FieldMatch | null`
  - Logic: Similar to matchKeyword, access `reference.custom?.tags`
  - Depends on: 11.4.2, 11.2.2

- [ ] **11.6.3**: Test matchSpecificField with tag
  - File: `src/features/search/matcher.test.ts`
  - Test: field "tag" routes to matchTag

- [ ] **11.6.4**: Integrate matchTag into matchSpecificField
  - File: `src/features/search/matcher.ts`
  - Add case for `fieldToSearch === "tag"`
  - Depends on: 11.6.2

- [ ] **11.6.5**: Test matchAllFields includes tags
  - File: `src/features/search/matcher.test.ts`
  - Test: bare search "review" matches reference with custom.tags: ["review"]

- [ ] **11.6.6**: Integrate matchTag into matchAllFields
  - File: `src/features/search/matcher.ts`
  - Add "tag" to specialFields array
  - Depends on: 11.6.2

#### 11.7 Quality Checks

- [ ] **11.7.1**: Full test suite passes
  - Command: `npm test`

- [ ] **11.7.2**: Type check passes
  - Command: `npm run typecheck`

- [ ] **11.7.3**: Lint and format
  - Command: `npm run lint && npm run format`

---

## Future Phases

### Phase 12: Citation Enhancements

Post-MVP enhancements for citation functionality:

- Clipboard support (`--clipboard`)
- Pandoc cite key generation (`--cite-key`)
- Custom sort order (`--sort <field>`)
- Group by field (`--group-by <field>`)
- Batch citation generation from file

### Phase 13: Advanced Features

Additional features beyond core functionality:

- Citation graph visualization
- Duplicate detection improvements
- Advanced search operators
- Tag management commands (add/remove tags)
- Note-taking integration
- LSP integration for text editors

---

## Contributing

When planning new features:

1. Create specification in `spec/features/`
2. Create ADR if architectural decision is needed in `spec/decisions/`
3. Add task to this ROADMAP
4. Follow TDD process (see `spec/guidelines/testing.md`)
5. Update CHANGELOG.md when complete
