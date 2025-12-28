import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { ILibraryOperations } from "../../features/operations/library-operations.js";

/**
 * Parameters for the remove tool
 */
export interface RemoveToolParams {
  /** Reference ID to remove */
  id: string;
  /** Must be true to actually remove (safety measure) */
  force: boolean;
}

/**
 * Register the remove tool with the MCP server.
 *
 * @param server - The MCP server instance
 * @param getLibraryOperations - Function to get the current library operations instance
 */
export function registerRemoveTool(
  server: McpServer,
  getLibraryOperations: () => ILibraryOperations
): void {
  server.registerTool(
    "remove",
    {
      description:
        "Remove a reference from the library by ID. Requires force: true to execute (safety measure).",
      inputSchema: {
        id: z.string().describe("Reference ID to remove"),
        force: z.boolean().describe("Must be true to actually remove the reference"),
      },
    },
    async (args: RemoveToolParams) => {
      // Safety check: require force to be true
      if (!args.force) {
        return {
          content: [
            {
              type: "text" as const,
              text: "Remove operation requires force: true to execute. This is a safety measure to prevent accidental deletions.",
            },
          ],
        };
      }

      const libraryOps = getLibraryOperations();
      const result = await libraryOps.remove(args.id);

      if (!result.removed) {
        return {
          content: [
            {
              type: "text" as const,
              text: `Reference not found: ${args.id}`,
            },
          ],
        };
      }

      const title = result.removedItem?.title || "Unknown";
      return {
        content: [
          {
            type: "text" as const,
            text: `Removed reference: ${args.id}\nTitle: ${title}`,
          },
        ],
      };
    }
  );
}
