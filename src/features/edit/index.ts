/**
 * Edit feature entry point
 *
 * Orchestrates the edit workflow:
 * 1. Serialize items to YAML/JSON
 * 2. Create temp file
 * 3. Open editor
 * 4. Parse edited content
 * 5. Return edited items
 */

import type { CslItem } from "../../core/csl-json/types.js";
import {
  type EditFormat,
  createTempFile,
  deleteTempFile,
  openEditor,
  readTempFile,
} from "./edit-session.js";
import { deserializeFromJson, serializeToJson } from "./json-serializer.js";
import { deserializeFromYaml } from "./yaml-deserializer.js";
import { serializeToYaml } from "./yaml-serializer.js";

export type { EditFormat };

export interface EditOptions {
  format: EditFormat;
  editor: string;
}

export interface EditResult {
  success: boolean;
  editedItems: Record<string, unknown>[];
  error?: string;
}

/**
 * Serializes items based on format.
 */
function serialize(items: CslItem[], format: EditFormat): string {
  return format === "yaml" ? serializeToYaml(items) : serializeToJson(items);
}

/**
 * Deserializes content based on format.
 */
function deserialize(content: string, format: EditFormat): Record<string, unknown>[] {
  return format === "yaml" ? deserializeFromYaml(content) : deserializeFromJson(content);
}

/**
 * Executes the edit workflow.
 *
 * @param items - The CSL items to edit
 * @param options - Edit options (format, editor)
 * @returns The edit result containing edited items or error
 */
export async function executeEdit(items: CslItem[], options: EditOptions): Promise<EditResult> {
  const { format, editor } = options;
  let tempFilePath: string | undefined;

  try {
    // 1. Serialize items
    const serialized = serialize(items, format);

    // 2. Create temp file
    tempFilePath = createTempFile(serialized, format);

    // 3. Open editor and wait
    const exitCode = openEditor(editor, tempFilePath);

    if (exitCode !== 0) {
      return {
        success: false,
        editedItems: [],
        error: `Editor exited with code ${exitCode}`,
      };
    }

    // 4. Read edited content
    const editedContent = readTempFile(tempFilePath);

    // 5. Parse edited content
    const editedItems = deserialize(editedContent, format);

    return {
      success: true,
      editedItems,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      success: false,
      editedItems: [],
      error: `Parse error: ${message}`,
    };
  } finally {
    // 6. Cleanup
    if (tempFilePath) {
      deleteTempFile(tempFilePath);
    }
  }
}

// Re-export utilities for CLI use
export { resolveEditor } from "./editor-resolver.js";
export { deserializeFromJson, serializeToJson } from "./json-serializer.js";
export { deserializeFromYaml } from "./yaml-deserializer.js";
export { serializeToYaml } from "./yaml-serializer.js";
