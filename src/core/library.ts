import { computeFileHash } from "../utils/hash";
import { parseCslJson } from "./csl-json/parser";
import { writeCslJson } from "./csl-json/serializer";
import type { CslItem } from "./csl-json/types";
import { Reference } from "./reference";

/**
 * Options for update operations
 */
export interface UpdateOptions {
  /** How to handle ID collision: 'fail' (default) or 'suffix' */
  onIdCollision?: "fail" | "suffix";
}

/**
 * Result of an update operation
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
 * Library manager for CSL-JSON references
 */
export class Library {
  private filePath: string;
  private references: Reference[] = [];
  private currentHash: string | null = null;

  // Indices for fast lookup
  private uuidIndex: Map<string, Reference> = new Map();
  private idIndex: Map<string, Reference> = new Map();
  private doiIndex: Map<string, Reference> = new Map();
  private pmidIndex: Map<string, Reference> = new Map();

  private constructor(filePath: string, items: CslItem[]) {
    this.filePath = filePath;

    // Create references and build indices
    for (const item of items) {
      const ref = new Reference(item);
      this.references.push(ref);
      this.addToIndices(ref);
    }
  }

  /**
   * Load library from file
   */
  static async load(filePath: string): Promise<Library> {
    const items = await parseCslJson(filePath);
    const library = new Library(filePath, items);
    // Compute and store file hash after loading
    library.currentHash = await computeFileHash(filePath);
    return library;
  }

  /**
   * Save library to file
   */
  async save(): Promise<void> {
    const items = this.references.map((ref) => ref.getItem());
    await writeCslJson(this.filePath, items);
    // Update file hash after saving
    this.currentHash = await computeFileHash(this.filePath);
  }

  /**
   * Add a reference to the library
   */
  add(item: CslItem): void {
    // Collect existing IDs for collision check
    const existingIds = new Set(this.references.map((ref) => ref.getId()));

    // Create reference with collision check
    const ref = Reference.create(item, { existingIds });

    // Add to library
    this.references.push(ref);
    this.addToIndices(ref);
  }

  /**
   * Remove a reference by UUID
   */
  removeByUuid(uuid: string): boolean {
    const ref = this.uuidIndex.get(uuid);
    if (!ref) {
      return false;
    }

    return this.removeReference(ref);
  }

  /**
   * Remove a reference by ID
   */
  removeById(id: string): boolean {
    const ref = this.idIndex.get(id);
    if (!ref) {
      return false;
    }

    return this.removeReference(ref);
  }

  /**
   * Update a reference by UUID.
   * @param uuid - The UUID of the reference to update
   * @param updates - Partial updates to apply to the reference
   * @returns true if the reference was found and updated, false otherwise
   */
  updateByUuid(uuid: string, updates: Partial<CslItem>, options: UpdateOptions = {}): UpdateResult {
    const ref = this.uuidIndex.get(uuid);
    if (!ref) {
      return { updated: false };
    }

    return this.updateReference(ref, updates, options);
  }

  /**
   * Update a reference by ID.
   * @param id - The ID of the reference to update
   * @param updates - Partial updates to apply to the reference
   * @returns true if the reference was found and updated, false otherwise
   */
  updateById(id: string, updates: Partial<CslItem>, options: UpdateOptions = {}): UpdateResult {
    const ref = this.idIndex.get(id);
    if (!ref) {
      return { updated: false };
    }

    return this.updateReference(ref, updates, options);
  }

  /**
   * Find a reference by UUID
   */
  findByUuid(uuid: string): Reference | undefined {
    return this.uuidIndex.get(uuid);
  }

  /**
   * Find a reference by ID
   */
  findById(id: string): Reference | undefined {
    return this.idIndex.get(id);
  }

  /**
   * Find a reference by DOI
   */
  findByDoi(doi: string): Reference | undefined {
    return this.doiIndex.get(doi);
  }

  /**
   * Find a reference by PMID
   */
  findByPmid(pmid: string): Reference | undefined {
    return this.pmidIndex.get(pmid);
  }

  /**
   * Get all references
   */
  getAll(): Reference[] {
    return [...this.references];
  }

  /**
   * Get the file path
   */
  getFilePath(): string {
    return this.filePath;
  }

  /**
   * Get the current file hash
   * Returns null if the library has not been loaded or saved yet
   */
  getCurrentHash(): string | null {
    return this.currentHash;
  }

