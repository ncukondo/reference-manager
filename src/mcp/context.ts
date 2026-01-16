import { loadConfig } from "../config/loader.js";
import type { Config } from "../config/schema.js";
import { Library } from "../core/library.js";
import { FileWatcher } from "../features/file-watcher/file-watcher.js";
import type { ILibraryOperations } from "../features/operations/library-operations.js";
import { OperationsLibrary } from "../features/operations/operations-library.js";

/**
 * MCP context containing libraryOperations, config, and file watcher.
 * Uses ILibraryOperations pattern for consistency with CLI (see ADR-009, ADR-010).
 */
export interface McpContext {
  libraryOperations: ILibraryOperations;
  config: Config;
  fileWatcher: FileWatcher;
  dispose: () => Promise<void>;
}

export interface CreateMcpContextOptions {
  configPath: string;
  libraryPath?: string;
}

export async function createMcpContext(options: CreateMcpContextOptions): Promise<McpContext> {
  // Load config from specified path
  const config = await loadConfig({
    userConfigPath: options.configPath,
  });

  // Determine library path (override or from config)
  const libraryPath = options.libraryPath ?? config.library;

  // Load library (kept internally for reload())
  const library = await Library.load(libraryPath);

  // Wrap library with OperationsLibrary for ILibraryOperations interface
  const libraryOperations = new OperationsLibrary(library, config.citation);

  // Create and start file watcher
  const fileWatcher = new FileWatcher(libraryPath, {
    debounceMs: config.watch.debounceMs,
    maxRetries: config.watch.maxRetries,
    retryDelayMs: config.watch.retryIntervalMs,
  });

  // Listen for file changes
  // Library.reload() handles self-write detection via hash comparison
  // Note: We use the internal library instance for reload(), not libraryOperations
  fileWatcher.on("change", () => {
    library.reload().catch((error) => {
      // Log error but don't crash - library continues with previous state
      console.error("Failed to reload library:", error);
    });
  });

  await fileWatcher.start();

  // Create dispose function
  const dispose = async (): Promise<void> => {
    fileWatcher.close();
  };

  return {
    libraryOperations,
    config,
    fileWatcher,
    dispose,
  };
}
