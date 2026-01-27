/**
 * ILibrary - Common interface for library implementations.
 *
 * Both Library (local file-based) and ServerClient (HTTP-based) implement this interface,
 * allowing operations to work with either implementation interchangeably.
 *
 * Design notes:
 * - All methods are async to support HTTP-based implementations (ServerClient)
 * - Methods return CslItem directly (not Reference) for simplicity and HTTP compatibility
 * - Library internally uses Reference for ID generation and indexing, but exposes CslItem via ILibrary
 * - ServerClient naturally returns CslItem from HTTP responses
 */

import type { CslItem } from "./csl-json/types.js";

/**
 * Identifier types for find/remove/update operations.
 */
export type IdentifierType = "id" | "uuid" | "doi" | "pmid" | "isbn";

/**
 * Options for find operations.
 */
export interface FindOptions {
  /**
   * Specifies the type of identifier being searched.
   * - 'id': Citation ID (default)
   * - 'uuid': Internal UUID
   * - 'doi': Digital Object Identifier
   * - 'pmid': PubMed ID
   * - 'isbn': International Standard Book Number
   */
  idType?: IdentifierType;
}

/**
 * Options for remove operations.
 * Currently identical to FindOptions, but defined separately for clarity and future extensibility.
 */
export type RemoveOptions = FindOptions;

/**
 * Result of a remove operation.
 */
export interface RemoveResult {
  /** Whether the removal was successful */
  removed: boolean;
  /** The removed item (only when removed=true, may be undefined if not available from server) */
  removedItem?: CslItem;
}

export interface UpdateOptions {
  /** How to handle ID collision: 'fail' (default) or 'suffix' */
  onIdCollision?: "fail" | "suffix";

  /**
   * Specifies the type of identifier being searched.
   * - 'id': Citation ID (default)
   * - 'uuid': Internal UUID
   * - 'doi': Digital Object Identifier
   * - 'pmid': PubMed ID
   * - 'isbn': International Standard Book Number
   */
  idType?: IdentifierType;
}

/**
 * Result of an update operation.
 */
export interface UpdateResult {
  /** Whether the update was successful */
  updated: boolean;
  /** The updated item (only when updated=true) */
  item?: CslItem;
  /** The original item before update (when item is available) */
  oldItem?: CslItem;
  /** Error type when update failed (only when updated=false) */
  errorType?: "not_found" | "id_collision";
  /** True if the ID was changed due to collision resolution */
  idChanged?: boolean;
  /** The new ID after collision resolution (only when idChanged=true) */
  newId?: string;
}

/**
 * Common interface for library implementations.
 */
export interface ILibrary {
  // ─────────────────────────────────────────────────────────────────────────
  // Query methods
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Find a reference by citation ID or UUID.
   * @param identifier - The citation ID or UUID of the reference to find
   * @param options - Find options (byUuid to use UUID lookup)
   * @returns The CSL item if found, undefined otherwise
   */
  find(identifier: string, options?: FindOptions): Promise<CslItem | undefined>;

  /**
   * Get all references.
   * @returns Array of all CSL items in the library
   */
  getAll(): Promise<CslItem[]>;

  // ─────────────────────────────────────────────────────────────────────────
  // Write methods
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Add a new reference to the library.
   * @param item - The CSL item to add
   * @returns The added CSL item (with generated ID and UUID if not present)
   */
  add(item: CslItem): Promise<CslItem>;

  /**
   * Update a reference by citation ID or UUID.
   * @param identifier - The citation ID or UUID of the reference to update
   * @param updates - Partial CSL item with fields to update
   * @param options - Update options (byUuid to use UUID lookup, onIdCollision for collision handling)
   * @returns Update result indicating success/failure, updated item, and any ID changes
   */
  update(
    identifier: string,
    updates: Partial<CslItem>,
    options?: UpdateOptions
  ): Promise<UpdateResult>;

  /**
   * Remove a reference by citation ID or UUID.
   * @param identifier - The citation ID or UUID of the reference to remove
   * @param options - Remove options (byUuid to use UUID lookup)
   * @returns Remove result with removed status and optionally the removed item
   */
  remove(identifier: string, options?: RemoveOptions): Promise<RemoveResult>;

  // ─────────────────────────────────────────────────────────────────────────
  // Persistence
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Save the library to persistent storage.
   * For Library: writes to file
   * For ServerClient: no-op (HTTP requests are already persisted)
   */
  save(): Promise<void>;
}
