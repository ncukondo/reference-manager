import { existsSync } from "node:fs";
import { mkdir } from "node:fs/promises";
import { dirname } from "node:path";
import { computeFileHash } from "../utils/hash";
import { isEqual } from "../utils/object";
import { parseCslJson } from "./csl-json/parser";
import { writeCslJson } from "./csl-json/serializer";
import type { CslItem } from "./csl-json/types";
import type {
  FindOptions,
  ILibrary,
  RemoveOptions,
  RemoveResult,
  UpdateOptions,
  UpdateResult,
} from "./library-interface.js";
import { Reference } from "./reference";

// Re-export types from library-interface for backward compatibility
export type {
  FindOptions,
  IdentifierType,
  ILibrary,
  UpdateOptions,
  UpdateResult,
} from "./library-interface.js";

/**
 * Library manager for CSL-JSON references.
 * Implements ILibrary interface for use with operations layer.
 */
export class Library implements ILibrary {
  private filePath: string;
  private references: Reference[] = [];
  private currentHash: string | null = null;

  // Indices for fast lookup
  private uuidIndex: Map<string, Reference> = new Map();
  private idIndex: Map<string, Reference> = new Map();
  private doiIndex: Map<string, Reference> = new Map();
  private pmidIndex: Map<string, Reference> = new Map();
  private isbnIndex: Map<string, Reference> = new Map();

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
   * Load library from file.
   * If the file does not exist, creates an empty library file.
   */
  static async load(filePath: string): Promise<Library> {
    // Check if file exists, create empty library if not
    if (!existsSync(filePath)) {
      // Create parent directories if needed
      const dir = dirname(filePath);
      await mkdir(dir, { recursive: true });
      // Create empty library file
      await writeCslJson(filePath, []);
    }

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
   * Reloads the library from file if it was modified externally.
   * Self-writes (detected via hash comparison) are skipped.
   * @returns true if reload occurred, false if skipped (self-write detected)
   */
  async reload(): Promise<boolean> {
    const newHash = await computeFileHash(this.filePath);

    if (newHash === this.currentHash) {
      // Self-write detected, skip reload
      return false;
    }

    // External change detected, reload
    const items = await parseCslJson(this.filePath);

    // Clear and rebuild indices
    this.references = [];
    this.uuidIndex.clear();
    this.idIndex.clear();
    this.doiIndex.clear();
    this.pmidIndex.clear();

    for (const item of items) {
      const ref = new Reference(item);
      this.references.push(ref);
      this.addToIndices(ref);
    }

    // Update hash
    this.currentHash = newHash;

    return true;
  }

  /**
   * Add a reference to the library
   * @param item - The CSL item to add
   * @returns The added CSL item (with generated ID and UUID)
   */
  async add(item: CslItem): Promise<CslItem> {
    // Collect existing IDs for collision check
    const existingIds = new Set(this.references.map((ref) => ref.getId()));

    // Create reference with collision check
    const ref = Reference.create(item, { existingIds });

    // Add to library
    this.references.push(ref);
    this.addToIndices(ref);

    // Return the added item
    return ref.getItem();
  }

  /**
   * Remove a reference by citation ID or UUID.
   * @param identifier - The citation ID or UUID of the reference to remove
   * @param options - Remove options (byUuid to use UUID lookup)
   * @returns Remove result with removed status and the removed item
   */
  async remove(identifier: string, options: RemoveOptions = {}): Promise<RemoveResult> {
    const { idType = "id" } = options;
    let ref: Reference | undefined;
    switch (idType) {
      case "uuid":
        ref = this.uuidIndex.get(identifier);
        break;
      case "doi":
        ref = this.doiIndex.get(identifier);
        break;
      case "pmid":
        ref = this.pmidIndex.get(identifier);
        break;
      case "isbn":
        ref = this.isbnIndex.get(identifier);
        break;
      default: // "id" or unknown
        ref = this.idIndex.get(identifier);
        break;
    }
    if (!ref) {
      return { removed: false };
    }
    const removedItem = ref.getItem();
    const removed = this.removeReference(ref);
    return { removed, removedItem };
  }

  /**
   * Update a reference by citation ID or UUID.
   * @param identifier - The citation ID or UUID of the reference to update
   * @param updates - Partial updates to apply to the reference
   * @param options - Update options (byUuid to use UUID lookup, onIdCollision for collision handling)
   * @returns Update result with updated item, success status, and any ID changes
   */
  async update(
    identifier: string,
    updates: Partial<CslItem>,
    options: UpdateOptions = {}
  ): Promise<UpdateResult> {
    const { idType = "id", ...updateOptions } = options;
    let ref: Reference | undefined;
    switch (idType) {
      case "uuid":
        ref = this.uuidIndex.get(identifier);
        break;
      case "doi":
        ref = this.doiIndex.get(identifier);
        break;
      case "pmid":
        ref = this.pmidIndex.get(identifier);
        break;
      case "isbn":
        ref = this.isbnIndex.get(identifier);
        break;
      default: // "id" or unknown
        ref = this.idIndex.get(identifier);
        break;
    }

    if (!ref) {
      return { updated: false };
    }

    return this.updateReference(ref, updates, updateOptions);
  }

  /**
   * Find a reference by citation ID or UUID.
   * @param identifier - The citation ID or UUID of the reference to find
   * @param options - Find options (byUuid to use UUID lookup)
   * @returns The CSL item if found, undefined otherwise
   */
  async find(identifier: string, options: FindOptions = {}): Promise<CslItem | undefined> {
    const { idType = "id" } = options;

    let ref: Reference | undefined;
    switch (idType) {
      case "uuid":
        ref = this.uuidIndex.get(identifier);
        break;
      case "doi":
        ref = this.doiIndex.get(identifier);
        break;
      case "pmid":
        ref = this.pmidIndex.get(identifier);
        break;
      case "isbn":
        ref = this.isbnIndex.get(identifier);
        break;
      default: // "id" or unknown
        ref = this.idIndex.get(identifier);
        break;
    }

    return ref?.getItem();
  }

  /**
   * Get all references
   */
  async getAll(): Promise<CslItem[]> {
    return this.references.map((ref) => ref.getItem());
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

    // ISBN index
    const isbn = ref.getIsbn();
    if (isbn) {
      this.isbnIndex.set(isbn, ref);
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
      return { updated: false, errorType: "id_collision" };
    }

    // Check for actual changes (excluding protected fields like uuid, created_at, timestamp)
    if (!this.hasChanges(existingItem, updates, newId)) {
      // No changes detected - return the item without updating timestamp
      return { updated: false, item: existingItem };
    }

    const updatedItem = this.buildUpdatedItem(existingItem, updates, newId);

    // Remove old reference from indices
    this.removeFromIndices(ref);

    // Create new reference and replace in array
    const newRef = new Reference(updatedItem);
    this.references[index] = newRef;
    this.addToIndices(newRef);

    const result: UpdateResult = { updated: true, item: newRef.getItem(), oldItem: existingItem };
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
      // ID changed without collision
      return { newId: requestedId, idChanged: true, collision: false };
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

  /** Protected custom fields that should not trigger change detection */
  private static readonly PROTECTED_CUSTOM_FIELDS = new Set(["uuid", "created_at", "timestamp"]);

  /**
   * Check if there are actual changes between existing item and updates.
   * Ignores protected fields (uuid, created_at, timestamp).
   */
  private hasChanges(existingItem: CslItem, updates: Partial<CslItem>, newId: string): boolean {
    if (newId !== existingItem.id) return true;

    for (const [key, value] of Object.entries(updates)) {
      if (key === "id") continue;
      if (key === "custom") {
        if (this.hasCustomFieldChanges(existingItem.custom, value as CslItem["custom"])) {
          return true;
        }
        continue;
      }
      if (!isEqual(existingItem[key as keyof CslItem], value)) return true;
    }
    return false;
  }

  /**
   * Check if custom fields have changes (excluding protected fields).
   */
  private hasCustomFieldChanges(existing: CslItem["custom"], updates: CslItem["custom"]): boolean {
    if (!updates) return false;
    for (const [key, value] of Object.entries(updates)) {
      if (Library.PROTECTED_CUSTOM_FIELDS.has(key)) continue;
      if (!isEqual(existing?.[key], value)) return true;
    }
    return false;
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

    const isbn = ref.getIsbn();
    if (isbn) {
      this.isbnIndex.delete(isbn);
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
