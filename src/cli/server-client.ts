import type { CslItem } from "../core/csl-json/types.js";
import type { AddReferencesResult } from "../features/operations/add.js";
import type { CiteResult } from "../features/operations/cite.js";
import type { ListOptions, ListResult } from "../features/operations/list.js";
import type { RemoveResult } from "../features/operations/remove.js";
import type { SearchOperationOptions, SearchResult } from "../features/operations/search.js";
import type { UpdateOperationResult } from "../features/operations/update.js";

/**
 * Options for addFromInputs method.
 */
export interface AddFromInputsOptions {
  force?: boolean;
  format?: string;
}

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
export class ServerClient {
  constructor(private baseUrl: string) {}

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
   * Find reference by UUID.
   * @param uuid - Reference UUID
   * @returns CSL item or null if not found
   */
  async findByUuid(uuid: string): Promise<CslItem | null> {
    const url = `${this.baseUrl}/api/references/${uuid}`;
    const response = await fetch(url);

    if (response.status === 404) {
      return null;
    }

    if (!response.ok) {
      throw new Error(await response.text());
    }

    return (await response.json()) as CslItem;
  }

  /**
   * Add new reference to the library.
   * @param item - CSL item to add
   * @returns Created CSL item with UUID
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

    return (await response.json()) as CslItem;
  }

  /**
   * Update existing reference.
   * @param uuid - Reference UUID
   * @param item - Updated CSL item
   * @returns Updated CSL item
   */
  async update(uuid: string, updates: Partial<CslItem>): Promise<UpdateOperationResult> {
    const url = `${this.baseUrl}/api/references/${uuid}`;
    const response = await fetch(url, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    });

    if (!response.ok && response.status !== 404 && response.status !== 409) {
      throw new Error(await response.text());
    }

    return (await response.json()) as UpdateOperationResult;
  }

  /**
   * Remove reference by UUID.
   * @param uuid - Reference UUID
   */
  async remove(uuid: string): Promise<RemoveResult> {
    const url = `${this.baseUrl}/api/references/${uuid}`;
    const response = await fetch(url, {
      method: "DELETE",
    });

    if (!response.ok && response.status !== 404) {
      throw new Error(await response.text());
    }

    return (await response.json()) as RemoveResult;
  }

  /**
   * Add references from various input formats.
   * @param inputs - Array of inputs (file paths, PMIDs, DOIs)
   * @param options - Options for add operation
   * @returns Result containing added, failed, and skipped items
   */
  async addFromInputs(
    inputs: string[],
    options?: AddFromInputsOptions
  ): Promise<AddReferencesResult> {
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
