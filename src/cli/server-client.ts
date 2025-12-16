import type { CslItem } from "../core/csl-json/types.js";

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
  async update(uuid: string, item: CslItem): Promise<CslItem> {
    const url = `${this.baseUrl}/api/references/${uuid}`;
    const response = await fetch(url, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(item),
    });

    if (!response.ok) {
      throw new Error(await response.text());
    }

    return (await response.json()) as CslItem;
  }

  /**
   * Remove reference by UUID.
   * @param uuid - Reference UUID
   */
  async remove(uuid: string): Promise<void> {
    const url = `${this.baseUrl}/api/references/${uuid}`;
    const response = await fetch(url, {
      method: "DELETE",
    });

    if (!response.ok) {
      throw new Error(await response.text());
    }
  }
}
