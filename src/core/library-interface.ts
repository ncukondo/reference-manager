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
 * Options for update operations.
 */
export interface UpdateOptions {
  /** How to handle ID collision: 'fail' (default) or 'suffix' */
  onIdCollision?: "fail" | "suffix";
  /** If true, treat the identifier as UUID; otherwise treat as citation ID (default: false) */
  byUuid?: boolean;
}

/**
 * Result of an update operation.
 */
export interface UpdateResult {
  /** Whether the update was successful */
  updated: boolean;
  /** The updated item (only when updated=true) */
  item?: CslItem;
  /** True if ID collision occurred (only when updated=false and onIdCollision='fail') */
  idCollision?: boolean;
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
   * Find a reference by citation ID.
   * @param id - The citation ID (Pandoc cite key / BibTeX key)
   * @returns The CSL item if found, undefined otherwise
   */
  findById(id: string): Promise<CslItem | undefined>;

  /**
   * Find a reference by UUID.
   * @param uuid - The internal UUID
   * @returns The CSL item if found, undefined otherwise
   */
  findByUuid(uuid: string): Promise<CslItem | undefined>;

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
   */
  add(item: CslItem): Promise<void>;

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
   * Remove a reference by citation ID.
   * @param id - The citation ID of the reference to remove
   * @returns true if removed, false if not found
   */
  removeById(id: string): Promise<boolean>;

  /**
   * Remove a reference by UUID.
   * @param uuid - The UUID of the reference to remove
   * @returns true if removed, false if not found
   */
  removeByUuid(uuid: string): Promise<boolean>;

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
