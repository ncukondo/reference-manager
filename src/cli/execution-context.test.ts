import { beforeEach, describe, expect, test, vi } from "vitest";
import type { Config } from "../config/schema.js";
import type { Library } from "../core/library.js";
import {
  type ExecutionContext,
  createExecutionContext,
  isLocalContext,
  isServerContext,
} from "./execution-context.js";
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
  };

  const mockLibrary = {
    getAll: vi.fn(),
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

      expect(context.type).toBe("server");
      expect(context).toHaveProperty("client");
      expect(mockLoadLibrary).not.toHaveBeenCalled();
    });

    test("should return local context when server is not available", async () => {
      vi.mocked(serverDetection.getServerConnection).mockResolvedValue(null);

      const context = await createExecutionContext(mockConfig, mockLoadLibrary);

      expect(context.type).toBe("local");
      expect(context).toHaveProperty("library");
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

    test("should create ServerClient with correct base URL", async () => {
      vi.mocked(serverDetection.getServerConnection).mockResolvedValue({
        baseUrl: "http://localhost:4567",
        pid: 99999,
      });

      const context = await createExecutionContext(mockConfig, mockLoadLibrary);

      expect(context.type).toBe("server");
      if (context.type === "server") {
        expect(context.client.baseUrl).toBe("http://localhost:4567");
      }
    });
  });

  describe("isServerContext", () => {
    test("should return true for server context", () => {
      const context: ExecutionContext = {
        type: "server",
        client: { baseUrl: "http://localhost:3000" },
      } as ExecutionContext;

      expect(isServerContext(context)).toBe(true);
    });

    test("should return false for local context", () => {
      const context: ExecutionContext = {
        type: "local",
        library: mockLibrary,
      };

      expect(isServerContext(context)).toBe(false);
    });
  });

  describe("isLocalContext", () => {
    test("should return true for local context", () => {
      const context: ExecutionContext = {
        type: "local",
        library: mockLibrary,
      };

      expect(isLocalContext(context)).toBe(true);
    });

    test("should return false for server context", () => {
      const context: ExecutionContext = {
        type: "server",
        client: { baseUrl: "http://localhost:3000" },
      } as ExecutionContext;

      expect(isLocalContext(context)).toBe(false);
    });
  });

  describe("discriminated union pattern", () => {
    test("should allow type narrowing with if statement", async () => {
      vi.mocked(serverDetection.getServerConnection).mockResolvedValue(null);
      const context = await createExecutionContext(mockConfig, mockLoadLibrary);

      // TypeScript should narrow the type based on context.type
      if (context.type === "server") {
        // In server mode, client should be available
        expect(context.client).toBeDefined();
      } else {
        // In local mode, library should be available
        expect(context.library).toBeDefined();
      }
    });
  });
});
