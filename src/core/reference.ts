import type { CslItem } from "./csl-json/types";
import { generateIdWithCollisionCheck } from "./identifier/generator";
import { ensureCustomMetadata, extractUuidFromCustom } from "./identifier/uuid";

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
    // Ensure UUID and timestamp are present and valid in custom field
    const customMetadata = ensureCustomMetadata(item.custom);
    this.item = { ...item, custom: customMetadata };

    // Extract UUID from the custom field
    const extractedUuid = extractUuidFromCustom(customMetadata);
    if (!extractedUuid) {
      throw new Error("Failed to extract UUID after ensureCustomMetadata");
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
   * Get the PMCID
   */
  getPmcid(): string | undefined {
    return this.item.PMCID;
  }

  /**
   * Get the URL
   */
  getUrl(): string | undefined {
    return this.item.URL;
  }

  /**
   * Get the keyword
   */
  getKeyword(): string | undefined {
    return this.item.keyword;
  }

  /**
   * Get additional URLs from custom metadata
   */
  getAdditionalUrls(): string[] | undefined {
    return this.item.custom?.additional_urls;
  }

  /**
   * Get the timestamp from custom metadata
   */
  getTimestamp(): string {
    if (!this.item.custom?.timestamp) {
      throw new Error("Timestamp is missing from custom metadata");
    }
    return this.item.custom.timestamp;
  }

  /**
   * Get the type
   */
  getType(): string {
    return this.item.type;
  }
}
