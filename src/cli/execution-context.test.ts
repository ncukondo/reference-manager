import { beforeEach, describe, expect, test, vi } from "vitest";
import type { Config } from "../config/schema.js";
import type { Library } from "../core/library.js";
import { type ExecutionMode, createExecutionContext } from "./execution-context.js";
import * as serverDetection from "./server-detection.js";

// Mock the server-detection module
vi.mock("./server-detection.js");

describe("execution-context", () => {
  const mockLibraryPath = "/path/to/library.json";
  const mockConfig: Config = {
    library: mockLibraryPath,
    logLevel: "info",
    backup: {
      maxGenerations: 50,
      maxAgeDays: 365,
      directory: "/tmp/backups",
    },
    watch: {
      enabled: true,
      debounceMs: 500,
      pollIntervalMs: 5000,
      retryIntervalMs: 200,
      maxRetries: 10,
    },
    server: {
      autoStart: false,
      autoStopMinutes: 0,
    },
    citation: {
      defaultStyle: "apa",
      cslDirectory: [],
      defaultLocale: "en-US",
      defaultFormat: "text",
    },
  };

  const mockLibrary = {
    getAll: vi.fn(),
    find: vi.fn(),
    add: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
    save: vi.fn(),
    filePath: mockLibraryPath,
  } as unknown as Library;

  const mockLoadLibrary = vi.fn().mockResolvedValue(mockLibrary);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("createExecutionContext", () => {
    test("should return server context when server is available", async () => {
      vi.mocked(serverDetection.getServerConnection).mockResolvedValue({
        baseUrl: "http://localhost:3000",
        pid: 12345,
      });

      const context = await createExecutionContext(mockConfig, mockLoadLibrary);

      expect(context.mode).toBe("server");
      expect(context.library).toBeDefined();
      expect(mockLoadLibrary).not.toHaveBeenCalled();
    });

    test("should return local context when server is not available", async () => {
      vi.mocked(serverDetection.getServerConnection).mockResolvedValue(null);

      const context = await createExecutionContext(mockConfig, mockLoadLibrary);

      expect(context.mode).toBe("local");
      expect(context.library).toBeDefined();
      expect(mockLoadLibrary).toHaveBeenCalledWith(mockLibraryPath);
    });

    test("should not load library when server is available", async () => {
      vi.mocked(serverDetection.getServerConnection).mockResolvedValue({
        baseUrl: "http://localhost:3000",
        pid: 12345,
      });

      await createExecutionContext(mockConfig, mockLoadLibrary);

      // Critical assertion: library should NOT be loaded in server mode
      expect(mockLoadLibrary).not.toHaveBeenCalled();
    });

    test("should create ServerClient in server mode with correct base URL", async () => {
      vi.mocked(serverDetection.getServerConnection).mockResolvedValue({
        baseUrl: "http://localhost:4567",
        pid: 99999,
      });

      const context = await createExecutionContext(mockConfig, mockLoadLibrary);

      expect(context.mode).toBe("server");
      // ServerClient has baseUrl property
      expect((context.library as { baseUrl: string }).baseUrl).toBe("http://localhost:4567");
    });

    test("should create OperationsLibrary in local mode", async () => {
      vi.mocked(serverDetection.getServerConnection).mockResolvedValue(null);

      const context = await createExecutionContext(mockConfig, mockLoadLibrary);

      expect(context.mode).toBe("local");
      // OperationsLibrary wraps the loaded library
      expect(context.library).toBeDefined();
      expect(typeof context.library.search).toBe("function");
      expect(typeof context.library.list).toBe("function");
      expect(typeof context.library.cite).toBe("function");
      expect(typeof context.library.import).toBe("function");
    });
  });

  describe("ExecutionMode type", () => {
    test("should allow 'local' mode", () => {
      const mode: ExecutionMode = "local";
      expect(mode).toBe("local");
    });

    test("should allow 'server' mode", () => {
      const mode: ExecutionMode = "server";
      expect(mode).toBe("server");
    });
  });

  describe("ExecutionContext interface", () => {
    test("should provide ILibraryOperations through library property", async () => {
      vi.mocked(serverDetection.getServerConnection).mockResolvedValue(null);
      const context = await createExecutionContext(mockConfig, mockLoadLibrary);

      // ILibraryOperations methods should be available
      expect(context.library.find).toBeDefined();
      expect(context.library.getAll).toBeDefined();
      expect(context.library.add).toBeDefined();
      expect(context.library.update).toBeDefined();
      expect(context.library.remove).toBeDefined();
      expect(context.library.save).toBeDefined();
      expect(context.library.search).toBeDefined();
      expect(context.library.list).toBeDefined();
      expect(context.library.cite).toBeDefined();
      expect(context.library.import).toBeDefined();
    });

    test("should provide mode for diagnostic purposes", async () => {
      vi.mocked(serverDetection.getServerConnection).mockResolvedValue({
        baseUrl: "http://localhost:3000",
        pid: 12345,
      });
      const context = await createExecutionContext(mockConfig, mockLoadLibrary);

      // Mode should be available for diagnostics/logging
      expect(["local", "server"]).toContain(context.mode);
    });
  });
});
