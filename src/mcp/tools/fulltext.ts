import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { Config } from "../../config/schema.js";
import type { FulltextSource } from "../../config/schema.js";
import {
  fulltextAttach,
  fulltextConvert,
  fulltextDetach,
  fulltextDiscover,
  fulltextFetch,
  fulltextGet,
} from "../../features/operations/fulltext/index.js";
import type { ILibraryOperations } from "../../features/operations/library-operations.js";

/**
 * Parameters for the fulltext_attach tool
 */
export interface FulltextAttachToolParams {
  /** Reference ID */
  id: string;
  /** Path to the file to attach */
  path: string;
}

/**
 * Parameters for the fulltext_get tool
 */
export interface FulltextGetToolParams {
  /** Reference ID */
  id: string;
}

/**
 * Parameters for the fulltext_detach tool
 */
export interface FulltextDetachToolParams {
  /** Reference ID */
  id: string;
}

/**
 * Register the fulltext_attach tool with the MCP server.
 *
 * @param server - The MCP server instance
 * @param getLibraryOperations - Function to get the current library operations instance
 * @param getConfig - Function to get the current config
 */
export function registerFulltextAttachTool(
  server: McpServer,
  getLibraryOperations: () => ILibraryOperations,
  getConfig: () => Config
): void {
  server.registerTool(
    "fulltext_attach",
    {
      description:
        "Attach a PDF or Markdown file to a reference. The file type is auto-detected from the extension (.pdf or .md).",
      inputSchema: {
        id: z.string().describe("Reference ID"),
        path: z.string().describe("Path to the file to attach"),
      },
    },
    async (args: FulltextAttachToolParams) => {
      const libraryOps = getLibraryOperations();
      const config = getConfig();

      const result = await fulltextAttach(libraryOps, {
        identifier: args.id,
        filePath: args.path,
        force: true, // MCP tools don't support interactive confirmation
        fulltextDirectory: config.attachments.directory,
      });

      if (!result.success) {
        return {
          content: [{ type: "text" as const, text: result.error ?? "Unknown error" }],
          isError: true,
        };
      }

      return {
        content: [
          {
            type: "text" as const,
            text: `Attached ${result.type} to '${args.id}': ${result.filename}`,
          },
        ],
      };
    }
  );
}

/**
 * Register the fulltext_get tool with the MCP server.
 *
 * @param server - The MCP server instance
 * @param getLibraryOperations - Function to get the current library operations instance
 * @param getConfig - Function to get the current config
 */
export function registerFulltextGetTool(
  server: McpServer,
  getLibraryOperations: () => ILibraryOperations,
  getConfig: () => Config
): void {
  server.registerTool(
    "fulltext_get",
    {
      description:
        "Get full-text content for a reference. Returns Markdown content directly, or file path for PDF.",
      inputSchema: {
        id: z.string().describe("Reference ID"),
      },
    },
    async (args: FulltextGetToolParams) => {
      const libraryOps = getLibraryOperations();
      const config = getConfig();
      const preferredType = config.fulltext?.preferredType;

      // First, check what types are attached
      const pathResult = await fulltextGet(libraryOps, {
        identifier: args.id,
        fulltextDirectory: config.attachments.directory,
        ...(preferredType && { preferredType }),
      });

      if (!pathResult.success) {
        return {
          content: [{ type: "text" as const, text: pathResult.error ?? "Unknown error" }],
          isError: true,
        };
      }

      const responses: Array<{ type: "text"; text: string }> = [];

      // For Markdown, return content directly
      if (pathResult.paths?.markdown) {
        const contentResult = await fulltextGet(libraryOps, {
          identifier: args.id,
          type: "markdown",
          stdout: true,
          fulltextDirectory: config.attachments.directory,
        });

        if (contentResult.success && contentResult.content) {
          responses.push({
            type: "text" as const,
            text: contentResult.content.toString("utf-8"),
          });
        }
      }

      // For PDF, return path only (as per spec: PDFs are too large for inline delivery)
      if (pathResult.paths?.pdf) {
        responses.push({
          type: "text" as const,
          text: `PDF: ${pathResult.paths.pdf}`,
        });
      }

      if (responses.length === 0) {
        return {
          content: [{ type: "text" as const, text: `No fulltext attached to '${args.id}'` }],
          isError: true,
        };
      }

      return { content: responses };
    }
  );
}

/**
 * Register the fulltext_detach tool with the MCP server.
 *
 * @param server - The MCP server instance
 * @param getLibraryOperations - Function to get the current library operations instance
 * @param getConfig - Function to get the current config
 */
