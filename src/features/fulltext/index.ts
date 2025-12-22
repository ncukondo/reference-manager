/**
 * Fulltext management exports
 */

export * from "./types.js";
export { generateFulltextFilename } from "./filename.js";
export {
  FulltextManager,
  FulltextIOError,
  FulltextNotAttachedError,
  type AttachOptions,
  type AttachResult,
  type DetachOptions,
  type DetachResult,
} from "./manager.js";
