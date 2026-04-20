import { randomUUID } from "node:crypto";
import { mkdirSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { detectInstallMethod } from "./detect.js";

describe("detectInstallMethod", () => {
  let testDir: string;

  beforeEach(() => {
    testDir = join(tmpdir(), `upgrade-detect-test-${randomUUID()}`);
    mkdirSync(testDir, { recursive: true });
  });

  afterEach(() => {
    rmSync(testDir, { recursive: true, force: true });
  });

  it("returns 'binary' for a plain path under ~/.local/bin/ref (no node_modules/)", () => {
    const binDir = join(testDir, "home", "user", ".local", "bin");
    mkdirSync(binDir, { recursive: true });
    const refPath = join(binDir, "ref");
    writeFileSync(refPath, "#!/bin/sh\n");

    expect(detectInstallMethod(refPath)).toBe("binary");
  });

  it("returns 'npm-global' for a path containing node_modules/", () => {
    const binPath = join(
      testDir,
      "usr",
      "lib",
      "node_modules",
      "@ncukondo",
      "reference-manager",
      "bin",
      "cli.js"
    );
    mkdirSync(
      join(testDir, "usr", "lib", "node_modules", "@ncukondo", "reference-manager", "bin"),
      {
        recursive: true,
      }
    );
    writeFileSync(binPath, "#!/usr/bin/env node\n");

    expect(detectInstallMethod(binPath)).toBe("npm-global");
  });

  it("returns 'dev' for a symlink that resolves into a git worktree", () => {
    const repoDir = join(testDir, "repo");
    mkdirSync(join(repoDir, ".git"), { recursive: true });
    mkdirSync(join(repoDir, "bin"), { recursive: true });
    const realCli = join(repoDir, "bin", "cli.js");
    writeFileSync(realCli, "#!/usr/bin/env node\n");

    const linkDir = join(testDir, "home", "user", ".local", "bin");
    mkdirSync(linkDir, { recursive: true });
    const linkPath = join(linkDir, "ref");
    symlinkSync(realCli, linkPath);

    expect(detectInstallMethod(linkPath)).toBe("dev");
  });

  it("returns 'npx' for a path under a typical npm cache (~/.npm/_npx/)", () => {
    const npxDir = join(
      testDir,
      "home",
      "user",
      ".npm",
      "_npx",
      "abc123",
      "node_modules",
      "@ncukondo",
      "reference-manager",
      "bin"
    );
    mkdirSync(npxDir, { recursive: true });
    const npxPath = join(npxDir, "cli.js");
    writeFileSync(npxPath, "#!/usr/bin/env node\n");

    expect(detectInstallMethod(npxPath)).toBe("npx");
  });

  it("returns 'dev' even when the symlink target is also under node_modules (npm link)", () => {
    // npm link creates a symlink in a global node_modules pointing back into the source repo.
    const repoDir = join(testDir, "src-repo");
    mkdirSync(join(repoDir, ".git"), { recursive: true });
    mkdirSync(join(repoDir, "bin"), { recursive: true });
    const realCli = join(repoDir, "bin", "cli.js");
    writeFileSync(realCli, "#!/usr/bin/env node\n");

    const globalNm = join(testDir, "global", "lib", "node_modules", "@ncukondo");
    mkdirSync(globalNm, { recursive: true });
    const linkedPkg = join(globalNm, "reference-manager");
    symlinkSync(repoDir, linkedPkg);
    const linkPath = join(linkedPkg, "bin", "cli.js");

    expect(detectInstallMethod(linkPath)).toBe("dev");
  });

  it("falls back to process.argv[1] when argv1 is omitted", () => {
    // We don't assert a specific value (depends on the test runner path), just
    // that the function executes and returns one of the valid enum values.
    const method = detectInstallMethod();
    expect(["binary", "npm-global", "dev", "npx"]).toContain(method);
  });

  it("returns 'binary' when the path does not exist (best-effort fallback)", () => {
    const nonexistent = join(testDir, "no-such", "ref");
    expect(detectInstallMethod(nonexistent)).toBe("binary");
  });
});
