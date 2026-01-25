/**
 * Fulltext file management
 */

import { existsSync } from "node:fs";
import { copyFile, mkdir, rename, unlink } from "node:fs/promises";
import { join } from "node:path";
import type { CslItem } from "../../core/csl-json/types.js";
import { normalizePathForOutput } from "../../utils/path.js";
import { generateFulltextFilename } from "./filename.js";
import type { FulltextType } from "./types.js";

/**
 * Error thrown when fulltext I/O operation fails
 */
export class FulltextIOError extends Error {
  constructor(
    message: string,
    public readonly cause?: Error
  ) {
    super(message);
    this.name = "FulltextIOError";
  }
}

/**
 * Error thrown when trying to detach non-attached fulltext
 */
export class FulltextNotAttachedError extends Error {
  constructor(
    public readonly itemId: string,
    public readonly type: FulltextType
  ) {
    super(`No ${type} attached to reference ${itemId}`);
    this.name = "FulltextNotAttachedError";
  }
}

/**
 * Options for attachFile
 */
export interface AttachOptions {
  /** Move file instead of copy (default: false) */
  move?: boolean;
  /** Overwrite existing attachment without confirmation (default: false) */
  force?: boolean;
}

/**
 * Result of attachFile operation
 */
export interface AttachResult {
  /** Generated filename */
  filename: string;
  /** Existing filename if already attached (when force=false) */
  existingFile?: string;
  /** Whether existing file was overwritten */
  overwritten: boolean;
  /** Old filename that was deleted (when force=true and filename changed) */
  deletedOldFile?: string;
}

/**
 * Options for detachFile
 */
export interface DetachOptions {
  /** Delete file from disk (default: false, metadata-only detach) */
  removeFiles?: boolean;
}

/**
 * Result of detachFile operation
 */
export interface DetachResult {
  /** Detached filename */
  filename: string;
  /** Whether file was deleted from disk */
  deleted: boolean;
}

/**
 * Manages fulltext file operations
 */
export class FulltextManager {
  constructor(private readonly fulltextDirectory: string) {}

  /**
   * Ensure the fulltext directory exists
   */
  async ensureDirectory(): Promise<void> {
    await mkdir(this.fulltextDirectory, { recursive: true });
  }

  /**
   * Attach a file to a reference
   */
  async attachFile(
    item: CslItem,
    sourcePath: string,
    type: FulltextType,
    options?: AttachOptions
  ): Promise<AttachResult> {
    const { move = false, force = false } = options ?? {};

    // Generate new filename based on current item state
    const newFilename = generateFulltextFilename(item, type);

    // Validate source file exists
    this.validateSourceFile(sourcePath);

    // Get existing filename from metadata
    const existingFilename = this.getExistingFilename(item, type);

    // If already attached and not force, return existing info
    if (existingFilename && !force) {
      return {
        filename: newFilename,
        existingFile: existingFilename,
        overwritten: false,
      };
    }

    // Ensure directory exists
    await this.ensureDirectory();

    // Delete old file if force and filename changed
    const deletedOldFile = await this.deleteOldFileIfNeeded(existingFilename, newFilename, force);

    // Copy or move file to destination
    const destPath = join(this.fulltextDirectory, newFilename);
    await this.copyOrMoveFile(sourcePath, destPath, move);

    const result: AttachResult = {
      filename: newFilename,
      overwritten: existingFilename !== undefined,
    };
    if (deletedOldFile) {
      result.deletedOldFile = deletedOldFile;
    }
    return result;
  }

  /**
   * Validate that source file exists
   */
  private validateSourceFile(sourcePath: string): void {
    if (!existsSync(sourcePath)) {
      throw new FulltextIOError(`Source file not found: ${sourcePath}`);
    }
  }

  /**
   * Delete old file if force mode and filename changed
   * @returns Deleted filename or undefined
   */
  private async deleteOldFileIfNeeded(
    existingFilename: string | undefined,
    newFilename: string,
    force: boolean
  ): Promise<string | undefined> {
    if (!force || !existingFilename || existingFilename === newFilename) {
      return undefined;
    }

    const oldPath = join(this.fulltextDirectory, existingFilename);
    try {
      await unlink(oldPath);
    } catch {
      // Ignore if old file doesn't exist
    }
    return existingFilename;
  }

  /**
   * Copy or move file to destination
   */
  private async copyOrMoveFile(sourcePath: string, destPath: string, move: boolean): Promise<void> {
    try {
      if (move) {
        await rename(sourcePath, destPath);
      } else {
        await copyFile(sourcePath, destPath);
      }
    } catch (error) {
      const operation = move ? "move" : "copy";
      throw new FulltextIOError(
        `Failed to ${operation} file to ${destPath}`,
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Get the full path for an attached file
   * @returns Full path or null if not attached
   */
  getFilePath(item: CslItem, type: FulltextType): string | null {
    const filename = this.getExistingFilename(item, type);
    if (!filename) {
      return null;
    }
    return normalizePathForOutput(join(this.fulltextDirectory, filename));
  }

  /**
   * Detach a file from a reference
   */
  async detachFile(
    item: CslItem,
    type: FulltextType,
    options?: DetachOptions
  ): Promise<DetachResult> {
    const { removeFiles = false } = options ?? {};

    const filename = this.getExistingFilename(item, type);
    if (!filename) {
      throw new FulltextNotAttachedError(item.id, type);
    }

    if (removeFiles) {
      const filePath = join(this.fulltextDirectory, filename);
      try {
        await unlink(filePath);
      } catch {
        // Ignore if file doesn't exist (orphaned metadata)
      }
    }

    return {
      filename,
      deleted: removeFiles,
    };
  }

  /**
   * Get list of attached fulltext types
   */
  getAttachedTypes(item: CslItem): FulltextType[] {
    const types: FulltextType[] = [];
    const fulltext = item.custom?.fulltext;

    if (fulltext?.pdf) {
      types.push("pdf");
    }
    if (fulltext?.markdown) {
      types.push("markdown");
    }

    return types;
  }

  /**
   * Check if item has attachment
   * @param type Optional type to check; if omitted, checks for any attachment
   */
  hasAttachment(item: CslItem, type?: FulltextType): boolean {
    if (type) {
      return this.getExistingFilename(item, type) !== undefined;
    }
    return this.getAttachedTypes(item).length > 0;
  }

  /**
   * Get existing filename from item metadata
   */
  private getExistingFilename(item: CslItem, type: FulltextType): string | undefined {
    const fulltext = item.custom?.fulltext;
    if (!fulltext) {
      return undefined;
    }
    return fulltext[type];
  }
}
