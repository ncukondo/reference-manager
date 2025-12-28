import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { Config } from "../../config/schema.js";
import type { ILibraryOperations } from "../../features/operations/library-operations.js";
import { registerAddTool } from "./add.js";
import { registerCiteTool } from "./cite.js";
import {
  registerFulltextAttachTool,
  registerFulltextDetachTool,
  registerFulltextGetTool,
} from "./fulltext.js";
import { registerListTool } from "./list.js";
import { registerRemoveTool } from "./remove.js";
import { registerSearchTool } from "./search.js";

/**
 * Register all tools with the MCP server.
 *
 * @param server - The MCP server instance
 * @param getLibraryOperations - Function to get the current library operations instance
 * @param getConfig - Function to get the current config (required for fulltext tools)
 */
export function registerAllTools(
  server: McpServer,
  getLibraryOperations: () => ILibraryOperations,
  getConfig: () => Config
): void {
  registerSearchTool(server, getLibraryOperations);
  registerListTool(server, getLibraryOperations);
  registerCiteTool(server, getLibraryOperations);
  registerAddTool(server, getLibraryOperations);
  registerRemoveTool(server, getLibraryOperations);
  registerFulltextAttachTool(server, getLibraryOperations, getConfig);
  registerFulltextGetTool(server, getLibraryOperations, getConfig);
  registerFulltextDetachTool(server, getLibraryOperations, getConfig);
}
