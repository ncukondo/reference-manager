import { Hono } from "hono";

/**
 * Health check route.
 * Returns a simple status to verify the server is running.
 */
export const healthRoute = new Hono();

healthRoute.get("/", (c) => {
  return c.json({ status: "ok" });
});
