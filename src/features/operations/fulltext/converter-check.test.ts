import { beforeEach, describe, expect, it, vi } from "vitest";
import { isCommandAvailable, runCheckCommand } from "./converter-check.js";

vi.mock("node:child_process", () => ({
  execFile: vi.fn(),
  exec: vi.fn(),
}));

import { exec, execFile } from "node:child_process";

const mockedExecFile = vi.mocked(execFile);
const mockedExec = vi.mocked(exec);

describe("isCommandAvailable", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("should return true when command exists (which succeeds)", async () => {
    mockedExecFile.mockImplementation((_cmd, _args, callback) => {
      (callback as (err: Error | null) => void)(null);
      return undefined as ReturnType<typeof execFile>;
    });

    const result = await isCommandAvailable("marker_single");
    expect(result).toBe(true);
    expect(mockedExecFile).toHaveBeenCalledWith(
      process.platform === "win32" ? "where" : "which",
      ["marker_single"],
      expect.any(Function)
    );
  });

  it("should return false when command does not exist (which fails)", async () => {
    mockedExecFile.mockImplementation((_cmd, _args, callback) => {
      (callback as (err: Error | null) => void)(new Error("not found"));
      return undefined as ReturnType<typeof execFile>;
    });

    const result = await isCommandAvailable("nonexistent-tool");
    expect(result).toBe(false);
  });
});

describe("runCheckCommand", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("should return true when check command exits with 0", async () => {
    mockedExec.mockImplementation((_cmd, callback) => {
      (callback as (err: Error | null) => void)(null);
      return undefined as ReturnType<typeof exec>;
    });

    const result = await runCheckCommand("my-tool --version");
    expect(result).toBe(true);
    expect(mockedExec).toHaveBeenCalledWith("my-tool --version", expect.any(Function));
  });

  it("should return false when check command fails", async () => {
    mockedExec.mockImplementation((_cmd, callback) => {
      (callback as (err: Error | null) => void)(new Error("command failed"));
      return undefined as ReturnType<typeof exec>;
    });

    const result = await runCheckCommand("my-tool --version");
    expect(result).toBe(false);
  });
});
