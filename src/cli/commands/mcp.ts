import type { Readable, Writable } from "node:stream";
import { type McpServerResult, createMcpServer } from "../../mcp/index.js";

export interface McpStartOptions {
  configPath: string;
  libraryPath?: string;
  stdin?: Readable;
  stdout?: Writable;
}

/**
 * Start MCP stdio server.
 *
 * @param options - MCP server options
 * @returns MCP server result with dispose function
 */
export async function mcpStart(options: McpStartOptions): Promise<McpServerResult> {
  const serverOptions: Parameters<typeof createMcpServer>[0] = {
    configPath: options.configPath,
  };
  if (options.libraryPath !== undefined) {
    serverOptions.libraryPath = options.libraryPath;
  }
  if (options.stdin !== undefined) {
    serverOptions.stdin = options.stdin;
  }
  if (options.stdout !== undefined) {
    serverOptions.stdout = options.stdout;
  }

  const result = await createMcpServer(serverOptions);
  return result;
}
