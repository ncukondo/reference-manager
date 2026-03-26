/**
 * Write-skills feature tests
 */
import { existsSync, lstatSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("node:os", async () => {
  const actual = await vi.importActual<typeof import("node:os")>("node:os");
  return { ...actual, homedir: vi.fn(actual.homedir) };
});

import { homedir } from "node:os";
import { writeSkills } from "./write-skills.js";

describe("writeSkills", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = join(import.meta.dirname, "__test-write-skills__");
    mkdirSync(tmpDir, { recursive: true });
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it("should create .agents/skills/ref/ directory structure", async () => {
    await writeSkills({ targetDir: tmpDir });

    const agentsDir = join(tmpDir, ".agents", "skills", "ref");
    expect(existsSync(agentsDir)).toBe(true);
    expect(existsSync(join(agentsDir, "SKILL.md"))).toBe(true);
    expect(existsSync(join(agentsDir, "references", "systematic-review.md"))).toBe(true);
    expect(existsSync(join(agentsDir, "references", "manuscript-writing.md"))).toBe(true);
    expect(existsSync(join(agentsDir, "references", "fulltext.md"))).toBe(true);
  });

  it("should create .claude/skills/ref symlink pointing to .agents/skills/ref", async () => {
    await writeSkills({ targetDir: tmpDir });

    const claudeLink = join(tmpDir, ".claude", "skills", "ref");
    expect(existsSync(claudeLink)).toBe(true);

    const stat = lstatSync(claudeLink);
    expect(stat.isSymbolicLink()).toBe(true);

    // The link should resolve to the same files
    expect(existsSync(join(claudeLink, "SKILL.md"))).toBe(true);
  });

  it("should return written file list", async () => {
    const result = await writeSkills({ targetDir: tmpDir });

    expect(result.written.length).toBeGreaterThanOrEqual(4);
    expect(result.skipped).toEqual([]);
    expect(result.linkCreated).toBe(true);
  });

  it("should skip existing files by default", async () => {
    await writeSkills({ targetDir: tmpDir });

    const result = await writeSkills({ targetDir: tmpDir });

    expect(result.written).toEqual([]);
    expect(result.skipped.length).toBeGreaterThanOrEqual(4);
    expect(result.linkCreated).toBe(false);
  });

  it("should overwrite existing files with force option", async () => {
    await writeSkills({ targetDir: tmpDir });

    const skillPath = join(tmpDir, ".agents", "skills", "ref", "SKILL.md");
    writeFileSync(skillPath, "modified content");

    const result = await writeSkills({ targetDir: tmpDir, force: true });

    expect(result.written.length).toBeGreaterThanOrEqual(4);
    expect(result.skipped).toEqual([]);

    const content = readFileSync(skillPath, "utf-8");
    expect(content).toContain("ref");
    expect(content).not.toBe("modified content");
  });

  it("should create .claude/skills/ parent directory if missing", async () => {
    const claudeSkillsDir = join(tmpDir, ".claude", "skills");
    expect(existsSync(claudeSkillsDir)).toBe(false);

    await writeSkills({ targetDir: tmpDir });

    expect(existsSync(claudeSkillsDir)).toBe(true);
  });

  it("should handle existing .claude/skills/ref symlink gracefully", async () => {
    await writeSkills({ targetDir: tmpDir });

    await writeSkills({ targetDir: tmpDir, force: true });

    const claudeLink = join(tmpDir, ".claude", "skills", "ref");
    expect(existsSync(join(claudeLink, "SKILL.md"))).toBe(true);
  });

  it("should write valid SKILL.md with required frontmatter fields", async () => {
    await writeSkills({ targetDir: tmpDir });

    const skillPath = join(tmpDir, ".agents", "skills", "ref", "SKILL.md");
    const content = readFileSync(skillPath, "utf-8");

    expect(content).toMatch(/^---\n/);
    expect(content).toMatch(/name:\s+ref/);
    expect(content).toMatch(/description:\s+.+/);
  });

  it("should install to user home directory when user option is set", async () => {
    vi.mocked(homedir).mockReturnValue(tmpDir);

    try {
      const result = await writeSkills({ targetDir: "/ignored", user: true });

      const agentsDir = join(tmpDir, ".agents", "skills", "ref");
      expect(existsSync(agentsDir)).toBe(true);
      expect(existsSync(join(agentsDir, "SKILL.md"))).toBe(true);
      expect(result.written.length).toBeGreaterThanOrEqual(4);
      expect(result.linkCreated).toBe(true);

      const claudeLink = join(tmpDir, ".claude", "skills", "ref");
      expect(existsSync(claudeLink)).toBe(true);
    } finally {
      vi.mocked(homedir).mockRestore();
    }
  });

  it("should remove regular directory at .claude/skills/ref in force mode", async () => {
    // First install normally
    await writeSkills({ targetDir: tmpDir });

    // Replace symlink with a regular directory
    const claudeLink = join(tmpDir, ".claude", "skills", "ref");
    rmSync(claudeLink, { recursive: true, force: true });
    mkdirSync(claudeLink, { recursive: true });
    writeFileSync(join(claudeLink, "dummy.txt"), "dummy");

    // Force install should replace the regular directory with a symlink
    const result = await writeSkills({ targetDir: tmpDir, force: true });

    const stat = lstatSync(claudeLink);
    expect(stat.isSymbolicLink()).toBe(true);
    expect(result.linkCreated).toBe(true);
    expect(existsSync(join(claudeLink, "SKILL.md"))).toBe(true);
  });
});
