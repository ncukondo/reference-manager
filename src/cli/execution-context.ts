/**
 * Execution Context for CLI Commands
 *
 * Provides a discriminated union type to distinguish between server and local execution modes.
 * This enables CLI commands to avoid redundant library loading when a server is available.
 */

import type { Config } from "../config/schema.js";
import type { ILibrary } from "../core/library-interface.js";
import type { Library } from "../core/library.js";
import { ServerClient } from "./server-client.js";
import { getServerConnection } from "./server-detection.js";

/**
 * Server execution context - uses ServerClient for operations
 */
export interface ServerExecutionContext {
  type: "server";
  client: ServerClient;
}

/**
 * Local execution context - uses Library directly
 */
export interface LocalExecutionContext {
  type: "local";
  library: Library;
}

/**
 * Discriminated union type for execution context.
 * Commands can use this to determine whether to use server or local operations.
 *
 * @example
 * ```typescript
 * if (context.type === "server") {
 *   // Use context.client for server operations
 *   const result = await context.client.list(options);
 * } else {
 *   // Use context.library for local operations
 *   const items = context.library.getAll();
 * }
 * ```
 */
export type ExecutionContext = ServerExecutionContext | LocalExecutionContext;

/**
 * Creates an execution context based on the current configuration.
 *
 * This function checks for an available server connection first.
 * If a server is available, it returns a server context to avoid loading the library.
 * Otherwise, it loads the library and returns a local context.
 *
 * @param config - The application configuration
 * @param loadLibrary - Function to load the library (injected for testability)
 * @returns Promise resolving to either a server or local execution context
 */
export async function createExecutionContext(
  config: Config,
  loadLibrary: (path: string) => Promise<Library>
): Promise<ExecutionContext> {
  // Check for server connection first
  const server = await getServerConnection(config.library, config);

  if (server) {
    // Server is available - use server context to avoid loading library
    return {
      type: "server",
      client: new ServerClient(server.baseUrl),
    };
  }

  // No server available - load library for local operations
  const library = await loadLibrary(config.library);
  return {
    type: "local",
    library,
  };
}

/**
 * Type guard to check if context is a server context
 */
export function isServerContext(context: ExecutionContext): context is ServerExecutionContext {
  return context.type === "server";
}

/**
 * Type guard to check if context is a local context
 */
export function isLocalContext(context: ExecutionContext): context is LocalExecutionContext {
  return context.type === "local";
}

/**
 * Get ILibrary from execution context.
 *
 * Both Library (local) and ServerClient (server) implement ILibrary,
 * allowing operations to work uniformly regardless of execution mode.
 *
 * @param context - The execution context
 * @returns ILibrary instance (either Library or ServerClient)
 */
export function getLibrary(context: ExecutionContext): ILibrary {
  return context.type === "server" ? context.client : context.library;
}
