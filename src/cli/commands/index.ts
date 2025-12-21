/**
 * CLI commands
 */

export { executeList, formatListOutput, list } from "./list.js";
export type { ListCommandOptions, ListCommandResult } from "./list.js";

export { executeSearch, formatSearchOutput, search } from "./search.js";
export type { SearchCommandOptions, SearchCommandResult } from "./search.js";

export { executeAdd, formatAddOutput, getExitCode } from "./add.js";
export type {
  AddCommandOptions,
  AddCommandResult,
  AddedItem,
  FailedItem,
  SkippedItem,
} from "./add.js";

export { remove } from "./remove.js";
export type { RemoveOptions, RemoveResult } from "./remove.js";

export { update } from "./update.js";
export type { UpdateOptions, UpdateResult } from "./update.js";

export { serverStart, serverStop, serverStatus } from "./server.js";
export type { ServerStartOptions, ServerInfo } from "./server.js";

export { cite, executeCite, formatCiteOutput, formatCiteErrors, getCiteExitCode } from "./cite.js";
export type { CiteCommandOptions, CiteCommandResult } from "./cite.js";
