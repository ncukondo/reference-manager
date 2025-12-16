import type { CslItem } from "../../core/csl-json/types.js";
import { Reference } from "../../core/reference.js";
import { formatBibtex } from "../output/bibtex.js";
import { formatJson } from "../output/json.js";
import { formatPretty } from "../output/pretty.js";

export interface ListOptions {
  json?: boolean;
  idsOnly?: boolean;
  uuid?: boolean;
  bibtex?: boolean;
}

/**
 * List all references in the library.
 *
 * @param items - Array of CSL items
 * @param options - Output format options
 */
export async function list(items: CslItem[], options: ListOptions): Promise<void> {
  // Check for conflicting output options
  const outputOptions = [options.json, options.idsOnly, options.uuid, options.bibtex].filter(
    Boolean
  );

  if (outputOptions.length > 1) {
    throw new Error(
      "Multiple output formats specified. Only one of --json, --ids-only, --uuid, --bibtex can be used."
    );
  }

  // Convert CslItems to References for output formatters
  const references = items.map((item) => new Reference(item));

  // Output based on selected format
  if (options.json) {
    process.stdout.write(formatJson(references));
  } else if (options.idsOnly) {
    for (const item of items) {
      process.stdout.write(`${item.id}\n`);
    }
  } else if (options.uuid) {
    for (const item of items) {
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
