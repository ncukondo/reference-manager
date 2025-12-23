import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { Library } from "../../core/library.js";
import { listReferences } from "../../features/operations/list.js";

export interface ListToolParams {
  format?: "json" | "bibtex" | "pretty" | undefined;
}

/**
 * Register the list tool with the MCP server.
 *
 * @param server - The MCP server instance
 * @param getLibrary - Function to get the current library instance
 */
export function registerListTool(server: McpServer, getLibrary: () => Library): void {
  server.registerTool(
    "list",
    {
      description: "List all references in the library. Supports different output formats.",
      inputSchema: {
        format: z
          .enum(["json", "bibtex", "pretty"])
          .optional()
          .describe("Output format: json, bibtex, or pretty (default: pretty)"),
      },
    },
    async (args: ListToolParams) => {
      const library = getLibrary();
      const result = listReferences(library, {
        format: args.format ?? "pretty",
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
