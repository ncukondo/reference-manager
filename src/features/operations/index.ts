/**
 * Operations module exports
 *
 * Re-exports ILibraryOperations interface and OperationsLibrary class
 * for CLI unification pattern.
 *
 * See: spec/decisions/ADR-009-ilibrary-operations-pattern.md
 */

// ILibraryOperations interface and types
export type {
  ILibraryOperations,
  ImportOptions,
  ImportResult,
} from "./library-operations.js";

// OperationsLibrary class
export { OperationsLibrary } from "./operations-library.js";

// Re-export operation types for convenience
export type { SearchOperationOptions, SearchResult } from "./search.js";
export type { ListOptions, ListResult } from "./list.js";
export type { CheckOperationOptions, CheckOperationResult } from "./check.js";
export type { CiteOperationOptions, CiteResult, CiteItemResult } from "./cite.js";
export type { AddReferencesOptions, AddReferencesResult } from "./add.js";

// Attachment operation types
export type {
  AddAttachmentOptions,
  AddAttachmentResult,
  ListAttachmentsOptions,
  ListAttachmentsResult,
  GetAttachmentOptions,
  GetAttachmentResult,
  DetachAttachmentOptions,
  DetachAttachmentResult,
  SyncAttachmentOptions,
  SyncAttachmentResult,
  OpenAttachmentOptions,
  OpenAttachmentResult,
} from "./attachments/index.js";

// JSON output types and formatters
export type {
  AddJsonOutput,
  RemoveJsonOutput,
  UpdateJsonOutput,
} from "./json-output.js";
export {
  formatAddJsonOutput,
  formatRemoveJsonOutput,
  formatUpdateJsonOutput,
} from "./json-output.js";
