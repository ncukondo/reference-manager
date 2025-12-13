import { parseCslJson } from "./csl-json/parser";
import { writeCslJson } from "./csl-json/serializer";
import type { CslItem } from "./csl-json/types";
import { Reference } from "./reference";

/**
 * Library manager for CSL-JSON references
 */
export class Library {
  private filePath: string;
  private references: Reference[] = [];

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
    return new Library(filePath, items);
  }

  /**
   * Save library to file
   */
  async save(): Promise<void> {
    const items = this.references.map((ref) => ref.getItem());
    await writeCslJson(this.filePath, items);
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
    // Remove from array
    const index = this.references.indexOf(ref);
    if (index === -1) {
      return false;
    }
    this.references.splice(index, 1);

    // Remove from indices
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

    return true;
  }
}
