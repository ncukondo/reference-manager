import { Hono } from "hono";
import type { Library } from "../core/library.js";
import { healthRoute } from "./routes/health.js";
import { createReferencesRoute } from "./routes/references.js";

/**
 * Create the main Hono server application.
 * @param library - Library instance for the references API
 * @returns Hono application
 */
export function createServer(library: Library) {
  const app = new Hono();

  // Health check route
  app.route("/health", healthRoute);

  // References API routes
  const referencesRoute = createReferencesRoute(library);
  app.route("/api/references", referencesRoute);

  return app;
}
