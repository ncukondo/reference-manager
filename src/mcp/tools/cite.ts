import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { Library } from "../../core/library.js";
import { citeReferences } from "../../features/operations/cite.js";

export interface CiteToolParams {
  ids: string[];
  style?: string | undefined;
  format?: "text" | "html" | undefined;
}

/**
 * Register the cite tool with the MCP server.
 *
 * @param server - The MCP server instance
 * @param getLibrary - Function to get the current library instance
 */
export function registerCiteTool(server: McpServer, getLibrary: () => Library): void {
  server.registerTool(
    "cite",
    {
      description:
        "Generate formatted citation for references. Supports various citation styles (APA, Vancouver, etc.) and output formats.",
      inputSchema: {
        ids: z.array(z.string()).describe("Array of reference IDs to cite"),
        style: z
          .string()
          .optional()
          .describe("Citation style (e.g., apa, vancouver). Default: apa"),
        format: z
          .enum(["text", "html"])
          .optional()
          .describe("Output format: text or html. Default: text"),
      },
    },
    async (args: CiteToolParams) => {
      const library = getLibrary();
      const result = await citeReferences(library, {
        identifiers: args.ids,
        style: args.style ?? "apa",
        format: args.format ?? "text",
      });

      return {
        content: result.results.map((item) => ({
          type: "text" as const,
          text: item.success ? item.citation : `Error: ${item.identifier} not found`,
        })),
      };
    }
  );
}
