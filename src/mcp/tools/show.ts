/**
 * Show MCP Tool
 *
 * Single-reference detail view for MCP server.
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { Config } from "../../config/schema.js";
import { normalizeReference } from "../../features/format/show-normalizer.js";
import type { ILibraryOperations } from "../../features/operations/library-operations.js";

interface ShowToolParams {
  identifier?: string | undefined;
  uuid?: string | undefined;
}

type ShowToolResult = {
  content: Array<{ type: "text"; text: string }>;
};

export function createShowToolHandler(
  getLibraryOperations: () => ILibraryOperations,
  getConfig: () => Config
): (args: ShowToolParams) => Promise<ShowToolResult> {
  return async (args: ShowToolParams): Promise<ShowToolResult> => {
    const libraryOps = getLibraryOperations();
    const config = getConfig();

    const id = args.uuid ?? args.identifier;
    const idType = args.uuid ? "uuid" : "id";

    if (!id) {
      return {
        content: [{ type: "text" as const, text: "Error: identifier or uuid is required" }],
      };
    }

    const item = await libraryOps.find(id, { idType });

    if (!item) {
      return {
        content: [{ type: "text" as const, text: `Reference not found: ${id}` }],
      };
    }

    const attachmentsDir = config.attachments?.directory;
    const normalizeOpts = attachmentsDir ? { attachmentsDirectory: attachmentsDir } : undefined;
    const normalized = normalizeReference(item, normalizeOpts);

    return {
      content: [{ type: "text" as const, text: JSON.stringify(normalized, null, 2) }],
    };
  };
}

export function registerShowTool(
  server: McpServer,
  getLibraryOperations: () => ILibraryOperations,
  getConfig: () => Config
): void {
  const handler = createShowToolHandler(getLibraryOperations, getConfig);

  server.registerTool(
    "show",
    {
      description:
        "Show detailed information about a single reference. Returns normalized JSON with all metadata, fulltext paths, and attachments. Use identifier (citation key) or uuid to look up.",
      inputSchema: {
        identifier: z.string().optional().describe("Reference citation key (e.g., Smith2020)"),
        uuid: z.string().optional().describe("Reference UUID (alternative to identifier)"),
      },
    },
    async (args: ShowToolParams) => handler(args)
  );
}
