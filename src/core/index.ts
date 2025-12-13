/**
 * Core module exports
 */

// Entity classes
export { Reference } from "./reference";
export type { ReferenceCreateOptions } from "./reference";
export { Library } from "./library";

// CSL-JSON types and utilities
export type { CslItem, CslLibrary, CslCustom } from "./csl-json/types";
export { CslItemSchema, CslLibrarySchema } from "./csl-json/types";
export { parseCslJson } from "./csl-json/parser";
export { serializeCslJson, writeCslJson } from "./csl-json/serializer";
export { validateCslJson } from "./csl-json/validator";

// Identifier generation
export { generateId, generateIdWithCollisionCheck } from "./identifier/generator";
export { normalizeText } from "./identifier/normalize";
export {
  generateUuid,
  isValidUuid,
  ensureCustomMetadata,
  extractUuidFromCustom,
} from "./identifier/uuid";
