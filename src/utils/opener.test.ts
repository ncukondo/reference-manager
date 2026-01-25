import { spawn } from "node:child_process";
import fs from "node:fs";
import { afterEach, describe, expect, it, vi } from "vitest";
import { getOpenerCommand, isWSL, openWithSystemApp } from "./opener.js";

vi.mock("node:child_process", () => ({
  spawn: vi.fn(),
}));

vi.mock("node:fs", () => ({
  default: {
    existsSync: vi.fn(),
  },
}));

describe("opener", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("isWSL", () => {
    const originalEnv = process.env;

    afterEach(() => {
      process.env = originalEnv;
    });

    it("returns true when WSL_DISTRO_NAME is set", () => {
      process.env = { ...originalEnv, WSL_DISTRO_NAME: "Ubuntu" };
      vi.mocked(fs.existsSync).mockReturnValue(false);
      expect(isWSL()).toBe(true);
    });

    it("returns true when WSLInterop file exists", () => {
      process.env = { ...originalEnv };
      process.env.WSL_DISTRO_NAME = undefined;
      vi.mocked(fs.existsSync).mockReturnValue(true);
      expect(isWSL()).toBe(true);
    });

    it("returns false when not in WSL", () => {
      process.env = { ...originalEnv };
      process.env.WSL_DISTRO_NAME = undefined;
      vi.mocked(fs.existsSync).mockReturnValue(false);
      expect(isWSL()).toBe(false);
    });
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

    it("returns 'wslview' for linux when isWSL is true", () => {
      expect(getOpenerCommand("linux", true)).toEqual(["wslview"]);
    });

    it("returns 'xdg-open' for linux when isWSL is false", () => {
      expect(getOpenerCommand("linux", false)).toEqual(["xdg-open"]);
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
        "Failed to open: /path/to/file.pdf"
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
        "Failed to open: /path/to/file.pdf"
      );
    });

    it("shows helpful error when wslview is not found in WSL", async () => {
      const originalEnv = process.env;
      process.env = { ...originalEnv, WSL_DISTRO_NAME: "Ubuntu" };

      const mockProcess = {
        on: vi.fn((event, callback) => {
          if (event === "error") {
            const err = new Error("spawn ENOENT") as NodeJS.ErrnoException;
            err.code = "ENOENT";
            callback(err);
          }
          return mockProcess;
        }),
        unref: vi.fn(),
      };
      vi.mocked(spawn).mockReturnValue(mockProcess as never);

      await expect(openWithSystemApp("/path/to/file.pdf", "linux")).rejects.toThrow(
        "wslview not found. Install with: sudo apt install wslu"
      );

      process.env = originalEnv;
    });

    it("succeeds when wslview exits with non-zero code in WSL", async () => {
      const originalEnv = process.env;
      process.env = { ...originalEnv, WSL_DISTRO_NAME: "Ubuntu" };

      const mockProcess = {
        on: vi.fn((event, callback) => {
          if (event === "close") {
            callback(1); // wslview may return non-zero even on success
          }
          return mockProcess;
        }),
        unref: vi.fn(),
      };
      vi.mocked(spawn).mockReturnValue(mockProcess as never);

      // Should not reject - wslview non-zero exit is tolerated
      await expect(openWithSystemApp("/path/to/file.pdf", "linux")).resolves.toBeUndefined();

      process.env = originalEnv;
    });
  });
});
