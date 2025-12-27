import type { CslItem } from "../core/csl-json/types.js";
import type {
  FindOptions,
  RemoveResult as ILibraryRemoveResult,
  RemoveOptions,
  UpdateOptions,
  UpdateResult,
} from "../core/library-interface.js";
import type {
  AddReferencesResult,
  CiteResult,
  ILibraryOperations,
  ImportOptions,
  ListOptions,
  ListResult,
  SearchOperationOptions,
  SearchResult,
} from "../features/operations/index.js";
import type { RemoveResult } from "../features/operations/remove.js";
import type { UpdateOperationResult } from "../features/operations/update.js";

/**
 * Options for cite method.
 */
export interface CiteOptions {
  identifiers: string[];
  byUuid?: boolean;
  inText?: boolean;
  style?: string;
  cslFile?: string;
  locale?: string;
  format?: "text" | "html";
}

/**
 * Client for communicating with the reference-manager HTTP server.
 */
export class ServerClient implements ILibraryOperations {
  constructor(private baseUrl: string) {}

  // ─────────────────────────────────────────────────────────────────────────
  // ILibrary Query methods
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Get all references from the server.
   * @returns Array of CSL items
   */
  async getAll(): Promise<CslItem[]> {
    const url = `${this.baseUrl}/api/references`;
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(await response.text());
    }

    return (await response.json()) as CslItem[];
  }

  /**
   * Find reference by citation ID or UUID.
   * @param identifier - Citation ID or UUID
   * @param options - Find options (byUuid to use UUID lookup)
   * @returns CSL item or undefined if not found
   */
  async find(identifier: string, options: FindOptions = {}): Promise<CslItem | undefined> {
    const { byUuid = false } = options;
    const url = byUuid
      ? `${this.baseUrl}/api/references/uuid/${encodeURIComponent(identifier)}`
      : `${this.baseUrl}/api/references/id/${encodeURIComponent(identifier)}`;
    const response = await fetch(url);

    if (response.status === 404) {
      return undefined;
    }

    if (!response.ok) {
      throw new Error(await response.text());
    }

    return (await response.json()) as CslItem;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // ILibrary Write methods
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Add new reference to the library.
   * @param item - CSL item to add
   * @returns The added CSL item (with generated ID and UUID)
   */
  async add(item: CslItem): Promise<CslItem> {
    const url = `${this.baseUrl}/api/references`;
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(item),
    });

    if (!response.ok) {
      throw new Error(await response.text());
    }

    // Return the added item from server response
    return (await response.json()) as CslItem;
  }

  /**
   * Update reference by citation ID or UUID.
   * @param identifier - Citation ID or UUID
   * @param updates - Partial CSL item with fields to update
   * @param options - Update options (byUuid to use UUID lookup, onIdCollision for collision handling)
   * @returns Update result with updated item, success status, and any ID changes
   */
  async update(
    identifier: string,
    updates: Partial<CslItem>,
    options?: UpdateOptions
  ): Promise<UpdateResult> {
    const { byUuid = false, onIdCollision } = options ?? {};
    const url = byUuid
      ? `${this.baseUrl}/api/references/uuid/${encodeURIComponent(identifier)}`
      : `${this.baseUrl}/api/references/id/${encodeURIComponent(identifier)}`;

    const response = await fetch(url, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ updates, onIdCollision }),
    });

    if (!response.ok && response.status !== 404 && response.status !== 409) {
      throw new Error(await response.text());
    }

    const result = (await response.json()) as UpdateOperationResult;
    // Return UpdateResult with item if available
    const updateResult: UpdateResult = { updated: result.updated };
    if (result.item !== undefined) updateResult.item = result.item;
    if (result.idCollision !== undefined) updateResult.idCollision = result.idCollision;
    if (result.idChanged !== undefined) updateResult.idChanged = result.idChanged;
    if (result.newId !== undefined) updateResult.newId = result.newId;
    return updateResult;
  }

  /**
   * Remove a reference by citation ID or UUID.
   * @param identifier - The citation ID or UUID of the reference to remove
   * @param options - Remove options (byUuid to use UUID lookup)
   * @returns Remove result with removed status and removedItem
   */
  async remove(identifier: string, options: RemoveOptions = {}): Promise<ILibraryRemoveResult> {
    const { byUuid = false } = options;
    const url = byUuid
      ? `${this.baseUrl}/api/references/uuid/${encodeURIComponent(identifier)}`
      : `${this.baseUrl}/api/references/id/${encodeURIComponent(identifier)}`;
    const response = await fetch(url, {
      method: "DELETE",
    });

    if (!response.ok && response.status !== 404) {
      throw new Error(await response.text());
    }

    const result = (await response.json()) as RemoveResult;
    const removeResult: ILibraryRemoveResult = { removed: result.removed };
    if (result.removedItem !== undefined) {
      removeResult.removedItem = result.removedItem;
    }
    return removeResult;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // ILibrary Persistence
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Save is a no-op for ServerClient (HTTP requests are already persisted).
   */
  async save(): Promise<void> {
    // No-op: HTTP requests are immediately persisted by the server
  }

  // ─────────────────────────────────────────────────────────────────────────
  // High-level methods (not part of ILibrary)
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Import references from various input formats.
   * @param inputs - Array of inputs (file paths, PMIDs, DOIs)
   * @param options - Options for import operation
   * @returns Result containing added, failed, and skipped items
   */
  async import(inputs: string[], options?: ImportOptions): Promise<AddReferencesResult> {
    const url = `${this.baseUrl}/api/add`;
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ inputs, options }),
    });

    if (!response.ok) {
      throw new Error(await response.text());
    }

    return (await response.json()) as AddReferencesResult;
  }

  /**
   * Generate citations for references.
   * @param options - Cite options including identifiers and formatting
   * @returns Cite result with per-identifier results
   */
  async cite(options: CiteOptions): Promise<CiteResult> {
    const url = `${this.baseUrl}/api/cite`;
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(options),
    });

    if (!response.ok) {
      throw new Error(await response.text());
    }

    return (await response.json()) as CiteResult;
  }

  /**
   * List all references with optional formatting.
   * @param options - List options including format
   * @returns List result with formatted items
   */
  async list(options?: ListOptions): Promise<ListResult> {
    const url = `${this.baseUrl}/api/list`;
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(options ?? {}),
    });

    if (!response.ok) {
      throw new Error(await response.text());
    }

    return (await response.json()) as ListResult;
  }

  /**
   * Search references with query.
   * @param options - Search options including query and format
   * @returns Search result with formatted items
   */
  async search(options: SearchOperationOptions): Promise<SearchResult> {
    const url = `${this.baseUrl}/api/search`;
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(options),
    });

    if (!response.ok) {
      throw new Error(await response.text());
    }

    return (await response.json()) as SearchResult;
  }
}
