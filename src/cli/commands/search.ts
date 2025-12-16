import type { CslItem } from "../../core/csl-json/types.js";
import { Reference } from "../../core/reference.js";
import { search as searchReferences } from "../../features/search/matcher.js";
import { sortResults } from "../../features/search/sorter.js";
import { tokenize } from "../../features/search/tokenizer.js";
import { formatBibtex } from "../output/bibtex.js";
import { formatJson } from "../output/json.js";
import { formatPretty } from "../output/pretty.js";

export interface SearchOptions {
  json?: boolean;
  idsOnly?: boolean;
  uuid?: boolean;
  bibtex?: boolean;
}

/**
 * Search references in the library.
 *
 * @param items - Array of CSL items
 * @param query - Search query string
 * @param options - Output format options
 */
export async function search(
  items: CslItem[],
  query: string,
  options: SearchOptions
): Promise<void> {
  // Check for conflicting output options
  const outputOptions = [options.json, options.idsOnly, options.uuid, options.bibtex].filter(
    Boolean
  );

  if (outputOptions.length > 1) {
    throw new Error(
      "Multiple output formats specified. Only one of --json, --ids-only, --uuid, --bibtex can be used."
    );
  }

  // Tokenize query
  const searchQuery = tokenize(query);

  // Search
  const results = searchReferences(items, searchQuery.tokens);

  // Sort results
  const sorted = sortResults(results);

  // Extract items from results
  const matchedItems = sorted.map((result) => result.reference);

  // Convert to References for output formatters
  const references = matchedItems.map((item) => new Reference(item));

  // Output based on selected format
  if (options.json) {
    process.stdout.write(formatJson(references));
  } else if (options.idsOnly) {
    for (const item of matchedItems) {
      process.stdout.write(`${item.id}\n`);
    }
  } else if (options.uuid) {
    for (const item of matchedItems) {
      if (item.custom) {
        process.stdout.write(`${item.custom.uuid}\n`);
      }
    }
  } else if (options.bibtex) {
    process.stdout.write(formatBibtex(references));
  } else {
    // Default: pretty format
    process.stdout.write(formatPretty(references));
  }
}
