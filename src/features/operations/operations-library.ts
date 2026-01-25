/**
 * OperationsLibrary class
 *
 * Wraps an ILibrary instance and provides ILibraryOperations interface.
 * Delegates ILibrary methods to the underlying library and implements
 * high-level operations (search, list, cite, import) using operation functions.
 *
 * See: spec/decisions/ADR-009-ilibrary-operations-pattern.md
 */

import type { CitationConfig } from "../../config/schema.js";
import type { CslItem } from "../../core/csl-json/types.js";
import type {
  FindOptions,
  ILibrary,
  RemoveResult,
  UpdateOptions,
  UpdateResult,
} from "../../core/library-interface.js";
import type {
  AddAttachmentOptions,
  AddAttachmentResult,
  DetachAttachmentOptions,
  DetachAttachmentResult,
  GetAttachmentOptions,
  GetAttachmentResult,
  ListAttachmentsOptions,
  ListAttachmentsResult,
  OpenAttachmentOptions,
  OpenAttachmentResult,
  SyncAttachmentOptions,
  SyncAttachmentResult,
} from "./attachments/index.js";
import type { CiteOperationOptions, CiteResult } from "./cite.js";
import type { ILibraryOperations, ImportOptions, ImportResult } from "./library-operations.js";
import type { ListOptions, ListResult } from "./list.js";
import type { SearchOperationOptions, SearchResult } from "./search.js";

/**
 * OperationsLibrary wraps an ILibrary and implements ILibraryOperations
 *
 * This allows CLI commands to use a single interface without branching
 * between local (Library) and server (ServerClient) modes.
 */
export class OperationsLibrary implements ILibraryOperations {
  constructor(
    private readonly library: ILibrary,
    private readonly citationConfig?: CitationConfig
  ) {}

  // ILibrary delegation

  find(identifier: string, options?: FindOptions): Promise<CslItem | undefined> {
    return this.library.find(identifier, options);
  }

  getAll(): Promise<CslItem[]> {
    return this.library.getAll();
  }

  add(item: CslItem): Promise<CslItem> {
    return this.library.add(item);
  }

  update(
    idOrUuid: string,
    updates: Partial<CslItem>,
    options?: UpdateOptions
  ): Promise<UpdateResult> {
    return this.library.update(idOrUuid, updates, options);
  }

  remove(identifier: string, options?: FindOptions): Promise<RemoveResult> {
    return this.library.remove(identifier, options);
  }

  save(): Promise<void> {
    return this.library.save();
  }

  // High-level operations

  async search(options: SearchOperationOptions): Promise<SearchResult> {
    const { searchReferences } = await import("./search.js");
    return searchReferences(this.library, options);
  }

  async list(options?: ListOptions): Promise<ListResult> {
    const { listReferences } = await import("./list.js");
    return listReferences(this.library, options ?? {});
  }

  async cite(options: CiteOperationOptions): Promise<CiteResult> {
    const { citeReferences } = await import("./cite.js");
    // Merge citation config defaults with explicit options
    const defaultStyle = options.defaultStyle ?? this.citationConfig?.defaultStyle;
    const cslDirectory = options.cslDirectory ?? this.citationConfig?.cslDirectory;
    const mergedOptions: CiteOperationOptions = {
      ...options,
      ...(defaultStyle !== undefined && { defaultStyle }),
      ...(cslDirectory !== undefined && { cslDirectory }),
    };
    return citeReferences(this.library, mergedOptions);
  }

  async import(inputs: string[], options?: ImportOptions): Promise<ImportResult> {
    const { addReferences } = await import("./add.js");
    return addReferences(inputs, this.library, options ?? {});
  }

  // Attachment operations

  async attachAdd(options: AddAttachmentOptions): Promise<AddAttachmentResult> {
    const { addAttachment } = await import("./attachments/index.js");
    return addAttachment(this.library, options);
  }

  async attachList(options: ListAttachmentsOptions): Promise<ListAttachmentsResult> {
    const { listAttachments } = await import("./attachments/index.js");
    return listAttachments(this.library, options);
  }

  async attachGet(options: GetAttachmentOptions): Promise<GetAttachmentResult> {
    const { getAttachment } = await import("./attachments/index.js");
    return getAttachment(this.library, options);
  }

  async attachDetach(options: DetachAttachmentOptions): Promise<DetachAttachmentResult> {
    const { detachAttachment } = await import("./attachments/index.js");
    return detachAttachment(this.library, options);
  }

  async attachSync(options: SyncAttachmentOptions): Promise<SyncAttachmentResult> {
    const { syncAttachments } = await import("./attachments/index.js");
    return syncAttachments(this.library, options);
  }

  async attachOpen(options: OpenAttachmentOptions): Promise<OpenAttachmentResult> {
    const { openAttachment } = await import("./attachments/index.js");
    return openAttachment(this.library, options);
  }
}
