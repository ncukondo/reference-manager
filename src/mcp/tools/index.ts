import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { Config } from "../../config/schema.js";
import type { Library } from "../../core/library.js";
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
 * @param getLibrary - Function to get the current library instance
 * @param getConfig - Function to get the current config (required for fulltext tools)
 */
export function registerAllTools(
  server: McpServer,
  getLibrary: () => Library,
  getConfig: () => Config
): void {
  registerSearchTool(server, getLibrary);
  registerListTool(server, getLibrary);
  registerCiteTool(server, getLibrary);
  registerAddTool(server, getLibrary);
  registerRemoveTool(server, getLibrary);
  registerFulltextAttachTool(server, getLibrary, getConfig);
  registerFulltextGetTool(server, getLibrary, getConfig);
  registerFulltextDetachTool(server, getLibrary, getConfig);
}
