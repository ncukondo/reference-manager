import { randomUUID } from "node:crypto";
import { mkdirSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { detectInstallMethod, isBunfsPath } from "./detect.js";

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
    writeFileSync(join(repoDir, "package.json"), '{"name":"reference-manager"}\n');
    const realCli = join(repoDir, "bin", "cli.js");
    writeFileSync(realCli, "#!/usr/bin/env node\n");

    // NOTE: linkDir deliberately avoids `.local/bin/` / `/usr/local/bin/` so
    // the typical-binary-path fast path doesn't short-circuit this case.
    const linkDir = join(testDir, "home", "user", "custom", "bin");
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
    writeFileSync(join(repoDir, "package.json"), '{"name":"reference-manager"}\n');
    const realCli = join(repoDir, "bin", "cli.js");
    writeFileSync(realCli, "#!/usr/bin/env node\n");

    const globalNm = join(testDir, "global", "lib", "node_modules", "@ncukondo");
    mkdirSync(globalNm, { recursive: true });
    const linkedPkg = join(globalNm, "reference-manager");
    symlinkSync(repoDir, linkedPkg);
    const linkPath = join(linkedPkg, "bin", "cli.js");

    expect(detectInstallMethod(linkPath)).toBe("dev");
  });

  it("returns 'binary' when a dotfiles repo in $HOME has .git but the binary lives in ~/.local/bin", () => {
    // Regression: a user who manages $HOME as a git repo (dotfiles) should not
    // have `~/.local/bin/ref` misdetected as a dev checkout.
    const home = join(testDir, "home", "user");
    mkdirSync(join(home, ".git"), { recursive: true });
    // Intentionally no package.json at $HOME so it's not a reference-manager checkout.
    const binDir = join(home, ".local", "bin");
    mkdirSync(binDir, { recursive: true });
    const refPath = join(binDir, "ref");
    writeFileSync(refPath, "#!/bin/sh\n");

    expect(detectInstallMethod(refPath)).toBe("binary");
  });

  it("returns 'binary' even if an ancestor dotfiles repo has package.json (typical binary path wins)", () => {
    // Even stricter edge: a $HOME dotfiles repo that happens to contain a
    // package.json (e.g. scripted dotfiles manager) must not shadow a real
    // binary install at ~/.local/bin/ref.
    const home = join(testDir, "home", "user");
    mkdirSync(join(home, ".git"), { recursive: true });
    writeFileSync(join(home, "package.json"), '{"name":"dotfiles"}\n');
    const binDir = join(home, ".local", "bin");
    mkdirSync(binDir, { recursive: true });
    const refPath = join(binDir, "ref");
    writeFileSync(refPath, "#!/bin/sh\n");

    expect(detectInstallMethod(refPath)).toBe("binary");
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

  it("uses execPath when argv1 is a bunfs virtual path (Bun single-file executable)", () => {
    const binDir = join(testDir, "home", "user", ".local", "bin");
    mkdirSync(binDir, { recursive: true });
    const execPath = join(binDir, "ref");
    writeFileSync(execPath, "elf binary\n");

    expect(detectInstallMethod("/$bunfs/root/ref-linux-x64", execPath)).toBe("binary");
  });

  it("pattern-matches the substituted execPath, not the bunfs fall-through (dev checkout wins)", () => {
    // If detection merely fell through to "binary" for bunfs paths, an
    // execPath inside a git worktree would be misclassified. Asserting "dev"
    // proves execPath drives the pattern-matching.
    const repoDir = join(testDir, "repo");
    mkdirSync(join(repoDir, ".git"), { recursive: true });
    mkdirSync(join(repoDir, "bin"), { recursive: true });
    writeFileSync(join(repoDir, "package.json"), '{"name":"reference-manager"}\n');
    const execPath = join(repoDir, "bin", "ref");
    writeFileSync(execPath, "elf binary\n");

    expect(detectInstallMethod("/$bunfs/root/ref-linux-x64", execPath)).toBe("dev");
  });

  it("recognizes the Windows bunfs marker (B:\\~BUN\\)", () => {
    const binDir = join(testDir, "home", "user", ".local", "bin");
    mkdirSync(binDir, { recursive: true });
    const execPath = join(binDir, "ref");
    writeFileSync(execPath, "elf binary\n");

    expect(detectInstallMethod("B:\\~BUN\\root\\ref.exe", execPath)).toBe("binary");
  });

  it("ignores execPath when argv1 is a regular on-disk path", () => {
    const nmBin = join(testDir, "usr", "lib", "node_modules", "@ncukondo", "reference-manager");
    mkdirSync(nmBin, { recursive: true });
    const cliPath = join(nmBin, "cli.js");
    writeFileSync(cliPath, "#!/usr/bin/env node\n");

    const binDir = join(testDir, "home", "user", ".local", "bin");
    mkdirSync(binDir, { recursive: true });
    const execPath = join(binDir, "node");
    writeFileSync(execPath, "node binary\n");

    expect(detectInstallMethod(cliPath, execPath)).toBe("npm-global");
  });
});

describe("isBunfsPath", () => {
  it.each([
    ["/$bunfs/root/ref-linux-x64", true],
    ["/$bunfs/root/nested/dir/cli.js", true],
    ["B:\\~BUN\\root\\ref.exe", true],
    ["b:\\~bun\\root\\ref.exe", true],
    ["B:/~BUN/root/ref.exe", true],
    ["/home/user/.local/bin/ref", false],
    ["/usr/lib/node_modules/@ncukondo/reference-manager/bin/cli.js", false],
    ["C:\\Users\\user\\.local\\bin\\ref.exe", false],
    ["", false],
  ])("%s -> %s", (path, expected) => {
    expect(isBunfsPath(path)).toBe(expected);
  });
});
