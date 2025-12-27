import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { Library } from "../../core/library.js";
import {
  registerReferenceResource,
  registerReferencesResource,
  registerStylesResource,
} from "./library.js";

/**
 * Register all resources with the MCP server.
 *
 * @param server - The MCP server instance
 * @param getLibrary - Function to get the current library instance
 */
export function registerAllResources(server: McpServer, getLibrary: () => Library): void {
  registerReferencesResource(server, getLibrary);
  registerReferenceResource(server, getLibrary);
  registerStylesResource(server);
}
