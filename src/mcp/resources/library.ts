import { ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { BUILTIN_STYLES } from "../../config/csl-styles.js";
import type { ILibraryOperations } from "../../features/operations/library-operations.js";

/**
 * Register the references resource with the MCP server.
 * Returns all references as CSL-JSON.
 *
 * @param server - The MCP server instance
 * @param getLibraryOperations - Function to get the current library operations instance
 */
export function registerReferencesResource(
  server: McpServer,
  getLibraryOperations: () => ILibraryOperations
): void {
  server.registerResource(
    "references",
    "library://references",
    {
      description: "All references in the library as CSL-JSON",
      mimeType: "application/json",
    },
    async (uri) => {
      const libraryOps = getLibraryOperations();
      const items = await libraryOps.getAll();

      return {
        contents: [
          {
            uri: uri.href,
            mimeType: "application/json",
            text: JSON.stringify(items, null, 2),
          },
        ],
      };
    }
  );
}

/**
 * Register the single reference resource with the MCP server.
 * Returns a single reference by ID.
 *
 * @param server - The MCP server instance
 * @param getLibraryOperations - Function to get the current library operations instance
 */
export function registerReferenceResource(
  server: McpServer,
  getLibraryOperations: () => ILibraryOperations
): void {
  const template = new ResourceTemplate("library://reference/{id}", {
    list: async () => {
      const libraryOps = getLibraryOperations();
      const items = await libraryOps.getAll();

      return {
        resources: items.map((item) => ({
          uri: `library://reference/${item.id}`,
          name: item.id,
        })),
      };
    },
  });

  server.registerResource(
    "reference",
    template,
    {
      description: "Single reference by ID as CSL-JSON",
      mimeType: "application/json",
    },
    async (uri, variables) => {
      const libraryOps = getLibraryOperations();
      const id = variables.id as string;
      const item = await libraryOps.find(id);

      if (!item) {
        throw new Error(`Reference not found: ${id}`);
      }

      return {
        contents: [
          {
            uri: uri.href,
            mimeType: "application/json",
            text: JSON.stringify(item, null, 2),
          },
        ],
      };
    }
  );
}

/**
 * Register the styles resource with the MCP server.
 * Returns available citation styles.
 *
 * @param server - The MCP server instance
 */
export function registerStylesResource(server: McpServer): void {
  server.registerResource(
    "styles",
    "library://styles",
    {
      description: "Available citation styles",
      mimeType: "application/json",
    },
    async (uri) => {
      const styles = {
        builtin: [...BUILTIN_STYLES],
        default: "apa",
      };

      return {
        contents: [
          {
            uri: uri.href,
            mimeType: "application/json",
            text: JSON.stringify(styles, null, 2),
          },
        ],
      };
    }
  );
}
