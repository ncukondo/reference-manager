import { Hono } from "hono";
import type { Config } from "../config/schema.js";
import { Library } from "../core/library.js";
import { FileWatcher } from "../features/file-watcher/file-watcher.js";
import { createAddRoute } from "./routes/add.js";
import { createCheckRoute } from "./routes/check.js";
import { createCiteRoute } from "./routes/cite.js";
import { healthRoute } from "./routes/health.js";
import { createListRoute } from "./routes/list.js";
import { createReferencesRoute } from "./routes/references.js";
import { createSearchRoute } from "./routes/search.js";

/**
 * Result of starting a server with file watcher.
 */
export interface ServerWithFileWatcherResult {
  /** The Hono application */
  app: Hono;
  /** The library instance */
  library: Library;
  /** The file watcher instance */
  fileWatcher: FileWatcher;
  /** Dispose function to clean up resources */
  dispose: () => Promise<void>;
}

/**
 * Create the main Hono server application.
 * @param library - Library instance for the references API
 * @param config - Configuration for the server
 * @returns Hono application
 */
export function createServer(library: Library, config: Config) {
  const app = new Hono();

  // Health check route
  app.route("/health", healthRoute);

  // References API routes
  const referencesRoute = createReferencesRoute(library, config);
  app.route("/api/references", referencesRoute);

  // Add references route
  const addRoute = createAddRoute(library, config);
  app.route("/api/add", addRoute);

  // Cite route
  const citeRoute = createCiteRoute(library);
  app.route("/api/cite", citeRoute);

  // List route
  const listRoute = createListRoute(library);
  app.route("/api/list", listRoute);

  // Search route
  const searchRoute = createSearchRoute(library);
  app.route("/api/search", searchRoute);

  // Check route
  const checkRoute = createCheckRoute(library);
  app.route("/api/check", checkRoute);

  return app;
}

/**
 * Start a server with file watcher for automatic library reload.
 * Uses the same pattern as MCP server file monitoring.
 * @param libraryPath - Path to the library file
 * @param config - Configuration for the server
 * @returns Server with file watcher result
 */
export async function startServerWithFileWatcher(
  libraryPath: string,
  config: Config
): Promise<ServerWithFileWatcherResult> {
  // Load library
  const library = await Library.load(libraryPath);

  // Create the Hono app
  const app = createServer(library, config);

  // Create and start file watcher
  const fileWatcher = new FileWatcher(libraryPath, {
    debounceMs: config.watch.debounceMs,
    maxRetries: config.watch.maxRetries,
    retryDelayMs: config.watch.retryIntervalMs,
    pollIntervalMs: config.watch.pollIntervalMs,
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
    app,
    library,
    fileWatcher,
    dispose,
  };
}
