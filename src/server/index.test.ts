import { promises as fs } from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Config } from "../config/schema.js";
import { Library } from "../core/library.js";
import { createServer } from "./index.js";

describe("Server", () => {
  let testLibraryPath: string;
  let testPortfilePath: string;
  let library: Library;
  let config: Config;

  beforeAll(async () => {
    // Create test library
    const tmpDir = os.tmpdir();
    testLibraryPath = path.join(tmpDir, `test-library-server-${Date.now()}.json`);
    testPortfilePath = path.join(tmpDir, `test-server-${Date.now()}.port`);

    // Initialize with empty library file
    await fs.writeFile(testLibraryPath, "[]", "utf-8");
    library = await Library.load(testLibraryPath);

    // Create minimal config
    config = {
      library: testLibraryPath,
      logLevel: "info",
      backup: { enabled: true, maxBackups: 5 },
      watch: { enabled: false, debounceMs: 1000 },
      server: { host: "127.0.0.1", port: 0 },
      citation: { style: "apa", locale: "en-US", format: "text" },
      pubmed: {},
    };
  });

  afterAll(async () => {
    // Clean up
    try {
      await fs.unlink(testLibraryPath);
      await fs.unlink(testPortfilePath);
    } catch {
      // Ignore
    }
  });

  it("should create a Hono app", () => {
    const app = createServer(library, config);
    expect(app).toBeDefined();
    expect(typeof app.fetch).toBe("function");
  });

  it("should have health route at /health", async () => {
    const app = createServer(library, config);
    const req = new Request("http://localhost/health");
    const res = await app.fetch(req);

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toEqual({ status: "ok" });
  });

  it("should have references routes at /api/references", async () => {
    const app = createServer(library, config);
    const req = new Request("http://localhost/api/references");
    const res = await app.fetch(req);

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(Array.isArray(data)).toBe(true);
  });

  it("should have add route at /api/add", async () => {
    const app = createServer(library, config);
    const req = new Request("http://localhost/api/add", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ inputs: [] }),
    });
    const res = await app.fetch(req);

    // Empty inputs should return 400
    expect(res.status).toBe(400);
  });
});
