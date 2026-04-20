import { randomUUID } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { type UpgradeBinaryOptions, computeAssetName, upgradeBinary } from "./apply-binary.js";

function makeFetchBinary(bytes: Uint8Array, status = 200): typeof globalThis.fetch {
  return vi.fn(async () => {
    return new Response(bytes, {
      status,
      headers: { "content-type": "application/octet-stream" },
    });
  }) as unknown as typeof globalThis.fetch;
}

function makeFetchStatus(status: number): typeof globalThis.fetch {
  return vi.fn(
    async () =>
      new Response("not found", {
        status,
        headers: { "content-type": "text/plain" },
      })
  ) as unknown as typeof globalThis.fetch;
}

describe("computeAssetName", () => {
  it.each([
    ["linux", "x64", "ref-linux-x64"],
    ["linux", "arm64", "ref-linux-arm64"],
    ["darwin", "x64", "ref-darwin-x64"],
    ["darwin", "arm64", "ref-darwin-arm64"],
    ["win32", "x64", "ref-windows-x64.exe"],
  ])("platform=%s arch=%s -> %s", (platform, arch, expected) => {
    expect(computeAssetName(platform as NodeJS.Platform, arch)).toBe(expected);
  });

  it("throws for unsupported platform", () => {
    expect(() => computeAssetName("freebsd" as NodeJS.Platform, "x64")).toThrow(/unsupported/i);
  });

  it("throws for unsupported arch", () => {
    expect(() => computeAssetName("linux", "ia32")).toThrow(/unsupported/i);
  });
});

