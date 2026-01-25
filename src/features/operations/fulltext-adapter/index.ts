/**
 * Fulltext-to-attachments adapter module
 *
 * Provides utilities for mapping fulltext operations to attachments backend.
 */

export {
  FULLTEXT_ROLE,
  type FulltextFormat,
  formatToExtension,
  extensionToFormat,
  getFulltextFilename,
  findFulltextFile,
  findFulltextFiles,
} from "./fulltext-adapter.js";
