/**
 * Builds the additional help text for the search command.
 * Includes query syntax, field list, case sensitivity rules, and examples.
 */
export function buildSearchHelpText(): string {
  return `
QUERY SYNTAX
  Free text      machine learning       Search all fields (AND logic)
  Phrase         "machine learning"     Exact phrase match
  Field          author:Smith           Search specific field
  Field+Phrase   author:"John Smith"    Field with phrase

FIELDS
  author, title, year, doi, pmid, pmcid, isbn, url, keyword, tag, id

CASE SENSITIVITY
  Consecutive uppercase (2+ letters) is case-sensitive:
    AI    → matches "AI therapy", not "ai therapy"
    RNA   → matches "mRNA synthesis", not "mrna synthesis"
  Other text is case-insensitive:
    api   → matches "API", "api", "Api"

EXAMPLES
  $ ref search "machine learning"
  $ ref search author:Smith year:2020
  $ ref search author:"John Smith" title:introduction
  $ ref search tag:review --sort published --order desc
  $ ref search AI therapy                  # AI is case-sensitive
  $ ref search id:smith2023 --output json
  $ ref search --tui                       # Interactive mode`;
}
