/**
 * Execution Context for CLI Commands
 *
 * Provides a unified interface for CLI commands to interact with the library,
 * regardless of whether running in local or server mode.
 *
 * See: spec/decisions/ADR-009-ilibrary-operations-pattern.md
 */

import type { Config } from "../config/schema.js";
import type { ILibrary } from "../core/library-interface.js";
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
 * Server execution context - uses ServerClient through ILibraryOperations
 *
 * @example
 * ```typescript
 * // Both library and deprecated client are available
 * const results = await context.library.search({ query });
 * // or via deprecated client property
 * const results = await context.client.search({ query });
 * ```
 */
export interface ServerExecutionContext {
  mode: "server";
  library: ILibraryOperations;
  /**
   * @deprecated Use `mode` instead. Will be removed in 12.4.7.12.
   */
  type: "server";
  /**
   * @deprecated Use `library` instead. Will be removed in 12.4.7.12.
   */
  client: ServerClient;
}

/**
 * Local execution context - uses OperationsLibrary wrapping Library
 *
 * @example
 * ```typescript
 * const results = await context.library.search({ query });
 * ```
 */
export interface LocalExecutionContext {
  mode: "local";
  library: ILibraryOperations;
  /**
   * @deprecated Use `mode` instead. Will be removed in 12.4.7.12.
   */
  type: "local";
  /**
   * @deprecated This property only exists in ServerExecutionContext. Will be removed in 12.4.7.12.
   */
  client?: undefined;
}

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
export type ExecutionContext = ServerExecutionContext | LocalExecutionContext;

// ─────────────────────────────────────────────────────────────────────────────
// Deprecated helper functions - Will be removed in 12.4.7.12
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @deprecated Use `context.mode === "server"`. Will be removed in 12.4.7.12.
 */
export function isServerContext(context: ExecutionContext): context is ServerExecutionContext {
  return context.mode === "server";
}

/**
 * @deprecated Use `context.mode === "local"`. Will be removed in 12.4.7.12.
 */
export function isLocalContext(context: ExecutionContext): context is LocalExecutionContext {
  return context.mode === "local";
}

/**
 * @deprecated Use `context.library` directly (it's now ILibraryOperations). Will be removed in 12.4.7.12.
 */
export function getLibrary(context: ExecutionContext): ILibrary {
  return context.library;
}

// ─────────────────────────────────────────────────────────────────────────────
// Main implementation
// ─────────────────────────────────────────────────────────────────────────────

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
      type: "server", // deprecated
      library: client,
      client, // deprecated
    };
  }

  // No server available - load library and wrap with OperationsLibrary
  const library = await loadLibrary(config.library);
  return {
    mode: "local",
    type: "local", // deprecated
    library: new OperationsLibrary(library),
  };
}
