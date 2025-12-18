/**
 * reference-manager - A local reference management tool using CSL-JSON
 *
 * Main library entry point
 */

// Core exports - Reference, Library, CSL-JSON, Identifier
export * from "./core/index.js";

// Utilities and Configuration as namespaces to avoid LogLevel conflict
export * as Utils from "./utils/index.js";
export * as Config from "./config/index.js";

// Feature modules
export * as Search from "./features/search/index.js";
export * as Duplicate from "./features/duplicate/index.js";
export * as Merge from "./features/merge/index.js";
export { FileWatcher, type FileWatcherOptions } from "./features/file-watcher/index.js";
