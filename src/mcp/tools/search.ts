import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { ILibraryOperations } from "../../features/operations/library-operations.js";

export interface SearchToolParams {
  query: string;
}

/**
 * Register the search tool with the MCP server.
 *
 * @param server - The MCP server instance
 * @param getLibraryOperations - Function to get the current library operations instance
 */
export function registerSearchTool(
  server: McpServer,
  getLibraryOperations: () => ILibraryOperations
): void {
  server.registerTool(
    "search",
    {
      description:
        "Search references in the library. Supports query syntax: author:name, year:YYYY, title:text, type:article-journal, tag:name, or free text for full-text search.",
      inputSchema: {
        query: z.string().describe("Search query string"),
      },
    },
    async (args: SearchToolParams) => {
      const libraryOps = getLibraryOperations();
      const result = await libraryOps.search({
        query: args.query,
        format: "pretty",
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
