import { Hono } from "hono";
import type { Config } from "../../config/schema.js";
import type { Library } from "../../core/library.js";
import type { InputFormat } from "../../features/import/detector.js";
import type { PubmedConfig } from "../../features/import/fetcher.js";
import { type AddReferencesOptions, addReferences } from "../../features/operations/add.js";

/**
 * Build PubmedConfig from config, filtering out undefined values
 * to satisfy exactOptionalPropertyTypes requirements.
 */
function buildPubmedConfig(config: Config): PubmedConfig {
  const pubmedConfig: PubmedConfig = {};
  if (config.pubmed.email !== undefined) {
    pubmedConfig.email = config.pubmed.email;
  }
  if (config.pubmed.apiKey !== undefined) {
    pubmedConfig.apiKey = config.pubmed.apiKey;
  }
  return pubmedConfig;
}

/**
 * Create add route for importing references.
 * @param library - Library instance to use for operations
 * @param config - Configuration with PubMed settings
 * @returns Hono app with add route
 */
export function createAddRoute(library: Library, config: Config) {
  const route = new Hono();

  // POST / - Add references from inputs
  route.post("/", async (c) => {
    // Parse request body
    let body: unknown;
    try {
      body = await c.req.json();
    } catch {
      return c.json({ error: "Invalid JSON" }, 400);
    }

    // Validate inputs
    if (!body || typeof body !== "object") {
      return c.json({ error: "Request body must be an object" }, 400);
    }

    const { inputs, options } = body as {
      inputs?: unknown;
      options?: { force?: boolean; format?: string };
    };

    if (!inputs || !Array.isArray(inputs) || inputs.length === 0) {
      return c.json({ error: "inputs must be a non-empty array of strings" }, 400);
    }

    // Ensure all inputs are strings
    if (!inputs.every((input) => typeof input === "string")) {
      return c.json({ error: "All inputs must be strings" }, 400);
    }

    // Build options
    const addOptions: AddReferencesOptions = {
      force: options?.force ?? false,
      pubmedConfig: buildPubmedConfig(config),
    };

    if (options?.format) {
      addOptions.format = options.format as InputFormat | "auto";
    }

    // Call addReferences
    const result = await addReferences(inputs as string[], library, addOptions);

    return c.json(result);
  });

  return route;
}
