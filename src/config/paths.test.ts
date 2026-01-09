import { describe, expect, test } from "vitest";
import { getPaths } from "./paths.js";

describe("getPaths", () => {
  test("returns object with config, data, cache properties", () => {
    const paths = getPaths();
    expect(paths).toHaveProperty("config");
    expect(paths).toHaveProperty("data");
    expect(paths).toHaveProperty("cache");
  });

  test("paths are non-empty strings", () => {
    const paths = getPaths();
    expect(typeof paths.config).toBe("string");
    expect(typeof paths.data).toBe("string");
    expect(typeof paths.cache).toBe("string");
    expect(paths.config.length).toBeGreaterThan(0);
    expect(paths.data.length).toBeGreaterThan(0);
    expect(paths.cache.length).toBeGreaterThan(0);
  });

  test("paths contain 'reference-manager' in the path", () => {
    const paths = getPaths();
    expect(paths.config).toContain("reference-manager");
    expect(paths.data).toContain("reference-manager");
    expect(paths.cache).toContain("reference-manager");
  });
});
