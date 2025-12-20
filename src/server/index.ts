import { Hono } from "hono";
import type { Config } from "../config/schema.js";
import type { Library } from "../core/library.js";
import { createAddRoute } from "./routes/add.js";
import { healthRoute } from "./routes/health.js";
import { createReferencesRoute } from "./routes/references.js";

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
  const referencesRoute = createReferencesRoute(library);
  app.route("/api/references", referencesRoute);

  // Add references route
  const addRoute = createAddRoute(library, config);
  app.route("/api/add", addRoute);

  return app;
}