export function registerFulltextDetachTool(
  server: McpServer,
  getLibraryOperations: () => ILibraryOperations,
  getConfig: () => Config
): void {
  server.registerTool(
    "fulltext_detach",
    {
      description:
        "Detach full-text files from a reference. Removes both PDF and Markdown attachments.",
      inputSchema: {
        id: z.string().describe("Reference ID"),
      },
    },
    async (args: FulltextDetachToolParams) => {
      const libraryOps = getLibraryOperations();
      const config = getConfig();

      const result = await fulltextDetach(libraryOps, {
        identifier: args.id,
        fulltextDirectory: config.attachments.directory,
      });

      if (!result.success) {
        return {
          content: [{ type: "text" as const, text: result.error ?? "Unknown error" }],
          isError: true,
        };
      }

      const detachedTypes = result.detached?.join(", ") ?? "none";
      return {
        content: [
          {
            type: "text" as const,
            text: `Detached from '${args.id}': ${detachedTypes}`,
          },
        ],
      };
    }
  );
}

/**
 * Parameters for the fulltext_discover tool
 */
export interface FulltextDiscoverToolParams {
  /** Reference ID */
  id: string;
}

/**
 * Register the fulltext_discover tool with the MCP server.
 */
export function registerFulltextDiscoverTool(
  server: McpServer,
  getLibraryOperations: () => ILibraryOperations,
  getConfig: () => Config
): void {
  server.registerTool(
    "fulltext_discover",
    {
      description:
        "Check Open Access (OA) availability for a reference. Returns available sources and URLs.",
      inputSchema: {
        id: z.string().describe("Reference ID"),
      },
    },
    async (args: FulltextDiscoverToolParams) => {
      const libraryOps = getLibraryOperations();
      const config = getConfig();

      const result = await fulltextDiscover(libraryOps, {
        identifier: args.id,
        fulltextConfig: config.fulltext,
      });

      if (!result.success) {
        return {
          content: [{ type: "text" as const, text: result.error ?? "Unknown error" }],
          isError: true,
        };
      }

      if (!result.locations || result.locations.length === 0) {
        return {
          content: [{ type: "text" as const, text: `No OA sources found for '${args.id}'` }],
        };
      }

      const lines: string[] = [`OA sources for '${args.id}' (status: ${result.oaStatus}):`];
      for (const loc of result.locations) {
        lines.push(`  ${loc.source}: ${loc.url} (${loc.urlType})`);
      }

      return {
        content: [{ type: "text" as const, text: lines.join("\n") }],
      };
    }
  );
}

/**
 * Parameters for the fulltext_fetch tool
 */
export interface FulltextFetchToolParams {
  /** Reference ID */
  id: string;
  /** Preferred source (optional) */
  source?: string | undefined;
  /** Force overwrite existing (optional) */
  force?: boolean | undefined;
}

/**
 * Register the fulltext_fetch tool with the MCP server.
 */
export function registerFulltextFetchTool(
  server: McpServer,
  getLibraryOperations: () => ILibraryOperations,
  getConfig: () => Config
): void {
  server.registerTool(
    "fulltext_fetch",
    {
      description:
        "Download and attach Open Access full-text for a reference. Automatically discovers OA sources, downloads PDF/XML, converts PMC XML to Markdown, and attaches files.",
      inputSchema: {
        id: z.string().describe("Reference ID"),
        source: z
          .enum(["pmc", "arxiv", "unpaywall", "core"])
          .optional()
          .describe("Preferred source (optional)"),
        force: z.boolean().optional().describe("Force overwrite existing attachment"),
      },
    },
    async (args: FulltextFetchToolParams) => {
      const libraryOps = getLibraryOperations();
      const config = getConfig();

      const result = await fulltextFetch(libraryOps, {
        identifier: args.id,
        fulltextConfig: config.fulltext,
        fulltextDirectory: config.attachments.directory,
        source: args.source as FulltextSource | undefined,
        force: args.force,
      });

      if (!result.success) {
        return {
          content: [{ type: "text" as const, text: result.error ?? "Unknown error" }],
          isError: true,
        };
      }

      const files = result.attachedFiles?.join(", ") ?? "none";
      return {
        content: [
          {
            type: "text" as const,
            text: `Fetched fulltext for '${args.id}' from ${result.source}: ${files}`,
          },
        ],
      };
    }
  );
}

/**
 * Parameters for the fulltext_convert tool
 */
export interface FulltextConvertToolParams {
  /** Reference ID */
  id: string;
}

/**
 * Register the fulltext_convert tool with the MCP server.
 */
export function registerFulltextConvertTool(
  server: McpServer,
  getLibraryOperations: () => ILibraryOperations,
  getConfig: () => Config
): void {
  server.registerTool(
    "fulltext_convert",
    {
      description: "Convert an attached PMC JATS XML file to Markdown for a reference.",
      inputSchema: {
        id: z.string().describe("Reference ID"),
      },
    },
    async (args: FulltextConvertToolParams) => {
      const libraryOps = getLibraryOperations();
      const config = getConfig();

      const result = await fulltextConvert(libraryOps, {
        identifier: args.id,
        fulltextDirectory: config.attachments.directory,
      });

      if (!result.success) {
        return {
          content: [{ type: "text" as const, text: result.error ?? "Unknown error" }],
          isError: true,
        };
      }

      return {
        content: [
          {
            type: "text" as const,
            text: `Converted PMC XML to Markdown for '${args.id}': ${result.filename}`,
          },
        ],
      };
    }
  );
}
