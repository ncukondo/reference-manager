import { loadConfig } from "../config/loader.js";
import type { Config } from "../config/schema.js";
import { Library } from "../core/library.js";
import { FileWatcher } from "../features/file-watcher/file-watcher.js";

/**
 * MCP context containing library, config, and file watcher.
 * Simplified context for MCP server (no ExecutionContext pattern).
 */
export interface McpContext {
  library: Library;
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

  // Load library
  const library = await Library.load(libraryPath);

  // Create and start file watcher
  const fileWatcher = new FileWatcher(libraryPath, {
    debounceMs: config.watch.debounceMs,
    maxRetries: config.watch.maxRetries,
    retryDelayMs: config.watch.retryIntervalMs,
  });

  // Listen for file changes
  // Library.reload() handles self-write detection via hash comparison
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
    library,
    config,
    fileWatcher,
    dispose,
  };
}
