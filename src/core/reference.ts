import type { CslItem } from "./csl-json/types";
import { ensureUuid, extractUuidFromCustom } from "./identifier/uuid";
import { generateIdWithCollisionCheck } from "./identifier/generator";

/**
 * Options for creating a Reference
 */
export interface ReferenceCreateOptions {
  /** Existing IDs to check for collision */
  existingIds?: Set<string>;
}

/**
 * Reference entity wrapping a CSL-JSON item
 */
export class Reference {
  private item: CslItem;
  private uuid: string;

  constructor(item: CslItem) {
    // Ensure UUID is present and valid in custom field
    const customWithUuid = ensureUuid(item.custom);
    this.item = { ...item, custom: customWithUuid };

    // Extract UUID from the custom field
    const extractedUuid = extractUuidFromCustom(customWithUuid);
    if (!extractedUuid) {
      throw new Error("Failed to extract UUID after ensureUuid");
    }
    this.uuid = extractedUuid;
  }

  /**
   * Factory method to create a Reference with UUID and ID generation
   */
  static create(item: CslItem, options?: ReferenceCreateOptions): Reference {
    const existingIds = options?.existingIds || new Set<string>();

    // Generate ID if not provided or empty
    let updatedItem = item;
    if (!item.id || item.id.trim() === "") {
      const generatedId = generateIdWithCollisionCheck(item, Array.from(existingIds));
      updatedItem = { ...item, id: generatedId };
    }

    return new Reference(updatedItem);
  }

  /**
   * Get the underlying CSL-JSON item
   */
  getItem(): CslItem {
    return this.item;
  }

  /**
   * Get the UUID (internal stable identifier)
   */
  getUuid(): string {
    return this.uuid;
  }

  /**
   * Get the ID (Pandoc citation key / BibTeX-key)
   */
  getId(): string {
    return this.item.id;
  }

  /**
   * Get the title
   */
  getTitle(): string | undefined {
    return this.item.title;
  }

  /**
   * Get the authors
   */
  getAuthors(): CslItem["author"] {
    return this.item.author;
  }

  /**
   * Get the year from issued date
   */
  getYear(): number | undefined {
    const issued = this.item.issued;
    if (!issued || !issued["date-parts"] || issued["date-parts"].length === 0) {
      return undefined;
    }
    const firstDate = issued["date-parts"][0];
    return firstDate && firstDate.length > 0 ? firstDate[0] : undefined;
  }

  /**
   * Get the DOI
   */
  getDoi(): string | undefined {
    return this.item.DOI;
  }

  /**
   * Get the PMID
   */
  getPmid(): string | undefined {
    return this.item.PMID;
  }

  /**
   * Get the type
   */
  getType(): string {
    return this.item.type;
  }
}