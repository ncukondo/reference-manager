import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { Library } from "../../core/library.js";
import { registerCiteTool } from "./cite.js";
import { registerListTool } from "./list.js";
import { registerSearchTool } from "./search.js";

/**
 * Register all MVP tools with the MCP server.
 *
 * @param server - The MCP server instance
 * @param getLibrary - Function to get the current library instance
 */
export function registerMvpTools(server: McpServer, getLibrary: () => Library): void {
  registerSearchTool(server, getLibrary);
  registerListTool(server, getLibrary);
  registerCiteTool(server, getLibrary);
}
