/**
 * Write Agent Skills files to a target directory
 */

import {
  existsSync,
  lstatSync,
  mkdirSync,
  rmSync,
  symlinkSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { homedir } from "node:os";
import { join, relative } from "node:path";

// Import skill templates as raw strings (Vite: handled by raw-md plugin, Bun: --loader .md:text)
import skillMd from "../../cli/commands/install/skill-templates/SKILL.md";
import fulltextMd from "../../cli/commands/install/skill-templates/references/fulltext.md";
import manuscriptWritingMd from "../../cli/commands/install/skill-templates/references/manuscript-writing.md";
import systematicReviewMd from "../../cli/commands/install/skill-templates/references/systematic-review.md";

export interface WriteSkillsOptions {
  /** Target directory (defaults to $PWD) */
  targetDir: string;
  /** Overwrite existing files */
  force?: boolean;
  /** Install to user-level directory (~/.agents/skills/) */
  user?: boolean;
}

export interface WriteSkillsResult {
  /** Files that were written */
  written: string[];
  /** Files that were skipped (already exist) */
  skipped: string[];
  /** Whether the .claude symlink was created */
  linkCreated: boolean;
}

/** Skill template file entries: [relative path, content] */
const SKILL_FILES: [string, string][] = [
  ["SKILL.md", skillMd],
  ["references/systematic-review.md", systematicReviewMd],
  ["references/manuscript-writing.md", manuscriptWritingMd],
  ["references/fulltext.md", fulltextMd],
];

export async function writeSkills(options: WriteSkillsOptions): Promise<WriteSkillsResult> {
  const { targetDir, force = false, user = false } = options;
  const baseDir = user ? homedir() : targetDir;
  const agentsDir = join(baseDir, ".agents", "skills", "ref");
  const claudeDir = join(baseDir, ".claude", "skills");
  const claudeLink = join(claudeDir, "ref");

  const written: string[] = [];
  const skipped: string[] = [];

  // Ensure directories exist
  mkdirSync(join(agentsDir, "references"), { recursive: true });

  // Write skill files
  for (const [relativePath, content] of SKILL_FILES) {
    const filePath = join(agentsDir, relativePath);

    if (existsSync(filePath) && !force) {
      skipped.push(relativePath);
      continue;
    }

    writeFileSync(filePath, content, "utf-8");
    written.push(relativePath);
  }

  // Create .claude/skills/ref symlink
  let linkCreated = false;

  mkdirSync(claudeDir, { recursive: true });

  if (force && existsSync(claudeLink)) {
    // Remove existing link or directory to recreate
    const stat = lstatSync(claudeLink);
    if (stat.isSymbolicLink()) {
      unlinkSync(claudeLink);
    } else if (stat.isDirectory()) {
      rmSync(claudeLink, { recursive: true, force: true });
    }
  }

  if (!existsSync(claudeLink)) {
    const linkTarget = relative(claudeDir, agentsDir);
    symlinkSync(linkTarget, claudeLink, "junction");
    linkCreated = true;
  }

  return { written, skipped, linkCreated };
}
