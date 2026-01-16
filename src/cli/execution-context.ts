/**
 * Execution Context for CLI Commands
 *
 * Provides a unified interface for CLI commands to interact with the library,
 * regardless of whether running in local or server mode.
 *
 * See: spec/decisions/ADR-009-ilibrary-operations-pattern.md
 */

import type { Config } from "../config/schema.js";
import type { Library } from "../core/library.js";
import type { ILibraryOperations } from "../features/operations/library-operations.js";
import { OperationsLibrary } from "../features/operations/operations-library.js";
import { ServerClient } from "./server-client.js";
import { getServerConnection } from "./server-detection.js";

/**
 * Execution mode indicating whether CLI is using local file access or server API.
 */
export type ExecutionMode = "local" | "server";

/**
 * Unified execution context for CLI commands.
 *
 * Commands use `context.library` for all operations without needing to branch
 * based on execution mode. The `mode` field is available for diagnostics and logging.
 *
 * @example
 * ```typescript
 * // No branching needed - same code works for both modes
 * const results = await context.library.search({ query });
 * console.log(`Mode: ${context.mode}`);
 * ```
 */
export interface ExecutionContext {
  /** Execution mode for diagnostics and logging */
  mode: ExecutionMode;
  /** Unified operations interface - works for both local and server modes */
  library: ILibraryOperations;
}

/**
 * Creates an execution context based on the current configuration.
 *
 * This function checks for an available server connection first.
 * If a server is available, it returns a context with ServerClient.
 * Otherwise, it loads the library and returns a context with OperationsLibrary.
 *
 * @param config - The application configuration
 * @param loadLibrary - Function to load the library (injected for testability)
 * @returns Promise resolving to an ExecutionContext
 */
export async function createExecutionContext(
  config: Config,
  loadLibrary: (path: string) => Promise<Library>
): Promise<ExecutionContext> {
  // Check for server connection first
  const server = await getServerConnection(config.library, config);

  if (server) {
    // Server is available - use ServerClient to avoid loading library
    const client = new ServerClient(server.baseUrl);
    return {
      mode: "server",
      library: client,
    };
  }

  // No server available - load library and wrap with OperationsLibrary
  const library = await loadLibrary(config.library);
  return {
    mode: "local",
    library: new OperationsLibrary(library, config.citation),
  };
}
