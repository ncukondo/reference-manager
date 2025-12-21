import { Hono } from "hono";
import type { Config } from "../config/schema.js";
import type { Library } from "../core/library.js";
import { createAddRoute } from "./routes/add.js";
import { createCiteRoute } from "./routes/cite.js";
import { healthRoute } from "./routes/health.js";
import { createListRoute } from "./routes/list.js";
import { createReferencesRoute } from "./routes/references.js";
import { createSearchRoute } from "./routes/search.js";

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

  // Cite route
  const citeRoute = createCiteRoute(library);
  app.route("/api/cite", citeRoute);

  // List route
  const listRoute = createListRoute(library);
  app.route("/api/list", listRoute);

  // Search route
  const searchRoute = createSearchRoute(library);
  app.route("/api/search", searchRoute);

  return app;
}
