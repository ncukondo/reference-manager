import { Hono } from "hono";
import type { Library } from "../../core/library.js";
import {
  type CiteOperationOptions,
  type CiteResult,
  citeReferences,
} from "../../features/operations/cite.js";

/**
 * Request body schema for cite endpoint
 */
interface CiteRequestBody {
  /** Reference identifiers (IDs or UUIDs) */
  identifiers: string[];
  /** Whether to look up by UUID instead of ID */
  byUuid?: boolean;
  /** Generate in-text citation instead of bibliography */
  inText?: boolean;
  /** Citation style (e.g., "apa", "chicago") */
  style?: string;
  /** Path to custom CSL file */
  cslFile?: string;
  /** Locale for citation formatting */
  locale?: string;
  /** Output format: "text" or "html" */
  format?: "text" | "html";
}

/**
 * Create cite route for generating citations.
 * @param library - Library instance to use for operations
 * @returns Hono app with cite route
 */
export function createCiteRoute(library: Library) {
  const route = new Hono();

  // POST / - Generate citations for identifiers
  route.post("/", async (c) => {
    // Parse request body
    let body: unknown;
    try {
      body = await c.req.json();
    } catch {
      return c.json({ error: "Invalid JSON" }, 400);
    }

    // Validate body is an object
    if (!body || typeof body !== "object") {
      return c.json({ error: "Request body must be an object" }, 400);
    }

    const requestBody = body as CiteRequestBody;

    // Validate identifiers
    if (
      !requestBody.identifiers ||
      !Array.isArray(requestBody.identifiers) ||
      requestBody.identifiers.length === 0
    ) {
      return c.json({ error: "identifiers must be a non-empty array of strings" }, 400);
    }

    // Ensure all identifiers are strings
    if (!requestBody.identifiers.every((id) => typeof id === "string")) {
      return c.json({ error: "All identifiers must be strings" }, 400);
    }

    // Build options for citeReferences, filtering out undefined values
    const options: CiteOperationOptions = {
      identifiers: requestBody.identifiers,
    };
    if (requestBody.byUuid !== undefined) {
      options.byUuid = requestBody.byUuid;
    }
    if (requestBody.inText !== undefined) {
      options.inText = requestBody.inText;
    }
    if (requestBody.style !== undefined) {
      options.style = requestBody.style;
    }
    if (requestBody.cslFile !== undefined) {
      options.cslFile = requestBody.cslFile;
    }
    if (requestBody.locale !== undefined) {
      options.locale = requestBody.locale;
    }
    if (requestBody.format !== undefined) {
      options.format = requestBody.format;
    }

    // Call citeReferences operation
    const result: CiteResult = await citeReferences(library, options);

    return c.json(result);
  });

  return route;
}
