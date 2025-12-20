/**
 * Import feature public API
 *
 * Provides unified entry point for importing references from various formats.
 */

// Main entry point function
export { importFromInputs } from "./importer.js";

// Types for consumers
export type { ImportInputsOptions, ImportItemResult, ImportResult } from "./importer.js";
