/**
 * OperationsLibrary class
 *
 * Wraps an ILibrary instance and provides ILibraryOperations interface.
 * Delegates ILibrary methods to the underlying library and implements
 * high-level operations (search, list, cite, import) using operation functions.
 *
 * See: spec/decisions/ADR-009-ilibrary-operations-pattern.md
 */

import type { CslItem } from "../../core/csl-json/types.js";
import type {
	ILibrary,
	FindOptions,
	UpdateOptions,
	UpdateResult,
	RemoveResult,
} from "../../core/library-interface.js";
import type {
	ILibraryOperations,
	ImportOptions,
	ImportResult,
} from "./library-operations.js";
import type { SearchOperationOptions, SearchResult } from "./search.js";
import type { ListOptions, ListResult } from "./list.js";
import type { CiteOperationOptions, CiteResult } from "./cite.js";

/**
 * OperationsLibrary wraps an ILibrary and implements ILibraryOperations
 *
 * This allows CLI commands to use a single interface without branching
 * between local (Library) and server (ServerClient) modes.
 */
export class OperationsLibrary implements ILibraryOperations {
	constructor(private readonly library: ILibrary) {}

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
		return citeReferences(this.library, options);
	}

	async import(inputs: string[], options?: ImportOptions): Promise<ImportResult> {
		const { addReferences } = await import("./add.js");
		return addReferences(inputs, this.library, options ?? {});
	}
}
