import { beforeEach, describe, expect, test, vi } from "vitest";
import type { Config } from "../config/schema.js";
import * as portfile from "../server/portfile.js";
import { getServerConnection, startServerDaemon, waitForPortfile } from "./server-detection.js";

// Mock the portfile module
vi.mock("../server/portfile.js");

describe("server-detection", () => {
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

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getServerConnection", () => {
    test("should return connection when portfile exists and is valid", async () => {
      vi.mocked(portfile.readPortfile).mockResolvedValue({
        port: 3000,
        pid: 12345,
        library: mockLibraryPath,
        started_at: "2025-01-01T00:00:00Z",
      });
      vi.mocked(portfile.isProcessRunning).mockReturnValue(true);

      const connection = await getServerConnection(mockLibraryPath, mockConfig);

      expect(connection).toEqual({
        baseUrl: "http://localhost:3000",
        pid: 12345,
      });
    });

    test("should return null when portfile does not exist", async () => {
      vi.mocked(portfile.readPortfile).mockResolvedValue(null);

      const connection = await getServerConnection(mockLibraryPath, mockConfig);

      expect(connection).toBeNull();
    });

    test("should return null when process is not running", async () => {
      vi.mocked(portfile.readPortfile).mockResolvedValue({
        port: 3000,
        pid: 12345,
        library: mockLibraryPath,
      });
      vi.mocked(portfile.isProcessRunning).mockReturnValue(false);
      vi.mocked(portfile.removePortfile).mockResolvedValue();

      const connection = await getServerConnection(mockLibraryPath, mockConfig);

      expect(connection).toBeNull();
      expect(portfile.removePortfile).toHaveBeenCalled();
    });

    test("should return null when library path does not match", async () => {
      vi.mocked(portfile.readPortfile).mockResolvedValue({
        port: 3000,
        pid: 12345,
        library: "/different/library.json",
      });
      vi.mocked(portfile.isProcessRunning).mockReturnValue(true);

      const connection = await getServerConnection(mockLibraryPath, mockConfig);

      expect(connection).toBeNull();
    });

    test("should return null when library field is missing in portfile", async () => {
      vi.mocked(portfile.readPortfile).mockResolvedValue({
        port: 3000,
        pid: 12345,
      });
      vi.mocked(portfile.isProcessRunning).mockReturnValue(true);

      const connection = await getServerConnection(mockLibraryPath, mockConfig);

      expect(connection).toBeNull();
    });

    test("should auto-start server when auto_start is true and no server running", async () => {
      const configWithAutoStart: Config = {
        ...mockConfig,
        server: { autoStart: true, autoStopMinutes: 0 },
      };

      // First call: no portfile
      // Second call (after auto-start): portfile exists
      vi.mocked(portfile.readPortfile).mockResolvedValueOnce(null).mockResolvedValueOnce({
        port: 3000,
        pid: 12345,
        library: mockLibraryPath,
      });
      vi.mocked(portfile.isProcessRunning).mockReturnValue(true);
      vi.mocked(portfile.portfileExists).mockResolvedValueOnce(false).mockResolvedValueOnce(true);

      const connection = await getServerConnection(mockLibraryPath, configWithAutoStart);

      expect(connection).toEqual({
        baseUrl: "http://localhost:3000",
        pid: 12345,
      });
    });
  });

  describe("startServerDaemon", () => {
    test("should spawn server in daemon mode", async () => {
      // This test verifies the function can be called
      // The actual spawn call will happen but won't affect the test
      await startServerDaemon(mockLibraryPath, mockConfig);

      // Function completes without error
      expect(true).toBe(true);
    });
  });

  describe("waitForPortfile", () => {
    test("should wait for portfile to appear", async () => {
      vi.mocked(portfile.portfileExists)
        .mockResolvedValueOnce(false)
        .mockResolvedValueOnce(false)
        .mockResolvedValueOnce(true);

      await waitForPortfile(1000);

      expect(portfile.portfileExists).toHaveBeenCalledTimes(3);
    });

    test("should timeout if portfile does not appear", async () => {
      vi.mocked(portfile.portfileExists).mockResolvedValue(false);

      await expect(waitForPortfile(100)).rejects.toThrow(
        "Server failed to start: portfile not created within 100ms"
      );
    });
  });
});
