/**
 * ILibrary - Common interface for library implementations.
 *
 * Both Library (local file-based) and ServerClient (HTTP-based) implement this interface,
 * allowing operations to work with either implementation interchangeably.
 *
 * Design notes:
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
}

/**
 * Result of an update operation.
 */
export interface UpdateResult {
  /** Whether the update was successful */
  updated: boolean;
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
  findById(id: string): CslItem | undefined;

  /**
   * Find a reference by UUID.
   * @param uuid - The internal UUID
   * @returns The CSL item if found, undefined otherwise
   */
  findByUuid(uuid: string): CslItem | undefined;

  /**
   * Get all references.
   * @returns Array of all CSL items in the library
   */
  getAll(): CslItem[];

  // ─────────────────────────────────────────────────────────────────────────
  // Write methods
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Add a new reference to the library.
   * @param item - The CSL item to add
   */
  add(item: CslItem): void;

  /**
   * Update a reference by citation ID.
   * @param id - The citation ID of the reference to update
   * @param updates - Partial CSL item with fields to update
   * @param options - Update options (e.g., ID collision handling)
   * @returns Update result indicating success/failure and any ID changes
   */
  updateById(id: string, updates: Partial<CslItem>, options?: UpdateOptions): UpdateResult;

  /**
   * Update a reference by UUID.
   * @param uuid - The UUID of the reference to update
   * @param updates - Partial CSL item with fields to update
   * @param options - Update options (e.g., ID collision handling)
   * @returns Update result indicating success/failure and any ID changes
   */
  updateByUuid(uuid: string, updates: Partial<CslItem>, options?: UpdateOptions): UpdateResult;

  /**
   * Remove a reference by citation ID.
   * @param id - The citation ID of the reference to remove
   * @returns true if removed, false if not found
   */
  removeById(id: string): boolean;

  /**
   * Remove a reference by UUID.
   * @param uuid - The UUID of the reference to remove
   * @returns true if removed, false if not found
   */
  removeByUuid(uuid: string): boolean;

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
