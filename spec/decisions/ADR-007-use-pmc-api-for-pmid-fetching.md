# ADR-007: Use PMC Citation Exporter API for PMID Fetching

Date: 2025-12-20

## Status

Accepted

Supersedes relevant section of ADR-006 regarding `@citation-js/plugin-pubmed`.

## Context

The add command requires fetching metadata from PubMed when users provide PMID identifiers. ADR-006 originally planned to use `@citation-js/plugin-pubmed` for this purpose, alongside other citation-js plugins.

However, during implementation, we discovered a version incompatibility:

- `@citation-js/plugin-pubmed@0.3.0` (latest) requires `@citation-js/core@>=0.5.1 <=0.6`
- Our project uses `@citation-js/core@0.7.21`
- Other plugins (bibtex, ris, doi) support `@citation-js/core@0.7.x`

This creates a peer dependency conflict that cannot be resolved without downgrading core (breaking other plugins) or using `--legacy-peer-deps` (risky).

## Decision

Use the **PMC Citation Exporter API** directly for PMID fetching instead of `@citation-js/plugin-pubmed`.

API endpoint: `https://pmc.ncbi.nlm.nih.gov/api/ctxp/v1/pubmed/?format=csl&id={PMID}`

Configuration via environment variables (priority) or config file:

| Environment Variable | Config File Key | Description |
|---------------------|-----------------|-------------|
| `PUBMED_EMAIL` | `[pubmed] email` | Contact email (recommended) |
| `PUBMED_API_KEY` | `[pubmed] api_key` | NCBI API key (optional) |

## Rationale

### 1. Direct CSL-JSON Output

PMC Citation Exporter API returns CSL-JSON directly, eliminating the need for format conversion. Example response:

```json
{
  "source": "PubMed",
  "id": "pmid:28012456",
  "title": "...",
  "author": [{"family": "...", "given": "..."}],
  ...
}
```

### 2. No Dependency Conflicts

By implementing PMID fetching directly, we avoid the version incompatibility issue entirely. Other citation-js plugins (bibtex, ris, doi) continue to work normally.

### 3. Official NCBI API

The PMC Citation Exporter is an official NCBI service, ensuring reliability and long-term support.

### 4. Flexible Configuration

Environment variables allow secure handling of credentials without committing them to config files:
- CI/CD pipelines can set `PUBMED_EMAIL` and `PUBMED_API_KEY`
- Local development can use `.env` files (gitignored)
- Config file available for convenience when security is less critical

### 5. Rate Limit Control

With API key configuration, users can benefit from higher rate limits:
- Without API key: 3 requests/second
- With API key: 10 requests/second

## Consequences

### Positive

1. **No dependency conflicts**: Clean dependency tree with all plugins on same core version
2. **Direct CSL-JSON**: No conversion needed, data integrity preserved
3. **Secure configuration**: Environment variables for sensitive credentials
4. **Higher rate limits**: Users with API keys get 10 req/sec vs 3 req/sec
5. **Batch support**: API supports multiple PMIDs per request (`&id=1&id=2`)

### Negative

1. **Custom implementation**: More code to write and maintain vs using a plugin
   - Mitigation: API is simple; mostly HTTP fetch + JSON parsing
2. **Rate limiter needed**: Must implement rate limiting ourselves
   - Mitigation: Simple token bucket or delay-based implementation
3. **ADR-006 partially outdated**: Implementation Notes section lists plugin-pubmed
   - Mitigation: This ADR supersedes that section

### Neutral

1. Configuration adds complexity but also flexibility
2. Network error handling is similar to what plugin-pubmed would require

## Alternatives Considered

### Option A: Use --legacy-peer-deps

**Description**: Install `@citation-js/plugin-pubmed` with `--legacy-peer-deps` flag

**Pros**:
- Zero custom implementation
- Uses existing plugin

**Cons**:
- Peer dependency mismatch may cause runtime errors
- Plugin uses older API patterns (core@0.5-0.6 vs 0.7)
- Technical debt; likely to break on future updates
- npm warns against this approach

**Why rejected**: Risk of subtle bugs outweighs development time savings

### Option B: Downgrade @citation-js/core

**Description**: Use `@citation-js/core@0.6.x` to match plugin-pubmed requirements

**Pros**:
- All plugins on same core version
- No custom implementation

**Cons**:
- Breaks compatibility with other plugins (bibtex, ris, doi require 0.7.x)
- Uses older, less maintained version
- May lack bug fixes and features in 0.7.x

**Why rejected**: Would break more than it fixes

### Option C: Use E-utilities API directly

**Description**: Use NCBI E-utilities (efetch) and convert XML to CSL-JSON

**Pros**:
- Well-documented API
- More granular control

**Cons**:
- Returns XML, requires parsing and conversion to CSL-JSON
- More complex implementation
- CSL-JSON field mapping is non-trivial

**Why rejected**: PMC Citation Exporter returns CSL-JSON directly, eliminating conversion

## Implementation Notes

### Fetcher Module (`src/features/import/fetcher.ts`)

```typescript
interface PubmedConfig {
  email?: string;   // from PUBMED_EMAIL or config
  apiKey?: string;  // from PUBMED_API_KEY or config
}

async function fetchPmid(pmid: string, config: PubmedConfig): Promise<CslJson> {
  const url = new URL('https://pmc.ncbi.nlm.nih.gov/api/ctxp/v1/pubmed/');
  url.searchParams.set('format', 'csl');
  url.searchParams.set('id', pmid);
  if (config.email) url.searchParams.set('email', config.email);
  if (config.apiKey) url.searchParams.set('api_key', config.apiKey);

  const response = await fetch(url);
  if (!response.ok) throw new FetchError(pmid, response.status);
  return response.json();
}
```

### Rate Limiter (`src/features/import/rate-limiter.ts`)

Uses **factory + lazy initialization singleton** pattern.

**Design**:
- `RateLimiter` class with delay-based limiting (track last request, enforce minimum interval)
- `getRateLimiter(api, config)`: Factory returning singleton per API type
- Singletons stored in `Map<string, RateLimiter>`
- `resetRateLimiters()`: Clear singletons for test isolation

**Rate limits**:
| API | Without API Key | With API Key |
|-----|-----------------|--------------|
| PubMed | 3 req/sec (334ms) | 10 req/sec (100ms) |
| Crossref | 50 req/sec (20ms) | - |

**Why this pattern**:
1. Singleton ensures rate limits respected across all requests in a process
2. Shared between CLI and server modes (both call same fetcher)
3. Factory allows configuration-based initialization
4. Lazy initialization defers creation until first use
5. Reset function enables clean test isolation

**Alternatives considered**:
- Pure singleton: Cannot configure based on API key presence
- Dependency injection: More flexible but adds complexity; overkill for this use case
- Per-request limiter: Would not enforce process-wide rate limits

### Config Loading

Priority: Environment variables > Config file > Defaults

```typescript
function loadPubmedConfig(): PubmedConfig {
  return {
    email: process.env.PUBMED_EMAIL ?? config.pubmed?.email,
    apiKey: process.env.PUBMED_API_KEY ?? config.pubmed?.api_key,
  };
}
```

## References

- PMC Citation Exporter API: https://pmc.ncbi.nlm.nih.gov/api/ctxp/
- NCBI E-utilities guidelines: https://www.ncbi.nlm.nih.gov/books/NBK25497/
- citation-js plugin-pubmed: https://www.npmjs.com/package/@citation-js/plugin-pubmed
- ADR-006: Use Citation.js for CSL Processing
