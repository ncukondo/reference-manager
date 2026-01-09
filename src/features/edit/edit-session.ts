import { spawnSync } from "node:child_process";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

/**
 * Edit session manager for handling temporary file creation,
 * editor invocation, and cleanup.
 */
export type EditFormat = "yaml" | "json";

export interface EditSessionOptions {
  format: EditFormat;
  editor: string;
}

/**
 * Creates a temporary file for editing.
 */
export function createTempFile(content: string, format: EditFormat): string {
  const timestamp = Date.now();
  const extension = format === "yaml" ? ".yaml" : ".json";
  const fileName = `ref-edit-${timestamp}${extension}`;
  const filePath = path.join(os.tmpdir(), fileName);

  fs.writeFileSync(filePath, content, "utf-8");
  return filePath;
}

/**
 * Opens the editor and waits for it to exit.
 */
export function openEditor(editor: string, filePath: string): number {
  const result = spawnSync(editor, [filePath], {
    stdio: "inherit",
    shell: true,
  });

  return result.status ?? 1;
}

/**
 * Reads content from the temporary file.
 */
export function readTempFile(filePath: string): string {
  return fs.readFileSync(filePath, "utf-8");
}

/**
 * Deletes the temporary file.
 */
export function deleteTempFile(filePath: string): void {
  try {
    fs.unlinkSync(filePath);
  } catch {
    // Ignore if file doesn't exist
  }
}
