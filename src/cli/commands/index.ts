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

export {
  executeCheck,
  formatCheckTextOutput,
  formatCheckJsonOutput,
} from "./check.js";
export type { CheckCommandOptions, CheckCommandResult } from "./check.js";

export { executeCite, formatCiteOutput, formatCiteErrors, getCiteExitCode } from "./cite.js";
export type { CiteCommandOptions, CiteCommandResult } from "./cite.js";

export {
  executeFulltextAttach,
  executeFulltextGet,
  executeFulltextDetach,
  formatFulltextAttachOutput,
  formatFulltextGetOutput,
  formatFulltextDetachOutput,
  getFulltextExitCode,
} from "./fulltext.js";
export type {
  FulltextAttachOptions,
  FulltextAttachResult,
  FulltextGetOptions,
  FulltextGetResult,
  FulltextDetachOptions,
  FulltextDetachResult,
} from "./fulltext.js";

export { executeExport, formatExportOutput, getExportExitCode } from "./export.js";
export type { ExportCommandOptions, ExportCommandResult } from "./export.js";

export { executeEditCommand, formatEditOutput } from "./edit.js";
export type { EditCommandOptions, EditCommandResult } from "./edit.js";
