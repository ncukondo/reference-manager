import { describe, expect, it, vi } from "vitest";
import { type UpgradeNpmOptions, defaultRunCommand, upgradeNpmGlobal } from "./apply-npm.js";

function baseOptions(overrides: Partial<UpgradeNpmOptions> = {}): UpgradeNpmOptions {
  return {
    currentVersion: "0.33.4",
    getLatest: vi.fn(async () => ({
      checkedAt: "2026-04-20T12:00:00Z",
      latest: "0.34.0",
      url: "https://github.com/ncukondo/reference-manager/releases/tag/v0.34.0",
    })),
    runCommand: vi.fn(async () => ({ exitCode: 0, stdout: "", stderr: "" })),
    ...overrides,
  };
}

describe("upgradeNpmGlobal", () => {
  it("returns guidance with the recommended command when check=true", async () => {
    const runCommand = vi.fn();
    const result = await upgradeNpmGlobal(baseOptions({ check: true, runCommand }));

    expect(result.status).toBe("guidance");
    expect(result.message).toContain("npm i -g @ncukondo/reference-manager@latest");
    expect(result.toVersion).toBe("0.34.0");
    expect(runCommand).not.toHaveBeenCalled();
  });

  it("returns already-up-to-date when latest equals current version", async () => {
    const runCommand = vi.fn();
    const result = await upgradeNpmGlobal(baseOptions({ currentVersion: "0.34.0", runCommand }));

    expect(result.status).toBe("already-up-to-date");
    expect(runCommand).not.toHaveBeenCalled();
  });

  it("does not run npm without --yes; returns guidance with the command", async () => {
    const runCommand = vi.fn();
    const result = await upgradeNpmGlobal(baseOptions({ runCommand }));

    expect(result.status).toBe("guidance");
    expect(result.message).toContain("npm i -g @ncukondo/reference-manager@latest");
    expect(runCommand).not.toHaveBeenCalled();
  });

  it("runs `npm i -g @ncukondo/reference-manager@latest` when yes=true", async () => {
    const runCommand = vi.fn(async () => ({ exitCode: 0, stdout: "", stderr: "" }));
    const result = await upgradeNpmGlobal(baseOptions({ yes: true, runCommand }));

    expect(runCommand).toHaveBeenCalledTimes(1);
    const [command, args] = runCommand.mock.calls[0] ?? [];
    expect(command).toBe("npm");
    expect(args).toEqual(["i", "-g", "@ncukondo/reference-manager@latest"]);
    expect(result.status).toBe("success");
    expect(result.toVersion).toBe("0.34.0");
  });

  it("pins to the explicit tag when --version is provided and yes=true", async () => {
    const runCommand = vi.fn(async () => ({ exitCode: 0, stdout: "", stderr: "" }));
    await upgradeNpmGlobal(baseOptions({ yes: true, version: "v0.35.0", runCommand }));

    const [, args] = runCommand.mock.calls[0] ?? [];
    expect(args).toEqual(["i", "-g", "@ncukondo/reference-manager@0.35.0"]);
  });

  it("surfaces a non-zero npm exit code as an error result", async () => {
    const runCommand = vi.fn(async () => ({
      exitCode: 1,
      stdout: "",
      stderr: "npm ERR! permission denied",
    }));
    const result = await upgradeNpmGlobal(baseOptions({ yes: true, runCommand }));

    expect(result.status).toBe("error");
    expect(result.error).toMatch(/permission denied|exit.*1/i);
  });

  it("returns error when getLatest resolves to null and no version pinned", async () => {
    const result = await upgradeNpmGlobal(baseOptions({ getLatest: vi.fn(async () => null) }));
    expect(result.status).toBe("error");
    expect(result.error).toMatch(/latest/i);
  });

  it("bypasses getLatest when --version is pinned", async () => {
    const getLatest = vi.fn();
    const result = await upgradeNpmGlobal(
      baseOptions({ check: true, version: "v0.35.0", getLatest })
    );

    expect(result.status).toBe("guidance");
    expect(result.message).toContain("@0.35.0");
    expect(result.toVersion).toBe("0.35.0");
    expect(getLatest).not.toHaveBeenCalled();
  });

  it("surfaces a friendly message when npm is not on PATH (ENOENT)", async () => {
    const runCommand = vi.fn(async () =>
      defaultRunCommand("ref-nonexistent-binary-for-test-xyz", ["--version"])
    );
    const result = await upgradeNpmGlobal(baseOptions({ yes: true, runCommand }));

    expect(result.status).toBe("error");
    expect(result.error).toMatch(/not found in PATH/);
    expect(result.error).not.toMatch(/spawn ENOENT/);
  });
});

describe("defaultRunCommand", () => {
  it("returns a friendly ENOENT message when the command is missing", async () => {
    const result = await defaultRunCommand("ref-nonexistent-binary-for-test-xyz", ["--version"]);

    expect(result.exitCode).toBe(127);
    expect(result.stderr).toContain("not found in PATH");
    expect(result.stderr).not.toContain("spawn ENOENT");
  });
});
