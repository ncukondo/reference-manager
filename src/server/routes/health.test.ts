import { describe, expect, it } from "vitest";
import { healthRoute } from "./health.js";

describe("Health Route", () => {
  it("should export a Hono app", () => {
    expect(healthRoute).toBeDefined();
    expect(typeof healthRoute.fetch).toBe("function");
  });

  it("should return 200 OK for GET /", async () => {
    const req = new Request("http://localhost/");
    const res = await healthRoute.fetch(req);

    expect(res.status).toBe(200);
  });

  it("should return JSON with status ok", async () => {
    const req = new Request("http://localhost/");
    const res = await healthRoute.fetch(req);

    const data = await res.json();
    expect(data).toEqual({ status: "ok" });
  });

  it("should set content-type to application/json", async () => {
    const req = new Request("http://localhost/");
    const res = await healthRoute.fetch(req);

    expect(res.headers.get("content-type")).toContain("application/json");
  });
});
