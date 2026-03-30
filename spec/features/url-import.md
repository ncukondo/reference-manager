# URL Import

## Purpose

Import web pages (government legislation, guidelines, reports, etc.) as references by fetching the page with a browser, extracting metadata into CSL-JSON, saving the full text as Markdown, and archiving the original page as MHTML or single HTML.

## Overview

Extends the `add` command to accept URLs as input. Uses Playwright (with system Chrome/Chromium) to render pages, extract structured metadata, generate readable Markdown via Readability + Turndown, and create faithful archives via CDP.

## Input Detection

### URL Pattern

Any `http://` or `https://` input that is **not** already detected as a known identifier:

| Input | Detected As |
|-------|------------|
| `https://doi.org/10.xxx` | `doi` (existing) |
| `https://arxiv.org/abs/xxx` | `arxiv` (existing) |
| `https://pubmed.ncbi.nlm.nih.gov/12345678/` | `pmid` (new) |
| `https://pmc.ncbi.nlm.nih.gov/articles/PMC1234567/` | `pmid` (new, via PMCID) |
| `https://elaws.e-gov.go.jp/document?lawid=...` | `url` (new) |
| `https://www.mhlw.go.jp/stf/...` | `url` (new) |

### PubMed URL Detection (new)

| URL Pattern | Extracted Identifier |
|-------------|---------------------|
| `https://pubmed.ncbi.nlm.nih.gov/{PMID}/` | PMID |
| `https://www.ncbi.nlm.nih.gov/pubmed/{PMID}` | PMID |
| `https://pmc.ncbi.nlm.nih.gov/articles/PMC{ID}/` | PMCID (resolve to PMID) |

These are processed through the existing PMID/DOI import pipeline, not the URL import pipeline.

## Processing Pipeline

```
ref add <URL>
  │
  ├─ 1. Launch browser (playwright-core + system Chrome)
  │     └─ page.goto(url, { waitUntil: "networkidle" })
  │
  ├─ 2. Extract metadata (page.evaluate, in-browser)
  │     ├─ JSON-LD (Schema.org)
  │     ├─ citation_* meta tags
  │     ├─ Dublin Core meta tags
  │     ├─ Open Graph meta tags
  │     └─ <title> / HTML fallback
  │
  ├─ 3. Build CSL-JSON item
  │     ├─ Merge metadata with fallback priority
  │     ├─ Infer CSL type from JSON-LD @type
  │     └─ Set URL, accessed date
  │
  ├─ 4. Generate fulltext Markdown
  │     ├─ Readability (in-browser) → clean HTML
  │     └─ Turndown + GFM plugin (Node.js) → fulltext.md
  │
  ├─ 5. Create archive
  │     ├─ MHTML (default): Page.captureSnapshot via CDP
  │     └─ Single HTML (option): inline data URIs
  │
  └─ 6. Register in library
        ├─ Add CSL-JSON item (duplicate detection, ID generation)
        ├─ Attach fulltext.md (role: fulltext)
        └─ Attach archive.mhtml (role: archive)
```

## Metadata Extraction

### Sources (fallback priority)

```
JSON-LD → citation_* → Dublin Core → Open Graph → <title>
```

Higher-priority sources are preferred. Lower-priority sources fill in missing fields only.

### Extraction (in-browser via page.evaluate)

```js
// All metadata extracted in a single page.evaluate call
const meta = await page.evaluate(() => {
  const jsonLd = [...document.querySelectorAll('script[type="application/ld+json"]')]
    .map(el => { try { return JSON.parse(el.textContent); } catch { return null; } })
    .filter(Boolean);
  const citation = Object.fromEntries(
    [...document.querySelectorAll('meta[name^="citation_"]')]
      .map(el => [el.name, el.content]));
  const dc = Object.fromEntries(
    [...document.querySelectorAll('meta[name^="DC."]')]
      .map(el => [el.name, el.content]));
  const og = Object.fromEntries(
    [...document.querySelectorAll('meta[property^="og:"]')]
      .map(el => [el.getAttribute("property"), el.content]));
  return { jsonLd, citation, dc, og, title: document.title };
});
```

### CSL-JSON Field Mapping

| CSL-JSON | JSON-LD | citation_* | Dublin Core | OG / HTML |
|----------|---------|------------|-------------|-----------|
| `title` | `name` | `citation_title` | `DC.title` | `og:title` / `<title>` |
| `author` | `author` | `citation_author` (multiple) | `DC.creator` | — |
| `issued` | `datePublished` / `legislationDate` | `citation_date` / `citation_publication_date` | `DC.date` | — |
| `type` | `@type` mapping (see below) | — | — | `"webpage"` (default) |
| `DOI` | `identifier` (if DOI) | `citation_doi` | `DC.identifier` (if DOI) | — |
| `container-title` | — | `citation_journal_title` | — | — |
| `publisher` | `publisher.name` | — | `DC.publisher` | — |
| `abstract` | `description` | — | `DC.description` | `og:description` |
| `URL` | — | — | — | `page.url()` (always set) |
| `accessed` | — | — | — | current date (always set) |

