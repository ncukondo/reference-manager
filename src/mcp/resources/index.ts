import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ILibraryOperations } from "../../features/operations/library-operations.js";
import {
  registerReferenceResource,
  registerReferencesResource,
  registerStylesResource,
} from "./library.js";

/**
 * Register all resources with the MCP server.
 *
 * @param server - The MCP server instance
 * @param getLibraryOperations - Function to get the current library operations instance
 */
export function registerAllResources(
  server: McpServer,
  getLibraryOperations: () => ILibraryOperations
): void {
  registerReferencesResource(server, getLibraryOperations);
  registerReferenceResource(server, getLibraryOperations);
  registerStylesResource(server);
}
