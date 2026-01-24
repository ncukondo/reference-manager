/**
 * ILibraryOperations interface
 *
 * Extends ILibrary with high-level operations for CLI unification.
 * Both OperationsLibrary (local) and ServerClient (server) implement this interface,
 * allowing CLI commands to use a single interface without branching.
 *
 * See: spec/decisions/ADR-009-ilibrary-operations-pattern.md
 */

import type { ILibrary } from "../../core/library-interface.js";
import type { AddReferencesOptions, AddReferencesResult } from "./add.js";
import type {
  AddAttachmentOptions,
  AddAttachmentResult,
  DetachAttachmentOptions,
  DetachAttachmentResult,
  GetAttachmentOptions,
  GetAttachmentResult,
  ListAttachmentsOptions,
  ListAttachmentsResult,
  OpenAttachmentOptions,
  OpenAttachmentResult,
  SyncAttachmentOptions,
  SyncAttachmentResult,
} from "./attachments/index.js";
import type { CiteOperationOptions, CiteResult } from "./cite.js";
import type { ListOptions, ListResult } from "./list.js";
import type { SearchOperationOptions, SearchResult } from "./search.js";

/**
 * Options for import operation
 *
 * Extends AddReferencesOptions since import is the high-level version of add.
 */
export type ImportOptions = AddReferencesOptions;

/**
 * Result of import operation
 */
export type ImportResult = AddReferencesResult;

/**
 * High-level library operations interface
 *
 * Extends ILibrary with search, list, cite, and import methods.
 * This interface is implemented by:
 * - OperationsLibrary: Wraps Library and uses operation functions
 * - ServerClient: Makes HTTP requests to server endpoints
 */
export interface ILibraryOperations extends ILibrary {
  /**
   * Search references by query
   *
   * @param options - Search options including query and pagination
   * @returns Search results with raw CslItem[]
   */
  search(options: SearchOperationOptions): Promise<SearchResult>;

  /**
   * List all references
   *
   * @param options - Pagination and sorting options
   * @returns List results with raw CslItem[]
   */
  list(options?: ListOptions): Promise<ListResult>;

  /**
   * Generate citations for references
   *
   * @param options - Citation options including identifiers, style, and format
   * @returns Citation results
   */
  cite(options: CiteOperationOptions): Promise<CiteResult>;

  /**
   * Import references from various sources
   *
   * @param inputs - Array of inputs (PMID, DOI, BibTeX, RIS, file paths)
   * @param options - Import options
   * @returns Import results with added, failed, and skipped items
   */
  import(inputs: string[], options?: ImportOptions): Promise<ImportResult>;

  // Attachment operations

  /**
   * Add attachment to a reference
   *
   * @param options - Add attachment options
   * @returns Result of the add operation
   */
  attachAdd(options: AddAttachmentOptions): Promise<AddAttachmentResult>;

  /**
   * List attachments for a reference
   *
   * @param options - List attachments options
   * @returns List of attachments
   */
  attachList(options: ListAttachmentsOptions): Promise<ListAttachmentsResult>;

  /**
   * Get attachment file path or content
   *
   * @param options - Get attachment options
   * @returns Attachment file path or content
   */
  attachGet(options: GetAttachmentOptions): Promise<GetAttachmentResult>;

  /**
   * Detach attachment from a reference
   *
   * @param options - Detach attachment options
   * @returns Result of the detach operation
   */
  attachDetach(options: DetachAttachmentOptions): Promise<DetachAttachmentResult>;

  /**
   * Sync attachments with files on disk
   *
   * @param options - Sync attachment options
   * @returns Sync result
   */
  attachSync(options: SyncAttachmentOptions): Promise<SyncAttachmentResult>;

  /**
   * Open attachment directory or file
   *
   * @param options - Open attachment options
   * @returns Result of the open operation
   */
  attachOpen(options: OpenAttachmentOptions): Promise<OpenAttachmentResult>;
}
