import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { copyFile, readdir, stat, unlink, readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { ensureDirectoryExists } from "./file";

export interface BackupOptions {
  maxGenerations?: number;
  maxAgeMs?: number;
}

const DEFAULT_MAX_GENERATIONS = 50;
const DEFAULT_MAX_AGE_MS = 365 * 24 * 60 * 60 * 1000; // 1 year

/**
 * Get package name from package.json
 */
async function resolvePackageName(): Promise<string> {
  try {
    const currentFile = fileURLToPath(import.meta.url);
    let currentDir = dirname(currentFile);

    for (let i = 0; i < 10; i++) {
      const packageJsonPath = join(currentDir, "package.json");
      if (existsSync(packageJsonPath)) {
        const content = await readFile(packageJsonPath, "utf-8");
        const pkg = JSON.parse(content);
        return pkg.name;
      }
      currentDir = dirname(currentDir);
    }
  } catch {
    // Fall back to hardcoded name if package.json is not found
  }

  return "reference-manager";
}

const packageName = await resolvePackageName();

/**
 * Get backup directory path for a library
 */
export function getBackupDirectory(libraryName: string): string {
  const pkgName = packageName ?? "reference-manager";
  return join(tmpdir(), pkgName, "backups", libraryName);
}

/**
 * Create a backup of the given file
 */
export async function createBackup(sourceFile: string, libraryName: string): Promise<string> {
  const backupDir = getBackupDirectory(libraryName);
  await ensureDirectoryExists(backupDir);

  const timestamp = Date.now();
  const backupFileName = `${timestamp}.backup`;
  const backupPath = join(backupDir, backupFileName);

  await copyFile(sourceFile, backupPath);

  return backupPath;
}

/**
 * List all backups for a library (sorted by modification time, newest first)
 */
export async function listBackups(libraryName: string): Promise<string[]> {
  const backupDir = getBackupDirectory(libraryName);

  if (!existsSync(backupDir)) {
    return [];
  }

  const files = await readdir(backupDir);
  const backupFiles = files.filter((f) => f.endsWith(".backup")).map((f) => join(backupDir, f));

  const filesWithStats = await Promise.all(
    backupFiles.map(async (file) => {
      const stats = await stat(file);
      return { file, mtime: stats.mtimeMs };
    })
  );

  filesWithStats.sort((a, b) => b.mtime - a.mtime);

  return filesWithStats.map((f) => f.file);
}

/**
 * Clean up old backups based on generation count and age
 */
export async function cleanupOldBackups(
  libraryName: string,
  options?: BackupOptions
): Promise<void> {
  const maxGenerations = options?.maxGenerations ?? DEFAULT_MAX_GENERATIONS;
  const maxAgeMs = options?.maxAgeMs ?? DEFAULT_MAX_AGE_MS;

  const backups = await listBackups(libraryName);
  const now = Date.now();

  const backupsToDelete: string[] = [];

  for (let i = 0; i < backups.length; i++) {
    const backupPath = backups[i];
    if (!backupPath) continue;

    const stats = await stat(backupPath);
    const age = now - stats.mtimeMs;

    if (i >= maxGenerations || age > maxAgeMs) {
      backupsToDelete.push(backupPath);
    }
  }

  await Promise.all(backupsToDelete.map((backup) => unlink(backup)));
}