describe("upgradeBinary", () => {
  let testDir: string;
  let destPath: string;

  beforeEach(() => {
    testDir = join(tmpdir(), `upgrade-binary-test-${randomUUID()}`);
    mkdirSync(testDir, { recursive: true });
    destPath = join(testDir, "ref");
    // Seed a fake existing binary so dest exists.
    writeFileSync(destPath, "old binary\n", { mode: 0o755 });
  });

  afterEach(() => {
    if (existsSync(testDir)) rmSync(testDir, { recursive: true, force: true });
  });

  function baseOptions(overrides: Partial<UpgradeBinaryOptions> = {}): UpgradeBinaryOptions {
    return {
      destPath,
      currentVersion: "0.33.4",
      platform: "linux",
      arch: "x64",
      pid: 12345,
      fetch: makeFetchBinary(new TextEncoder().encode("new binary contents")),
      verifyBinary: vi.fn(async () => "ref 0.34.0"),
      getLatest: vi.fn(async () => ({
        checkedAt: "2026-04-20T12:00:00Z",
        latest: "0.34.0",
        url: "https://github.com/ncukondo/reference-manager/releases/tag/v0.34.0",
      })),
      ...overrides,
    };
  }

  it("downloads to {dest}.tmp.{pid}, verifies, then moves into place", async () => {
    const verifyCalls: string[] = [];
    const options = baseOptions({
      verifyBinary: vi.fn(async (path: string) => {
        verifyCalls.push(path);
        return "ref 0.34.0";
      }),
    });

    const result = await upgradeBinary(options);

    expect(result.status).toBe("success");
    expect(result.fromVersion).toBe("0.33.4");
    expect(result.toVersion).toBe("0.34.0");
    expect(readFileSync(destPath, "utf-8")).toBe("new binary contents");
    // Temp file should not remain after success.
    expect(existsSync(`${destPath}.tmp.12345`)).toBe(false);
    // Verify was called against the .tmp path, not dest.
    expect(verifyCalls).toEqual([`${destPath}.tmp.12345`]);
  });

  it("uses `--version <tag>` when provided, bypassing getLatest", async () => {
    const getLatest = vi.fn();
    const fetchFn = vi.fn(async (url: URL | string) => {
      expect(String(url)).toContain("/download/v0.35.0/ref-linux-x64");
      return new Response(new TextEncoder().encode("pinned binary"), { status: 200 });
    }) as unknown as typeof globalThis.fetch;

    const result = await upgradeBinary(
      baseOptions({
        version: "v0.35.0",
        fetch: fetchFn,
        getLatest,
        verifyBinary: vi.fn(async () => "ref 0.35.0"),
      })
    );

    expect(result.status).toBe("success");
    expect(result.toVersion).toBe("0.35.0");
    expect(getLatest).not.toHaveBeenCalled();
  });

  it("accepts a `--version` tag without leading v", async () => {
    const fetchFn = vi.fn(async (url: URL | string) => {
      expect(String(url)).toContain("/download/v0.35.0/");
      return new Response(new TextEncoder().encode("bin"), { status: 200 });
    }) as unknown as typeof globalThis.fetch;

    const result = await upgradeBinary(baseOptions({ version: "0.35.0", fetch: fetchFn }));
    expect(result.status).toBe("success");
  });

  it("returns already-up-to-date when latest equals current version", async () => {
    const fetchFn = vi.fn();
    const result = await upgradeBinary(
      baseOptions({
        currentVersion: "0.34.0",
        fetch: fetchFn as unknown as typeof globalThis.fetch,
      })
    );

    expect(result.status).toBe("already-up-to-date");
    expect(result.fromVersion).toBe("0.34.0");
    expect(result.toVersion).toBe("0.34.0");
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it("returns guidance with asset URL when check=true", async () => {
    const fetchFn = vi.fn();
    const result = await upgradeBinary(
      baseOptions({
        check: true,
        fetch: fetchFn as unknown as typeof globalThis.fetch,
      })
    );

    expect(result.status).toBe("guidance");
    expect(result.toVersion).toBe("0.34.0");
    expect(result.url).toBe(
      "https://github.com/ncukondo/reference-manager/releases/download/v0.34.0/ref-linux-x64"
    );
    expect(fetchFn).not.toHaveBeenCalled();
    // Dest untouched.
    expect(readFileSync(destPath, "utf-8")).toBe("old binary\n");
  });

  it("surfaces the release URL in the error on download 404", async () => {
    const result = await upgradeBinary(
      baseOptions({
        fetch: makeFetchStatus(404),
      })
    );

    expect(result.status).toBe("error");
    expect(result.error).toMatch(/404/);
    expect(result.error).toContain(
      "https://github.com/ncukondo/reference-manager/releases/download/v0.34.0/ref-linux-x64"
    );
    // Dest untouched on 404.
    expect(readFileSync(destPath, "utf-8")).toBe("old binary\n");
  });

  it("returns error when getLatest resolves to null and no version pinned", async () => {
    const result = await upgradeBinary(
      baseOptions({
        getLatest: vi.fn(async () => null),
      })
    );
    expect(result.status).toBe("error");
    expect(result.error).toMatch(/latest/i);
  });

  it("leaves the .tmp file in place and returns error when verification fails", async () => {
    const result = await upgradeBinary(
      baseOptions({
        verifyBinary: vi.fn(async () => null),
      })
    );

    expect(result.status).toBe("error");
    expect(result.error).toMatch(/verif/i);
    // Tmp preserved so the user can inspect the broken download.
    expect(existsSync(`${destPath}.tmp.12345`)).toBe(true);
    // Dest not replaced.
    expect(readFileSync(destPath, "utf-8")).toBe("old binary\n");
  });

  it("on Windows, rotates dest to .old before moving new binary into place", async () => {
    const winDest = join(testDir, "ref.exe");
    writeFileSync(winDest, "old windows\n", { mode: 0o755 });

    const result = await upgradeBinary(
      baseOptions({
        destPath: winDest,
        platform: "win32",
        arch: "x64",
        fetch: makeFetchBinary(new TextEncoder().encode("new exe")),
        verifyBinary: vi.fn(async () => "ref 0.34.0"),
      })
    );

    expect(result.status).toBe("success");
    expect(readFileSync(winDest, "utf-8")).toBe("new exe");
    // Old binary should remain at .old for best-effort cleanup on next run.
    expect(readFileSync(`${winDest}.old`, "utf-8")).toBe("old windows\n");
  });

  it("propagates network errors without touching dest", async () => {
    const result = await upgradeBinary(
      baseOptions({
        fetch: vi.fn(async () => {
          throw new Error("network down");
        }) as unknown as typeof globalThis.fetch,
      })
    );

    expect(result.status).toBe("error");
    expect(result.error).toMatch(/network down/);
    expect(readFileSync(destPath, "utf-8")).toBe("old binary\n");
    expect(existsSync(`${destPath}.tmp.12345`)).toBe(false);
  });
});
