import { spawn } from "node:child_process";
import { afterEach, describe, expect, it, vi } from "vitest";
import { getOpenerCommand, openWithSystemApp } from "./opener.js";

vi.mock("node:child_process", () => ({
  spawn: vi.fn(),
}));

describe("opener", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("getOpenerCommand", () => {
    it("returns 'open' for darwin (macOS)", () => {
      expect(getOpenerCommand("darwin")).toEqual(["open"]);
    });

    it("returns 'xdg-open' for linux", () => {
      expect(getOpenerCommand("linux")).toEqual(["xdg-open"]);
    });

    it("returns 'cmd /c start \"\"' for win32", () => {
      expect(getOpenerCommand("win32")).toEqual(["cmd", "/c", "start", ""]);
    });

    it("throws error for unsupported platform", () => {
      expect(() => getOpenerCommand("freebsd")).toThrow("Unsupported platform: freebsd");
    });
  });

  describe("openWithSystemApp", () => {
    it("spawns opener with file path on macOS", async () => {
      const mockProcess = {
        on: vi.fn((event, callback) => {
          if (event === "close") {
            callback(0);
          }
          return mockProcess;
        }),
        unref: vi.fn(),
      };
      vi.mocked(spawn).mockReturnValue(mockProcess as never);

      await openWithSystemApp("/path/to/file.pdf", "darwin");

      expect(spawn).toHaveBeenCalledWith("open", ["/path/to/file.pdf"], {
        detached: true,
        stdio: "ignore",
      });
      expect(mockProcess.unref).toHaveBeenCalled();
    });

    it("spawns opener with file path on Linux", async () => {
      const mockProcess = {
        on: vi.fn((event, callback) => {
          if (event === "close") {
            callback(0);
          }
          return mockProcess;
        }),
        unref: vi.fn(),
      };
      vi.mocked(spawn).mockReturnValue(mockProcess as never);

      await openWithSystemApp("/path/to/file.pdf", "linux");

      expect(spawn).toHaveBeenCalledWith("xdg-open", ["/path/to/file.pdf"], {
        detached: true,
        stdio: "ignore",
      });
    });

    it("spawns opener with file path on Windows", async () => {
      const mockProcess = {
        on: vi.fn((event, callback) => {
          if (event === "close") {
            callback(0);
          }
          return mockProcess;
        }),
        unref: vi.fn(),
      };
      vi.mocked(spawn).mockReturnValue(mockProcess as never);

      await openWithSystemApp("C:\\path\\to\\file.pdf", "win32");

      expect(spawn).toHaveBeenCalledWith("cmd", ["/c", "start", "", "C:\\path\\to\\file.pdf"], {
        detached: true,
        stdio: "ignore",
      });
    });

    it("rejects when process exits with non-zero code", async () => {
      const mockProcess = {
        on: vi.fn((event, callback) => {
          if (event === "close") {
            callback(1);
          }
          return mockProcess;
        }),
        unref: vi.fn(),
      };
      vi.mocked(spawn).mockReturnValue(mockProcess as never);

      await expect(openWithSystemApp("/path/to/file.pdf", "darwin")).rejects.toThrow(
        "Failed to open file: /path/to/file.pdf"
      );
    });

    it("rejects when process emits error", async () => {
      const mockProcess = {
        on: vi.fn((event, callback) => {
          if (event === "error") {
            callback(new Error("spawn error"));
          }
          return mockProcess;
        }),
        unref: vi.fn(),
      };
      vi.mocked(spawn).mockReturnValue(mockProcess as never);

      await expect(openWithSystemApp("/path/to/file.pdf", "darwin")).rejects.toThrow(
        "Failed to open file: /path/to/file.pdf"
      );
    });
  });
});
