/**
 * ILibraryOperations interface
 *
 * Extends ILibrary with high-level operations for CLI unification.
 * Both OperationsLibrary (local) and ServerClient (server) implement this interface,
 * allowing CLI commands to use a single interface without branching.
 *
 * See: spec/decisions/ADR-009-ilibrary-operations-pattern.md
 */

import type { ILibrary } from "../../core/library-interface.js";
import type { SearchOperationOptions, SearchResult } from "./search.js";
import type { ListOptions, ListResult } from "./list.js";
import type { CiteOperationOptions, CiteResult } from "./cite.js";
import type { AddReferencesOptions, AddReferencesResult } from "./add.js";

/**
 * Options for import operation
 *
 * Extends AddReferencesOptions since import is the high-level version of add.
 */
export type ImportOptions = AddReferencesOptions;

/**
 * Result of import operation
 */
export type ImportResult = AddReferencesResult;

/**
 * High-level library operations interface
 *
 * Extends ILibrary with search, list, cite, and import methods.
 * This interface is implemented by:
 * - OperationsLibrary: Wraps Library and uses operation functions
 * - ServerClient: Makes HTTP requests to server endpoints
 */
export interface ILibraryOperations extends ILibrary {
	/**
	 * Search references by query
	 *
	 * @param options - Search options including query and format
	 * @returns Search results with formatted items
	 */
	search(options: SearchOperationOptions): Promise<SearchResult>;

	/**
	 * List all references
	 *
	 * @param options - List options including format
	 * @returns List results with formatted items
	 */
	list(options?: ListOptions): Promise<ListResult>;

	/**
	 * Generate citations for references
	 *
	 * @param options - Citation options including identifiers, style, and format
	 * @returns Citation results
	 */
	cite(options: CiteOperationOptions): Promise<CiteResult>;

	/**
	 * Import references from various sources
	 *
	 * @param inputs - Array of inputs (PMID, DOI, BibTeX, RIS, file paths)
	 * @param options - Import options
	 * @returns Import results with added, failed, and skipped items
	 */
	import(inputs: string[], options?: ImportOptions): Promise<ImportResult>;
}