### JSON-LD @type → CSL type Mapping

| Schema.org @type | CSL type |
|------------------|----------|
| `Legislation` / `LegislationObject` | `legislation` |
| `Report` | `report` |
| `Article` | `article` |
| `ScholarlyArticle` | `article-journal` |
| `NewsArticle` | `article-newspaper` |
| `WebPage` | `webpage` |
| (unmapped / missing) | `webpage` |

## Fulltext Generation

### Readability + Turndown

1. **Readability** runs in the browser context (real DOM, no extra dependency):

```js
const article = await page.evaluate(() => {
  const reader = new Readability(document.cloneNode(true));
  return reader.parse();
});
```

2. **Turndown** converts clean HTML to Markdown in Node.js:

```js
const turndownService = new TurndownService();
turndownService.use(gfm);
const md = turndownService.turndown(article.content);
```

3. If Readability returns `null` (extraction failure), fall back to full page HTML via Turndown.

### Output

Saved as `fulltext.md` with `role: fulltext`.

## Archive

### MHTML (default)

```js
const cdp = await page.context().newCDPSession(page);
const { data } = await cdp.send("Page.captureSnapshot", { format: "mhtml" });
```

Saved as `archive.mhtml` with `role: archive`.

### Single HTML (option)

Inline all resources as data URIs. Saved as `archive.html` with `role: archive`.

### `archive` Role

New reserved role added to `RESERVED_ROLES`. Constraint: **1 file maximum**.

## Attachments

```
attachments/
  └── {id}-{uuid}/
      ├── fulltext.md       ← role: fulltext
      └── archive.mhtml     ← role: archive (default)
      or  archive.html      ← role: archive (--archive-format html)
```

## CLI Interface

### `ref add <URL>`

```bash
# Basic (MHTML archive + Markdown fulltext)
ref add https://elaws.e-gov.go.jp/document?lawid=...

# Archive format: single HTML
ref add https://example.gov/page --archive-format html

# No archive (Markdown fulltext only)
ref add https://example.gov/page --no-archive

# Existing options work as-is
ref add https://example.gov/page --force -o json
```

### New Options (URL input only)

| Option | Description | Default |
|--------|-------------|---------|
| `--archive-format <format>` | Archive format: `mhtml` or `html` | `mhtml` (or config) |
| `--no-archive` | Skip archive creation | `false` |

These options are silently ignored for non-URL inputs.

## Configuration

```toml
[url]
# Archive format: "mhtml" (default) or "html"
archive_format = "mhtml"

# Browser executable path (auto-detected if omitted)
browser_path = ""

# Navigation timeout in seconds
timeout = 30
```

| Setting | Default | Description |
|---------|---------|-------------|
| `url.archive_format` | `"mhtml"` | Default archive format |
| `url.browser_path` | `""` (auto-detect) | Path to Chrome/Chromium executable |
| `url.timeout` | `30` | Page navigation timeout in seconds |

## Dependencies

### New npm packages

| Package | Purpose |
|---------|---------|
| `playwright-core` | Browser automation (uses system Chrome, no bundled browser) |
| `@mozilla/readability` | Main content extraction (injected into browser context) |
| `turndown` | HTML → Markdown conversion |
| `turndown-plugin-gfm` | GFM support (tables, strikethrough) |

### Browser Requirement

Uses `playwright-core` with `channel: "chrome"` to find system-installed Chrome/Chromium. No browser is downloaded automatically.

**Error when browser not found:**

```
Error: Browser not found. URL import requires Chrome or Chromium.

  Install one of the following:

    Google Chrome:  https://www.google.com/chrome/
    Chromium:       sudo apt install chromium-browser   (Ubuntu/Debian)
                    brew install --cask chromium         (macOS)

  Or specify the path manually:

    [url]
    browser_path = "/path/to/chrome"
```

## Error Handling

| Situation | Message | Exit Code |
|-----------|---------|-----------|
| Browser not found | See above | 1 |
| Navigation failed | `Failed to load URL: <url> (<reason>)` | 1 |
| Navigation timeout | `Timeout loading URL: <url> (after <n>s)` | 1 |
| No title extracted | Use URL as title fallback | 0 |
| Readability failed | Fall back to full HTML → Turndown | 0 |
| Archive creation failed | Warn on stderr, continue without archive | 0 |

## Phased Implementation

| Phase | Scope |
|-------|-------|
| 1 | URL detection + PubMed URL detection + Playwright fetch + basic metadata (title, URL, accessed, type: webpage) + Markdown fulltext + MHTML archive + archive role + config + error handling |
| 2 | Full metadata extraction: JSON-LD, citation_*, Dublin Core, Open Graph + CSL type inference |
| 3 | Site-specific adapters (e-Gov, etc.) |

## Related

- `spec/features/add.md` — Add command (extended by this feature)
- `spec/features/attachments.md` — Attachments system (archive role)
- `spec/features/fulltext-retrieval.md` — Fulltext retrieval (similar pipeline pattern)
