import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { Config } from "../../config/schema.js";
import type { ILibraryOperations } from "../../features/operations/library-operations.js";
import {
  type SortField,
  type SortOrder,
  sortFieldSchema,
  sortOrderSchema,
} from "../../features/pagination/index.js";
import { pickDefined } from "../../utils/object.js";

export interface ListToolParams {
  format?: "json" | "bibtex" | "pretty" | undefined;
  sort?: SortField | undefined;
  order?: SortOrder | undefined;
  limit?: number | undefined;
  offset?: number | undefined;
}

/**
 * Register the list tool with the MCP server.
 *
 * @param server - The MCP server instance
 * @param getLibraryOperations - Function to get the current library operations instance
 * @param getConfig - Function to get the current config
 */
export function registerListTool(
  server: McpServer,
  getLibraryOperations: () => ILibraryOperations,
  getConfig: () => Config
): void {
  server.registerTool(
    "list",
    {
      description:
        "List references in the library. Supports different output formats, sorting, and pagination.",
      inputSchema: {
        format: z
          .enum(["json", "bibtex", "pretty"])
          .optional()
          .describe("Output format: json, bibtex, or pretty (default: pretty)"),
        sort: sortFieldSchema
          .optional()
          .describe("Sort by field: created, updated, published, author, title (default: updated)"),
        order: sortOrderSchema.optional().describe("Sort order: asc or desc (default: desc)"),
        limit: z
          .number()
          .int()
          .min(0)
          .optional()
          .describe("Maximum number of results (0 = no limit)"),
        offset: z
          .number()
          .int()
          .min(0)
          .optional()
          .describe("Number of results to skip (default: 0)"),
      },
    },
    async (args: ListToolParams) => {
      const libraryOps = getLibraryOperations();
      const config = getConfig();

      // Apply default limit from config if not specified
      const limit = args.limit ?? config.mcp.defaultLimit;

      const result = await libraryOps.list({
        format: args.format ?? "pretty",
        limit,
        ...pickDefined(args, ["sort", "order", "offset"] as const),
      });

      return {
        content: result.items.map((item) => ({
          type: "text" as const,
          text: item,
        })),
      };
    }
  );
}
