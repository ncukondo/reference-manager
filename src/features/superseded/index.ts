/**
 * Superseded reference exports (#108)
 */

export type { ChainResolution, SupersededMark, SuccessorResolution } from "./resolver.js";
export {
  buildUuidIndex,
  getSupersededMark,
  isSuperseded,
  resolveFinalSuccessor,
  resolveSuccessor,
} from "./resolver.js";
export { collectSupersededWarnings, formatSupersededWarning } from "./warning.js";
