import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { ImportResult } from "../../features/operations/library-operations.js";
import type { ILibraryOperations } from "../../features/operations/library-operations.js";

/**
 * Parameters for the add tool
 */
export interface AddToolParams {
  /** Input string or array of strings (PMID, DOI, BibTeX, RIS, CSL-JSON) */
  input: string | string[];
}

/**
 * Format add operation result as text output.
 */
function formatAddResult(result: ImportResult): string {
  const lines: string[] = [];

  if (result.added.length > 0) {
    lines.push(`Added ${result.added.length} reference(s):`);
    for (const item of result.added) {
      const idInfo = item.idChanged ? ` (ID changed from ${item.originalId})` : "";
      lines.push(`  - ${item.id}: ${item.title}${idInfo}`);
    }
  }

  if (result.skipped.length > 0) {
    lines.push(`Skipped ${result.skipped.length} duplicate(s):`);
    for (const item of result.skipped) {
      lines.push(`  - ${item.source} (exists as: ${item.existingId})`);
    }
  }

  if (result.failed.length > 0) {
    lines.push(`Failed ${result.failed.length} input(s):`);
    for (const item of result.failed) {
      lines.push(`  - ${item.source}: ${item.error}`);
    }
  }

  if (lines.length === 0) {
    lines.push("No references were processed.");
  }

  return lines.join("\n");
}

/**
 * Register the add tool with the MCP server.
 *
 * @param server - The MCP server instance
 * @param getLibraryOperations - Function to get the current library operations instance
 */
export function registerAddTool(
  server: McpServer,
  getLibraryOperations: () => ILibraryOperations
): void {
  server.registerTool(
    "add",
    {
      description:
        "Add references to the library. Accepts PMID (e.g., 'PMID:12345678'), DOI (e.g., '10.1234/example'), ISBN (e.g., '978-0-123-45678-9'), BibTeX, RIS, or CSL-JSON format.",
      inputSchema: {
        input: z
          .union([z.string(), z.array(z.string())])
          .describe("Input string or array of strings (PMID, DOI, ISBN, BibTeX, RIS, or CSL-JSON)"),
      },
    },
    async (args: AddToolParams) => {
      const libraryOps = getLibraryOperations();

      // Normalize input to array
      const inputs = Array.isArray(args.input) ? args.input : [args.input];

      // Join inputs and use stdinContent for auto-detection
      // This allows CSL-JSON, BibTeX, RIS to be properly parsed
      const stdinContent = inputs.join("\n");

      const result = await libraryOps.import([], { stdinContent });

      return {
        content: [
          {
            type: "text" as const,
            text: formatAddResult(result),
          },
        ],
      };
    }
  );
}
