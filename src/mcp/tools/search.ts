import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { Library } from "../../core/library.js";
import { searchReferences } from "../../features/operations/search.js";

export interface SearchToolParams {
  query: string;
}

/**
 * Register the search tool with the MCP server.
 *
 * @param server - The MCP server instance
 * @param getLibrary - Function to get the current library instance
 */
export function registerSearchTool(server: McpServer, getLibrary: () => Library): void {
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
      const library = getLibrary();
      const result = await searchReferences(library, {
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
