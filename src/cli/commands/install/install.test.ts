/**
 * Install command tests
 */
import { describe, expect, it, vi } from "vitest";
import { executeInstallSkills, formatInstallSkillsOutput } from "./install.js";

vi.mock("../../../features/install/write-skills.js", () => ({
  writeSkills: vi.fn(),
}));

import { writeSkills } from "../../../features/install/write-skills.js";

const mockWriteSkills = vi.mocked(writeSkills);

describe("install command", () => {
  describe("executeInstallSkills", () => {
    it("should call writeSkills with targetDir as cwd by default", async () => {
      mockWriteSkills.mockResolvedValue({
        written: ["SKILL.md"],
        skipped: [],
        linkCreated: true,
      });

      const result = await executeInstallSkills({ force: false });

      expect(mockWriteSkills).toHaveBeenCalledWith({
        targetDir: process.cwd(),
        force: false,
      });
      expect(result.written).toEqual(["SKILL.md"]);
    });

    it("should pass force option", async () => {
      mockWriteSkills.mockResolvedValue({
        written: ["SKILL.md"],
        skipped: [],
        linkCreated: true,
      });

      await executeInstallSkills({ force: true });

      expect(mockWriteSkills).toHaveBeenCalledWith({
        targetDir: process.cwd(),
        force: true,
      });
    });

    it("should pass user option for user-level install", async () => {
      mockWriteSkills.mockResolvedValue({
        written: ["SKILL.md"],
        skipped: [],
        linkCreated: true,
      });

      await executeInstallSkills({ force: false, user: true });

      expect(mockWriteSkills).toHaveBeenCalledWith({
        targetDir: process.cwd(),
        force: false,
        user: true,
      });
    });
  });

  describe("formatInstallSkillsOutput", () => {
    it("should format written files", () => {
      const output = formatInstallSkillsOutput({
        written: [
          "SKILL.md",
          "references/systematic-review.md",
          "references/manuscript-writing.md",
          "references/fulltext.md",
        ],
        skipped: [],
        linkCreated: true,
      });

      expect(output).toContain("SKILL.md");
      expect(output).toContain(".agents/skills/ref/");
      expect(output).toContain(".claude/skills/ref");
    });

    it("should format skipped files", () => {
      const output = formatInstallSkillsOutput({
        written: [],
        skipped: ["SKILL.md", "references/systematic-review.md"],
        linkCreated: false,
      });

      expect(output).toContain("skipped");
    });

    it("should show already up-to-date when all files skipped", () => {
      const output = formatInstallSkillsOutput({
        written: [],
        skipped: [
          "SKILL.md",
          "references/systematic-review.md",
          "references/manuscript-writing.md",
          "references/fulltext.md",
        ],
        linkCreated: false,
      });

      expect(output).toContain("up-to-date");
    });
  });
});