  /**
   * Add reference to all indices
   */
  private addToIndices(ref: Reference): void {
    // UUID index
    this.uuidIndex.set(ref.getUuid(), ref);

    // ID index
    this.idIndex.set(ref.getId(), ref);

    // DOI index
    const doi = ref.getDoi();
    if (doi) {
      this.doiIndex.set(doi, ref);
    }

    // PMID index
    const pmid = ref.getPmid();
    if (pmid) {
      this.pmidIndex.set(pmid, ref);
    }
  }

  /**
   * Remove reference from all indices and array
   */
  private removeReference(ref: Reference): boolean {
    const index = this.references.indexOf(ref);
    if (index === -1) {
      return false;
    }
    this.references.splice(index, 1);
    this.removeFromIndices(ref);
    return true;
  }

  /**
   * Update a reference with partial updates.
   * Preserves uuid and created_at, updates timestamp.
   */
  private updateReference(
    ref: Reference,
    updates: Partial<CslItem>,
    options: UpdateOptions = {}
  ): UpdateResult {
    const index = this.references.indexOf(ref);
    if (index === -1) {
      return { updated: false };
    }

    const existingItem = ref.getItem();
    const currentId = ref.getId();
    const { newId, idChanged, collision } = this.resolveNewId(
      updates.id ?? existingItem.id,
      currentId,
      options
    );

    if (collision) {
      return { updated: false, idCollision: true };
    }

    const updatedItem = this.buildUpdatedItem(existingItem, updates, newId);

    // Remove old reference from indices
    this.removeFromIndices(ref);

    // Create new reference and replace in array
    const newRef = new Reference(updatedItem);
    this.references[index] = newRef;
    this.addToIndices(newRef);

    const result: UpdateResult = { updated: true };
    if (idChanged) {
      result.idChanged = true;
      result.newId = newId;
    }
    return result;
  }

  /**
   * Resolve the new ID, handling collisions based on options.
   */
  private resolveNewId(
    requestedId: string,
    currentId: string,
    options: UpdateOptions
  ): { newId: string; idChanged: boolean; collision: boolean } {
    if (requestedId === currentId) {
      return { newId: requestedId, idChanged: false, collision: false };
    }

    const conflictingRef = this.idIndex.get(requestedId);
    if (!conflictingRef) {
      return { newId: requestedId, idChanged: false, collision: false };
    }

    const onIdCollision = options.onIdCollision ?? "fail";
    if (onIdCollision === "fail") {
      return { newId: requestedId, idChanged: false, collision: true };
    }

    // onIdCollision === "suffix": resolve by adding suffix
    const existingIds = new Set(this.references.map((r) => r.getId()));
    existingIds.delete(currentId);
    const resolvedId = this.resolveIdCollision(requestedId, existingIds);
    return { newId: resolvedId, idChanged: true, collision: false };
  }

  /**
   * Build the updated CslItem, preserving uuid and created_at.
   */
  private buildUpdatedItem(
    existingItem: CslItem,
    updates: Partial<CslItem>,
    newId: string
  ): CslItem {
    return {
      ...existingItem,
      ...updates,
      id: newId,
      type: updates.type ?? existingItem.type,
      custom: {
        ...(existingItem.custom || {}),
        ...(updates.custom || {}),
        uuid: existingItem.custom?.uuid || "",
        created_at: existingItem.custom?.created_at || new Date().toISOString(),
        timestamp: new Date().toISOString(),
      },
    };
  }

  /**
   * Remove a reference from all indices.
   */
  private removeFromIndices(ref: Reference): void {
    this.uuidIndex.delete(ref.getUuid());
    this.idIndex.delete(ref.getId());

    const doi = ref.getDoi();
    if (doi) {
      this.doiIndex.delete(doi);
    }

    const pmid = ref.getPmid();
    if (pmid) {
      this.pmidIndex.delete(pmid);
    }
  }

  /**
   * Generate an alphabetic suffix for ID collision resolution.
   * 0 -> 'a', 1 -> 'b', ..., 25 -> 'z', 26 -> 'aa', etc.
   */
  private generateSuffix(index: number): string {
    const alphabet = "abcdefghijklmnopqrstuvwxyz";
    let suffix = "";
    let n = index;

    do {
      suffix = alphabet[n % 26] + suffix;
      n = Math.floor(n / 26) - 1;
    } while (n >= 0);

    return suffix;
  }

  /**
   * Resolve ID collision by appending alphabetic suffix.
   */
  private resolveIdCollision(baseId: string, existingIds: Set<string>): string {
    if (!existingIds.has(baseId)) {
      return baseId;
    }

    let index = 0;
    let newId: string;

    do {
      const suffix = this.generateSuffix(index);
      newId = `${baseId}${suffix}`;
      index++;
    } while (existingIds.has(newId));

    return newId;
  }
}
