import { createHash, randomUUID } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { type UpgradeBinaryOptions, computeAssetName, upgradeBinary } from "./apply-binary.js";

// Spy on node:fs (real implementations preserved) so tests can assert *how*
// the binary is replaced, not just the end state.
vi.mock("node:fs", { spy: true });

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

function sha256Hex(content: string): string {
  return createHash("sha256").update(content).digest("hex");
}

/**
 * Routes the release-asset URL to `binary` and the SHA256SUMS URL to `sums`
 * (404 when `sums` is null, mimicking releases without a checksum asset).
 */
function makeFetchWithSums(binary: string, sums: string | null): typeof globalThis.fetch {
  return vi.fn(async (url: URL | string) => {
    if (String(url).endsWith("/SHA256SUMS")) {
      if (sums === null) return new Response("not found", { status: 404 });
      return new Response(sums, { status: 200, headers: { "content-type": "text/plain" } });
    }
    return new Response(new TextEncoder().encode(binary), {
      status: 200,
      headers: { "content-type": "application/octet-stream" },
    });
  }) as unknown as typeof globalThis.fetch;
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

  it("calls getLatest with force=true so an explicit upgrade bypasses the 24h cache", async () => {
    const getLatest = vi.fn(async () => ({
      checkedAt: "2026-04-20T12:00:00Z",
      latest: "0.34.0",
      url: "https://github.com/ncukondo/reference-manager/releases/tag/v0.34.0",
    }));

    const result = await upgradeBinary(baseOptions({ getLatest }));

    expect(result.status).toBe("success");
    expect(getLatest).toHaveBeenCalledWith({ force: true });
  });

  it("calls getLatest with force=true in check mode too", async () => {
    const getLatest = vi.fn(async () => ({
      checkedAt: "2026-04-20T12:00:00Z",
      latest: "0.34.0",
      url: "https://github.com/ncukondo/reference-manager/releases/tag/v0.34.0",
    }));

    const result = await upgradeBinary(baseOptions({ check: true, getLatest }));

    expect(result.status).toBe("guidance");
    expect(getLatest).toHaveBeenCalledWith({ force: true });
  });

  it("uses `--version <tag>` when provided, bypassing getLatest", async () => {
    const getLatest = vi.fn();
    const fetchFn = vi.fn(async (url: URL | string) => {
      expect(String(url)).toContain("/download/v0.35.0/");
      if (String(url).endsWith("/SHA256SUMS")) {
        return new Response("not found", { status: 404 });
      }
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

  it("replaces the Unix binary with a single overwriting rename (no rm of dest)", async () => {
    vi.mocked(rmSync).mockClear();
    vi.mocked(renameSync).mockClear();

    const result = await upgradeBinary(baseOptions());

    expect(result.status).toBe("success");
    expect(readFileSync(destPath, "utf-8")).toBe("new binary contents");
    // Removing dest before the rename leaves a crash window with no binary
    // installed at all; POSIX rename() alone overwrites atomically.
    expect(vi.mocked(rmSync).mock.calls.map((call) => call[0])).not.toContain(destPath);
    expect(vi.mocked(renameSync)).toHaveBeenCalledWith(`${destPath}.tmp.12345`, destPath);
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

  describe("checksum verification", () => {
    it("verifies the download against SHA256SUMS and succeeds on match", async () => {
      const binary = "new binary contents";
      const sums = [
        `${sha256Hex("other")}  ref-darwin-arm64`,
        `${sha256Hex(binary)}  ref-linux-x64`,
      ].join("\n");
      const fetchFn = makeFetchWithSums(binary, sums);

      const result = await upgradeBinary(baseOptions({ fetch: fetchFn }));

      expect(result.status).toBe("success");
      expect(result.notice).toBeUndefined();
      expect(readFileSync(destPath, "utf-8")).toBe(binary);
      expect(fetchFn).toHaveBeenCalledWith(
        "https://github.com/ncukondo/reference-manager/releases/download/v0.34.0/SHA256SUMS"
      );
    });

    it("accepts the `sha256sum -b` format with a leading asterisk", async () => {
      const binary = "new binary contents";
      const sums = `${sha256Hex(binary)} *ref-linux-x64\n`;

      const result = await upgradeBinary(baseOptions({ fetch: makeFetchWithSums(binary, sums) }));

      expect(result.status).toBe("success");
      expect(result.notice).toBeUndefined();
    });

    it("errors on checksum mismatch, discards the download, and leaves dest untouched", async () => {
      const sums = `${sha256Hex("something else entirely")}  ref-linux-x64\n`;

      const result = await upgradeBinary(
        baseOptions({ fetch: makeFetchWithSums("new binary contents", sums) })
      );

      expect(result.status).toBe("error");
      expect(result.error).toMatch(/checksum/i);
      expect(result.error).toContain("ref-linux-x64");
      // Tampered/corrupt downloads must not be left around, and must never
      // reach the `--version` execution check or the install location.
      expect(existsSync(`${destPath}.tmp.12345`)).toBe(false);
      expect(readFileSync(destPath, "utf-8")).toBe("old binary\n");
    });

    it("does not execute the downloaded binary when its checksum mismatches", async () => {
      const sums = `${sha256Hex("something else entirely")}  ref-linux-x64\n`;
      const verifyBinary = vi.fn(async () => "ref 0.34.0");

      const result = await upgradeBinary(
        baseOptions({ fetch: makeFetchWithSums("new binary contents", sums), verifyBinary })
      );

      expect(result.status).toBe("error");
      expect(verifyBinary).not.toHaveBeenCalled();
    });

    it("skips verification with a notice when SHA256SUMS is absent (older releases)", async () => {
      const result = await upgradeBinary(
        baseOptions({ fetch: makeFetchWithSums("new binary contents", null) })
      );

      expect(result.status).toBe("success");
      expect(result.notice).toMatch(/checksum/i);
      expect(result.notice).toContain("SHA256SUMS");
      expect(readFileSync(destPath, "utf-8")).toBe("new binary contents");
    });

    it("skips verification with a notice when SHA256SUMS has no entry for the asset", async () => {
      const sums = `${sha256Hex("other")}  ref-darwin-arm64\n`;

      const result = await upgradeBinary(
        baseOptions({ fetch: makeFetchWithSums("new binary contents", sums) })
      );

      expect(result.status).toBe("success");
      expect(result.notice).toContain("ref-linux-x64");
    });
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
