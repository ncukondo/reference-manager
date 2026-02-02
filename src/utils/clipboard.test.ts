import { execFile } from "node:child_process";
import fs from "node:fs";
import { afterEach, describe, expect, it, vi } from "vitest";
import { copyToClipboard, detectClipboardCommand } from "./clipboard.js";

vi.mock("node:child_process", () => ({
  execFile: vi.fn(),
}));

vi.mock("node:fs", () => ({
  default: {
    existsSync: vi.fn(),
  },
}));

describe("clipboard", () => {
  const originalEnv = process.env;
  const originalPlatform = process.platform;

  afterEach(() => {
    vi.clearAllMocks();
    process.env = originalEnv;
    Object.defineProperty(process, "platform", { value: originalPlatform });
  });

  describe("detectClipboardCommand", () => {
    it("returns pbcopy on macOS", () => {
      Object.defineProperty(process, "platform", { value: "darwin" });
      const result = detectClipboardCommand();
      expect(result).toEqual({ command: "pbcopy", args: [] });
    });

    it("returns clip.exe on Windows", () => {
      Object.defineProperty(process, "platform", { value: "win32" });
      const result = detectClipboardCommand();
      expect(result).toEqual({ command: "clip.exe", args: [] });
    });

    it("returns clip.exe on WSL", () => {
      Object.defineProperty(process, "platform", { value: "linux" });
      process.env = { ...originalEnv, WSL_DISTRO_NAME: "Ubuntu" };
      const result = detectClipboardCommand();
      expect(result).toEqual({ command: "clip.exe", args: [] });
    });

    it("returns wl-copy when WAYLAND_DISPLAY is set (non-WSL Linux)", () => {
      Object.defineProperty(process, "platform", { value: "linux" });
      process.env = { ...originalEnv, WAYLAND_DISPLAY: "wayland-0" };
      process.env.WSL_DISTRO_NAME = undefined;
      vi.mocked(fs.existsSync).mockReturnValue(false);
      const result = detectClipboardCommand();
      expect(result).toEqual({ command: "wl-copy", args: [] });
    });

    it("returns xclip on Linux X11", () => {
      Object.defineProperty(process, "platform", { value: "linux" });
      process.env = { ...originalEnv, DISPLAY: ":0" };
      process.env.WSL_DISTRO_NAME = undefined;
      process.env.WAYLAND_DISPLAY = undefined;
      vi.mocked(fs.existsSync).mockReturnValue(false);
      const result = detectClipboardCommand();
      expect(result).toEqual({ command: "xclip", args: ["-selection", "clipboard"] });
    });

    it("returns null when no clipboard command is available", () => {
      Object.defineProperty(process, "platform", { value: "linux" });
      process.env = { ...originalEnv };
      process.env.WSL_DISTRO_NAME = undefined;
      process.env.WAYLAND_DISPLAY = undefined;
      process.env.DISPLAY = undefined;
      vi.mocked(fs.existsSync).mockReturnValue(false);
      const result = detectClipboardCommand();
      expect(result).toBeNull();
    });

    it("detects WSL via WSLInterop file when WSL_DISTRO_NAME is not set", () => {
      Object.defineProperty(process, "platform", { value: "linux" });
      process.env = { ...originalEnv };
      process.env.WSL_DISTRO_NAME = undefined;
      process.env.WAYLAND_DISPLAY = undefined;
      vi.mocked(fs.existsSync).mockReturnValue(true);
      const result = detectClipboardCommand();
      expect(result).toEqual({ command: "clip.exe", args: [] });
    });
  });

  describe("copyToClipboard", () => {
    it("returns { success: true } on successful copy", async () => {
      const mockExecFile = vi.mocked(execFile);
      mockExecFile.mockImplementation((_cmd, _args, callback) => {
        (callback as (error: Error | null) => void)(null);
        return {} as ReturnType<typeof execFile>;
      });

      Object.defineProperty(process, "platform", { value: "darwin" });
      const result = await copyToClipboard("test text");
      expect(result).toEqual({ success: true });
    });

    it("pipes text to stdin of the clipboard command", async () => {
      const mockStdin = {
        write: vi.fn(),
        end: vi.fn(),
      };
      const mockChild = {
        stdin: mockStdin,
      };
      const mockExecFile = vi.mocked(execFile);
      mockExecFile.mockImplementation((_cmd, _args, callback) => {
        (callback as (error: Error | null) => void)(null);
        return mockChild as unknown as ReturnType<typeof execFile>;
      });

      Object.defineProperty(process, "platform", { value: "darwin" });
      await copyToClipboard("hello world");

      expect(mockStdin.write).toHaveBeenCalledWith("hello world");
      expect(mockStdin.end).toHaveBeenCalled();
    });

    it("returns { success: false, error } when command fails", async () => {
      const mockExecFile = vi.mocked(execFile);
      mockExecFile.mockImplementation((_cmd, _args, callback) => {
        (callback as (error: Error | null) => void)(new Error("command failed"));
        return {} as ReturnType<typeof execFile>;
      });

      Object.defineProperty(process, "platform", { value: "darwin" });
      const result = await copyToClipboard("test text");
      expect(result).toEqual({ success: false, error: "command failed" });
    });

    it("returns { success: false } when no clipboard command available", async () => {
      Object.defineProperty(process, "platform", { value: "linux" });
      process.env = { ...originalEnv };
      process.env.WSL_DISTRO_NAME = undefined;
      process.env.WAYLAND_DISPLAY = undefined;
      process.env.DISPLAY = undefined;
      vi.mocked(fs.existsSync).mockReturnValue(false);

      const result = await copyToClipboard("test text");
      expect(result).toEqual({ success: false, error: "No clipboard command available" });
    });
  });
});
