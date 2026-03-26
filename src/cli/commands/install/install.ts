/**
 * Install command implementation
 */

import { type WriteSkillsResult, writeSkills } from "../../../features/install/write-skills.js";

export interface InstallSkillsOptions {
  force: boolean;
  user?: boolean;
}

export async function executeInstallSkills(
  options: InstallSkillsOptions
): Promise<WriteSkillsResult> {
  return writeSkills({
    targetDir: process.cwd(),
    force: options.force,
    ...(options.user != null && { user: options.user }),
  });
}

export function formatInstallSkillsOutput(result: WriteSkillsResult): string {
  const lines: string[] = [];

  if (result.written.length === 0 && result.skipped.length > 0) {
    lines.push("Skills already up-to-date. Use --force to overwrite.");
    lines.push(`  ${result.skipped.length} files skipped`);
    return lines.join("\n");
  }

  if (result.written.length > 0) {
    lines.push(`Installed ${result.written.length} skill files to .agents/skills/ref/`);
    for (const file of result.written) {
      lines.push(`  + ${file}`);
    }
  }

  if (result.skipped.length > 0) {
    lines.push(`  ${result.skipped.length} files skipped (already exist)`);
  }

  if (result.linkCreated) {
    lines.push("Created symlink: .claude/skills/ref -> .agents/skills/ref");
  }

  return lines.join("\n");
}
