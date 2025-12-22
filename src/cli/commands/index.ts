/**
 * CLI commands
 */

export { executeList, formatListOutput } from "./list.js";
export type { ListCommandOptions, ListCommandResult } from "./list.js";

export { executeSearch, formatSearchOutput } from "./search.js";
export type { SearchCommandOptions, SearchCommandResult } from "./search.js";

export { executeAdd, formatAddOutput, getExitCode } from "./add.js";
export type {
  AddCommandOptions,
  AddCommandResult,
  AddedItem,
  FailedItem,
  SkippedItem,
} from "./add.js";

export { executeRemove, formatRemoveOutput } from "./remove.js";
export type { RemoveCommandOptions, RemoveCommandResult } from "./remove.js";

export { executeUpdate, formatUpdateOutput } from "./update.js";
export type { UpdateCommandOptions, UpdateCommandResult } from "./update.js";

export { serverStart, serverStop, serverStatus } from "./server.js";
export type { ServerStartOptions, ServerInfo } from "./server.js";

export { executeCite, formatCiteOutput, formatCiteErrors, getCiteExitCode } from "./cite.js";
export type { CiteCommandOptions, CiteCommandResult } from "./cite.js";
