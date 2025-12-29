import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { Config } from "../../config/schema.js";
import type { ILibraryOperations } from "../../features/operations/library-operations.js";
import {
  type SearchSortField,
  type SortOrder,
  searchSortFieldSchema,
  sortOrderSchema,
} from "../../features/pagination/index.js";
import { pickDefined } from "../../utils/object.js";

export interface SearchToolParams {
  query: string;
  sort?: SearchSortField | undefined;
  order?: SortOrder | undefined;
  limit?: number | undefined;
  offset?: number | undefined;
}

/**
 * Register the search tool with the MCP server.
 *
 * @param server - The MCP server instance
 * @param getLibraryOperations - Function to get the current library operations instance
 * @param getConfig - Function to get the current config
 */
export function registerSearchTool(
  server: McpServer,
  getLibraryOperations: () => ILibraryOperations,
  getConfig: () => Config
): void {
  server.registerTool(
    "search",
    {
      description:
        "Search references in the library. Supports query syntax: author:name, year:YYYY, title:text, type:article-journal, tag:name, or free text for full-text search. Supports sorting and pagination.",
      inputSchema: {
        query: z.string().describe("Search query string"),
        sort: searchSortFieldSchema
          .optional()
          .describe(
            "Sort by field: created, updated, published, author, title, relevance (default: updated)"
          ),
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
    async (args: SearchToolParams) => {
      const libraryOps = getLibraryOperations();
      const config = getConfig();

      // Apply default limit from config if not specified
      const limit = args.limit ?? config.mcp.defaultLimit;

      const result = await libraryOps.search({
        query: args.query,
        format: "pretty",
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
