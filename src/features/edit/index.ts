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
  writeTempFile,
} from "./edit-session.js";
import type { EditValidationError } from "./edit-validator.js";
import { validateEditedItems } from "./edit-validator.js";
import {
  deserializeFromJson,
  serializeToJson,
  serializeToJsonWithErrors,
} from "./json-serializer.js";
import { runValidationPrompt } from "./validation-prompt.js";
import { deserializeFromYaml } from "./yaml-deserializer.js";
import { serializeToYaml, serializeToYamlWithErrors } from "./yaml-serializer.js";

export type { EditFormat };

export interface EditOptions {
  format: EditFormat;
  editor: string;
}

export interface EditResult {
  success: boolean;
  editedItems: Record<string, unknown>[];
  error?: string;
  aborted?: boolean;
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
 * Serializes edited items with error annotations based on format.
 *
 * @param editedItems - User's edited items (preserves their changes)
 * @param errors - Validation errors per item index
 * @param format - Output format (yaml or json)
 * @param originalItems - Original items for protected fields (optional)
 */
function serializeWithErrors(
  editedItems: Record<string, unknown>[],
  errors: Map<number, EditValidationError[]>,
  format: EditFormat,
  originalItems?: CslItem[]
): string {
  return format === "yaml"
    ? serializeToYamlWithErrors(editedItems, errors, originalItems)
    : serializeToJsonWithErrors(editedItems, errors, originalItems);
}

/**
 * Executes the edit workflow with validation retry loop.
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

    // Edit-validate loop
    while (true) {
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
      let editedItems: Record<string, unknown>[];
      try {
        editedItems = deserialize(editedContent, format);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return {
          success: false,
          editedItems: [],
          error: `Parse error: ${message}`,
        };
      }

      // 6. Validate edited items
      const validationResult = validateEditedItems(editedItems);

      if (validationResult.valid) {
        // Validation passed - return success
        return {
          success: true,
          editedItems,
        };
      }

      // 7. Validation failed - prompt user
      const choice = await runValidationPrompt(validationResult, items);

      switch (choice) {
        case "re-edit": {
          // Re-serialize edited items (preserving user changes) with error annotations
          const annotated = serializeWithErrors(
            editedItems,
            validationResult.errors,
            format,
            items // Pass original items for protected fields
          );
          writeTempFile(tempFilePath, annotated);
          // Continue loop to re-open editor
          break;
        }
        case "restore": {
          // Re-serialize original items (without errors)
          const original = serialize(items, format);
          writeTempFile(tempFilePath, original);
          // Continue loop to re-open editor
          break;
        }
        case "abort":
          return {
            success: false,
            editedItems: [],
            aborted: true,
          };
      }
    }
  } finally {
    // Cleanup
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
