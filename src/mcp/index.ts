import type { Readable, Writable } from "node:stream";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import packageJson from "../../package.json" with { type: "json" };
import { type McpContext, createMcpContext } from "./context.js";

export interface CreateMcpServerOptions {
  configPath: string;
  libraryPath?: string;
  stdin?: Readable;
  stdout?: Writable;
}

export interface McpServerResult {
  server: McpServer;
  context: McpContext;
  serverInfo: { name: string; version: string };
  dispose: () => Promise<void>;
}

export async function createMcpServer(options: CreateMcpServerOptions): Promise<McpServerResult> {
  // Server info from package.json
  const serverInfo = {
    name: packageJson.name,
    version: packageJson.version,
  };

  // Create MCP context (library, config, file watcher)
  const contextOptions: Parameters<typeof createMcpContext>[0] = {
    configPath: options.configPath,
  };
  if (options.libraryPath !== undefined) {
    contextOptions.libraryPath = options.libraryPath;
  }
  const context = await createMcpContext(contextOptions);

  // Create MCP server
  const server = new McpServer(serverInfo);

  // Create stdio transport
  const transport = new StdioServerTransport(
    options.stdin ?? process.stdin,
    options.stdout ?? process.stdout
  );

  // Connect server to transport
  await server.connect(transport);

  // Create dispose function
  const dispose = async (): Promise<void> => {
    await server.close();
    await context.dispose();
  };

  return {
    server,
    context,
    serverInfo,
    dispose,
  };
}
