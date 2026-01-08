/**
 * CLI Entry Point
 */

import { Command } from "commander";
import { z } from "zod";
// Import package.json for version and description
import packageJson from "../../package.json" with { type: "json" };
import type { CslItem } from "../core/csl-json/types.js";
import { Library } from "../core/library.js";
import {
  type FormatAddJsonOptions,
  formatAddJsonOutput,
  formatRemoveJsonOutput,
  formatUpdateJsonOutput,
} from "../features/operations/json-output.js";
import { getPortfilePath } from "../server/portfile.js";
import { executeAdd, formatAddOutput, getExitCode } from "./commands/add.js";
import {
  type CiteCommandOptions,
  executeCite,
  formatCiteErrors,
  formatCiteOutput,
  getCiteExitCode,
} from "./commands/cite.js";
import {
  type FulltextAttachOptions,
  type FulltextDetachOptions,
  type FulltextGetOptions,
  type FulltextOpenOptions,
  executeFulltextAttach,
  executeFulltextDetach,
  executeFulltextGet,
  executeFulltextOpen,
  formatFulltextAttachOutput,
  formatFulltextDetachOutput,
  formatFulltextGetOutput,
  formatFulltextOpenOutput,
  getFulltextExitCode,
} from "./commands/fulltext.js";
import { type ListCommandOptions, executeList, formatListOutput } from "./commands/list.js";
import { mcpStart } from "./commands/mcp.js";
import {
  type RemoveCommandOptions,
  executeRemove,
  formatFulltextWarning,
  formatRemoveOutput,
  getFulltextAttachmentTypes,
} from "./commands/remove.js";
import {
  type SearchCommandOptions,
  executeInteractiveSearch,
  executeSearch,
  formatSearchOutput,
} from "./commands/search.js";
import { serverStart, serverStatus, serverStop } from "./commands/server.js";
import {
  type UpdateCommandOptions,
  applySetOperations,
  executeUpdate,
  formatUpdateOutput,
  parseSetOption,
} from "./commands/update.js";
import { handleCompletion, registerCompletionCommand } from "./completion.js";
import { type ExecutionContext, createExecutionContext } from "./execution-context.js";
import type { CliOptions } from "./helpers.js";
import {
  isTTY,
  loadConfigWithOverrides,
  parseJsonInput,
  readConfirmation,
  readJsonInput,
  readStdinBuffer,
  readStdinContent,
} from "./helpers.js";

/**
 * Create Commander program instance
 */
export function createProgram(): Command {
  const program = new Command();

  program
    .name("reference-manager")
    .version(packageJson.version)
    .description(packageJson.description);

  // Global options
  program
    .option("--library <path>", "Override library file path")
    .option("--log-level <level>", "Override log level (silent|info|debug)")
    .option("--config <path>", "Use specific config file")
    .option("--quiet", "Suppress all non-error output")
    .option("--verbose", "Enable verbose output")
    .option("--no-backup", "Disable backup creation")
    .option("--backup-dir <path>", "Override backup directory");

  // Register commands
  registerListCommand(program);
  registerSearchCommand(program);
  registerAddCommand(program);
  registerRemoveCommand(program);
  registerUpdateCommand(program);
  registerCiteCommand(program);
  registerServerCommand(program);
  registerFulltextCommand(program);
  registerMcpCommand(program);
  registerCompletionCommand(program);

  return program;
}

/**
 * Handle 'list' command action
 */
async function handleListAction(options: ListCommandOptions, program: Command): Promise<void> {
  try {
    const globalOpts = program.opts();
    const config = await loadConfigWithOverrides({ ...globalOpts, ...options });

    const context = await createExecutionContext(config, Library.load);
    const result = await executeList(options, context);
    const output = formatListOutput(result, options.json ?? false);

    if (output) {
      process.stdout.write(`${output}\n`);
    }

    process.exit(0);
  } catch (error) {
    process.stderr.write(`Error: ${error instanceof Error ? error.message : String(error)}\n`);
    process.exit(4);
  }
}

/**
 * Register 'list' command
 */
function registerListCommand(program: Command): void {
  program
    .command("list")
    .description("List all references in the library")
    .option("--json", "Output in JSON format")
    .option("--ids-only", "Output only citation keys")
    .option("--uuid", "Output only UUIDs")
    .option("--bibtex", "Output in BibTeX format")
    .option("--sort <field>", "Sort by field: created|updated|published|author|title")
    .option("--order <order>", "Sort order: asc|desc")
    .option("-n, --limit <n>", "Maximum number of results", Number.parseInt)
    .option("--offset <n>", "Number of results to skip", Number.parseInt)
    .action(async (options) => {
      await handleListAction(options, program);
    });
}

/**
 * Handle 'search' command action
 */
async function handleSearchAction(
  query: string,
  options: Omit<SearchCommandOptions, "query">,
  program: Command
): Promise<void> {
  try {
    const globalOpts = program.opts();
    const config = await loadConfigWithOverrides({ ...globalOpts, ...options });

    const context = await createExecutionContext(config, Library.load);

    // Handle interactive mode
    if (options.interactive) {
      const result = await executeInteractiveSearch({ ...options, query }, context, config);
      if (result.output) {
        process.stdout.write(`${result.output}\n`);
      }
      process.exit(result.cancelled ? 0 : 0);
    }

    // Regular search mode
    const result = await executeSearch({ ...options, query }, context);
    const output = formatSearchOutput(result, options.json ?? false);

    if (output) {
      process.stdout.write(`${output}\n`);
    }

    process.exit(0);
  } catch (error) {
    process.stderr.write(`Error: ${error instanceof Error ? error.message : String(error)}\n`);
    process.exit(4);
  }
}

/**
 * Register 'search' command
 */
function registerSearchCommand(program: Command): void {
  program
    .command("search")
    .description("Search references")
    .argument("[query]", "Search query (required unless using --interactive)")
    .option("-i, --interactive", "Enable interactive search mode")
    .option("--json", "Output in JSON format")
    .option("--ids-only", "Output only citation keys")
    .option("--uuid", "Output only UUIDs")
    .option("--bibtex", "Output in BibTeX format")
    .option("--sort <field>", "Sort by field: created|updated|published|author|title|relevance")
    .option("--order <order>", "Sort order: asc|desc")
    .option("-n, --limit <n>", "Maximum number of results", Number.parseInt)
    .option("--offset <n>", "Number of results to skip", Number.parseInt)
    .action(async (query: string | undefined, options) => {
      // Validate: query is required unless interactive mode
      if (!options.interactive && !query) {
        process.stderr.write("Error: Search query is required unless using --interactive\n");
        process.exit(1);
      }
      await handleSearchAction(query ?? "", options, program);
    });
}

/**
 * Register 'add' command
 */
interface AddCommandOptions extends CliOptions {
  force?: boolean;
  format?: string;
  verbose?: boolean;
  output?: "json" | "text";
  full?: boolean;
}

function buildAddOptions(
  inputs: string[],
  options: AddCommandOptions,
  config: Awaited<ReturnType<typeof loadConfigWithOverrides>>,
  stdinContent?: string
): Parameters<typeof executeAdd>[0] {
  const addOptions: Parameters<typeof executeAdd>[0] = {
    inputs,
    force: options.force ?? false,
  };
  if (options.format !== undefined) {
    addOptions.format = options.format;
  }
  if (options.verbose !== undefined) {
    addOptions.verbose = options.verbose;
  }
  if (stdinContent?.trim()) {
    addOptions.stdinContent = stdinContent;
  }
  // Build pubmedConfig only if values exist
  const pubmedConfig: { email?: string; apiKey?: string } = {};
  if (config.pubmed.email !== undefined) {
    pubmedConfig.email = config.pubmed.email;
  }
  if (config.pubmed.apiKey !== undefined) {
    pubmedConfig.apiKey = config.pubmed.apiKey;
  }
  if (Object.keys(pubmedConfig).length > 0) {
    addOptions.pubmedConfig = pubmedConfig;
  }
  return addOptions;
}

async function outputAddResultJson(
  result: Awaited<ReturnType<typeof executeAdd>>,
  context: ExecutionContext,
  full: boolean
): Promise<void> {
  // Build sources map (placeholder - would need explicit tracking for full support)
  const sources = new Map<string, string>();
  for (const item of result.added) {
    sources.set(item.id, "");
  }

  // Build items map for --full option
  const items = new Map<string, CslItem>();
  if (full) {
    for (const added of result.added) {
      const item = await context.library.find(added.id, { idType: "id" });
      if (item) {
        items.set(added.id, item);
      }
    }
  }

  const options: FormatAddJsonOptions = { full, sources, items };
  const jsonOutput = formatAddJsonOutput(result, options);
  process.stdout.write(`${JSON.stringify(jsonOutput)}\n`);
}

async function handleAddAction(
  inputs: string[],
  options: AddCommandOptions,
  program: Command
): Promise<void> {
  const outputFormat = options.output ?? "text";

  try {
    const globalOpts = program.opts();
    const config = await loadConfigWithOverrides({ ...globalOpts, ...options });

    // If no inputs provided, read content from stdin
    let stdinContent: string | undefined;
    if (inputs.length === 0) {
      stdinContent = await readStdinContent();
    }

    // Create execution context
    const context = await createExecutionContext(config, Library.load);

    // Build and execute add options
    const addOptions = buildAddOptions(inputs, options, config, stdinContent);
    const result = await executeAdd(addOptions, context);

    // Output result
    if (outputFormat === "json") {
      await outputAddResultJson(result, context, options.full ?? false);
    } else {
      const output = formatAddOutput(result, options.verbose ?? false);
      process.stderr.write(`${output}\n`);
    }

    process.exit(getExitCode(result));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    if (outputFormat === "json") {
      process.stdout.write(`${JSON.stringify({ success: false, error: message })}\n`);
    } else {
      process.stderr.write(`Error: ${message}\n`);
    }
    process.exit(1);
  }
}

function registerAddCommand(program: Command): void {
  program
    .command("add")
    .description("Add new reference(s) to the library")
    .argument("[input...]", "File paths or identifiers (PMID/DOI/ISBN), or use stdin")
    .option("-f, --force", "Skip duplicate detection")
    .option(
      "--format <format>",
      "Explicit input format: json|bibtex|ris|pmid|doi|isbn|auto",
      "auto"
    )
    .option("--verbose", "Show detailed error information")
    .option("-o, --output <format>", "Output format: json|text", "text")
    .option("--full", "Include full CSL-JSON data in JSON output")
    .action(async (inputs: string[], options: AddCommandOptions) => {
      await handleAddAction(inputs, options, program);
    });
}

/**
 * Register 'remove' command
 */
interface RemoveActionOptions {
  uuid?: boolean;
  force?: boolean;
  output?: "json" | "text";
  full?: boolean;
}

function outputRemoveNotFoundAndExit(identifier: string, outputFormat: "json" | "text"): never {
  if (outputFormat === "json") {
    const jsonOutput = formatRemoveJsonOutput({ removed: false }, identifier, {});
    process.stdout.write(`${JSON.stringify(jsonOutput)}\n`);
  } else {
    process.stderr.write(`Error: Reference not found: ${identifier}\n`);
  }
  process.exit(1);
}

function outputRemoveResult(
  result: Awaited<ReturnType<typeof executeRemove>>,
  identifier: string,
  outputFormat: "json" | "text",
  full: boolean
): void {
  if (outputFormat === "json") {
    const jsonOutput = formatRemoveJsonOutput(result, identifier, { full });
    process.stdout.write(`${JSON.stringify(jsonOutput)}\n`);
  } else {
    const output = formatRemoveOutput(result, identifier);
    process.stderr.write(`${output}\n`);
  }
}

async function confirmRemoveIfNeeded(
  item: CslItem,
  hasFulltext: boolean,
  force: boolean
): Promise<boolean> {
  if (force || !isTTY()) {
    return true;
  }

  const authors = Array.isArray(item.author)
    ? item.author.map((a) => `${a.family || ""}, ${a.given?.[0] || ""}.`).join("; ")
    : "(no authors)";

  const fulltextTypes = hasFulltext ? getFulltextAttachmentTypes(item) : [];
  const warning = hasFulltext ? formatFulltextWarning(fulltextTypes) : "";
  const warningPart = warning ? `\n\n${warning}` : "";

  const confirmMsg = `Remove reference [${item.id}]?\nTitle: ${item.title || "(no title)"}\nAuthors: ${authors}${warningPart}\nContinue?`;
  return readConfirmation(confirmMsg);
}

function handleRemoveError(
  error: unknown,
  identifier: string,
  outputFormat: "json" | "text"
): never {
  const message = error instanceof Error ? error.message : String(error);
  if (outputFormat === "json") {
    process.stdout.write(`${JSON.stringify({ success: false, id: identifier, error: message })}\n`);
  } else {
    process.stderr.write(`Error: ${message}\n`);
  }
  process.exit(message.includes("not found") ? 1 : 4);
}

async function handleRemoveAction(
  identifier: string,
  options: RemoveActionOptions,
  program: Command
): Promise<void> {
  const outputFormat = options.output ?? "text";
  const useUuid = options.uuid ?? false;
  const force = options.force ?? false;

  try {
    const globalOpts = program.opts();
    const config = await loadConfigWithOverrides({ ...globalOpts, ...options });
    const context = await createExecutionContext(config, Library.load);

    const refToRemove = await context.library.find(identifier, { idType: useUuid ? "uuid" : "id" });
    if (!refToRemove) {
      outputRemoveNotFoundAndExit(identifier, outputFormat);
    }

    const fulltextTypes = getFulltextAttachmentTypes(refToRemove);
    const hasFulltext = fulltextTypes.length > 0;

    // Non-TTY with fulltext requires --force
    const requiresForce = hasFulltext && !isTTY() && !force;
    if (requiresForce) {
      process.stderr.write(`Error: ${formatFulltextWarning(fulltextTypes)}\n`);
      process.exit(1);
    }

    const confirmed = await confirmRemoveIfNeeded(refToRemove, hasFulltext, force);
    if (!confirmed) {
      process.stderr.write("Cancelled.\n");
      process.exit(2);
    }

    const removeOptions: RemoveCommandOptions = {
      identifier,
      idType: useUuid ? "uuid" : "id",
      fulltextDirectory: config.fulltext.directory,
      deleteFulltext: force && hasFulltext,
    };

    const result = await executeRemove(removeOptions, context);
    outputRemoveResult(result, identifier, outputFormat, options.full ?? false);
    process.exit(result.removed ? 0 : 1);
  } catch (error) {
    handleRemoveError(error, identifier, outputFormat);
  }
}

function registerRemoveCommand(program: Command): void {
  program
    .command("remove")
    .description("Remove a reference from the library")
    .argument("<identifier>", "Citation key or UUID")
    .option("--uuid", "Interpret identifier as UUID")
    .option("-f, --force", "Skip confirmation prompt")
    .option("-o, --output <format>", "Output format: json|text", "text")
    .option("--full", "Include full CSL-JSON data in JSON output")
    .action(async (identifier: string, options) => {
      await handleRemoveAction(identifier, options, program);
    });
}

function handleUpdateError(error: unknown): never {
  const message = error instanceof Error ? error.message : String(error);
  if (message.includes("Parse error")) {
    process.stderr.write(`Error: ${message}\n`);
    process.exit(3);
  }
  if (message.includes("not found") || message.includes("validation")) {
    process.stderr.write(`Error: ${message}\n`);
    process.exit(1);
  }
  process.stderr.write(`Error: ${message}\n`);
  process.exit(4);
}

interface UpdateActionOptions {
  uuid?: boolean;
  set?: string[];
  output?: "json" | "text";
  full?: boolean;
}

function parseUpdateInput(
  setOptions: string[] | undefined,
  file: string | undefined
): Promise<Partial<CslItem>> | Partial<CslItem> {
  if (setOptions && setOptions.length > 0 && file) {
    throw new Error("Cannot use --set with a file argument. Use one or the other.");
  }

  if (setOptions && setOptions.length > 0) {
    const operations = setOptions.map((s) => parseSetOption(s));
    return applySetOperations(operations) as Partial<CslItem>;
  }

  return readJsonInput(file).then((inputStr) => {
    const updates = parseJsonInput(inputStr);
    const updatesSchema = z.record(z.string(), z.unknown());
    return updatesSchema.parse(updates) as Partial<CslItem>;
  });
}

function outputUpdateResult(
  result: Awaited<ReturnType<typeof executeUpdate>>,
  identifier: string,
  outputFormat: "json" | "text",
  full: boolean,
  beforeItem: CslItem | undefined
): void {
  if (outputFormat === "json") {
    const jsonOptions = {
      full,
      ...(beforeItem && { before: beforeItem }),
    };
    const jsonOutput = formatUpdateJsonOutput(result, identifier, jsonOptions);
    process.stdout.write(`${JSON.stringify(jsonOutput)}\n`);
  } else {
    const output = formatUpdateOutput(result, identifier);
    process.stderr.write(`${output}\n`);
  }
}

function handleUpdateErrorWithFormat(
  error: unknown,
  identifier: string,
  outputFormat: "json" | "text"
): never {
  const message = error instanceof Error ? error.message : String(error);
  if (outputFormat === "json") {
    process.stdout.write(`${JSON.stringify({ success: false, id: identifier, error: message })}\n`);
    process.exit(message.includes("not found") || message.includes("validation") ? 1 : 4);
  }
  handleUpdateError(error);
}

async function handleUpdateAction(
  identifier: string,
  file: string | undefined,
  options: UpdateActionOptions,
  program: Command
): Promise<void> {
  const outputFormat = options.output ?? "text";

  try {
    const globalOpts = program.opts();
    const config = await loadConfigWithOverrides({ ...globalOpts, ...options });

    const validatedUpdates = await parseUpdateInput(options.set, file);

    const context = await createExecutionContext(config, Library.load);

    const idType = options.uuid ? "uuid" : "id";
    const beforeItem = options.full
      ? await context.library.find(identifier, { idType })
      : undefined;

    const updateOptions: UpdateCommandOptions = {
      identifier,
      updates: validatedUpdates,
      ...(options.uuid && { idType: "uuid" }),
    };

    const result = await executeUpdate(updateOptions, context);
    outputUpdateResult(result, identifier, outputFormat, options.full ?? false, beforeItem);
    process.exit(result.updated ? 0 : 1);
  } catch (error) {
    handleUpdateErrorWithFormat(error, identifier, outputFormat);
  }
}

/**
 * Collect multiple --set options into an array.
 */
function collectSetOption(value: string, previous: string[]): string[] {
  return previous.concat([value]);
}

function registerUpdateCommand(program: Command): void {
  program
    .command("update")
    .description("Update fields of an existing reference")
    .argument("<identifier>", "Citation key or UUID")
    .argument("[file]", "JSON file with updates (or use stdin)")
    .option("--uuid", "Interpret identifier as UUID")
    .option("--set <field=value>", "Set field value (repeatable)", collectSetOption, [])
    .option("-o, --output <format>", "Output format: json|text", "text")
    .option("--full", "Include full CSL-JSON data in JSON output")
    .action(async (identifier: string, file: string | undefined, options) => {
      await handleUpdateAction(identifier, file, options, program);
    });
}

/**
 * Handle 'cite' command action
 */
async function handleCiteAction(
  identifiers: string[],
  options: Omit<CiteCommandOptions, "identifiers">,
  program: Command
): Promise<void> {
  try {
    const globalOpts = program.opts();
    const config = await loadConfigWithOverrides({ ...globalOpts, ...options });

    const context = await createExecutionContext(config, Library.load);
    const result = await executeCite({ ...options, identifiers }, context);

    // Output successful citations
    const output = formatCiteOutput(result);
    if (output) {
      process.stdout.write(`${output}\n`);
    }

    // Output errors
    const errors = formatCiteErrors(result);
    if (errors) {
      process.stderr.write(`${errors}\n`);
    }

    process.exit(getCiteExitCode(result));
  } catch (error) {
    process.stderr.write(`Error: ${error instanceof Error ? error.message : String(error)}\n`);
    process.exit(4);
  }
}

/**
 * Register 'cite' command
 */
function registerCiteCommand(program: Command): void {
  program
    .command("cite")
    .description("Generate formatted citations for references")
    .argument("<id-or-uuid...>", "Citation keys or UUIDs to cite")
    .option("--uuid", "Treat arguments as UUIDs instead of IDs")
    .option("--style <style>", "CSL style name")
    .option("--csl-file <path>", "Path to custom CSL file")
    .option("--locale <locale>", "Locale code (e.g., en-US, ja-JP)")
    .option("--format <format>", "Output format: text|html|rtf")
    .option("--in-text", "Generate in-text citations instead of bibliography entries")
    .action(async (identifiers: string[], options) => {
      await handleCiteAction(identifiers, options, program);
    });
}

/**
 * Register 'server' command
 */
function registerServerCommand(program: Command): void {
  const serverCmd = program.command("server").description("Manage HTTP server for library access");

  serverCmd
    .command("start")
    .description("Start HTTP server")
    .option("--port <port>", "Specify port number")
    .option("-d, --daemon", "Run in background")
    .action(async (options) => {
      try {
        const globalOpts = program.opts();
        const config = await loadConfigWithOverrides({ ...globalOpts, ...options });

        const portfilePath = getPortfilePath();

        const startOptions = {
          library: config.library,
          portfilePath,
          daemon: options.daemon,
          config,
          ...(options.port && { port: Number.parseInt(options.port, 10) }),
        };

        await serverStart(startOptions);

        // Only exit if daemon mode (foreground keeps running)
        if (options.daemon) {
          process.exit(0);
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        if (message.includes("already running") || message.includes("conflict")) {
          process.stderr.write(`Error: ${message}\n`);
          process.exit(1);
        }
        process.stderr.write(`Error: ${message}\n`);
        process.exit(4);
      }
    });

  serverCmd
    .command("stop")
    .description("Stop running server")
    .action(async () => {
      try {
        const portfilePath = getPortfilePath();
        await serverStop(portfilePath);

        process.stderr.write("Server stopped.\n");
        process.exit(0);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        if (message.includes("not running")) {
          process.stderr.write(`Error: ${message}\n`);
          process.exit(1);
        }
        process.stderr.write(`Error: ${message}\n`);
        process.exit(4);
      }
    });

  serverCmd
    .command("status")
    .description("Check server status")
    .action(async () => {
      try {
        const portfilePath = getPortfilePath();
        const status = await serverStatus(portfilePath);

        if (status) {
          process.stdout.write(
            `Server is running\nPort: ${status.port}\nPID: ${status.pid}\nLibrary: ${status.library}\n`
          );
          process.exit(0);
        } else {
          process.stdout.write("Server not running\n");
          process.exit(1);
        }
      } catch (error) {
        process.stderr.write(`Error: ${error instanceof Error ? error.message : String(error)}\n`);
        process.exit(4);
      }
    });
}

/**
 * Register 'mcp' command - MCP stdio server
 */
function registerMcpCommand(program: Command): void {
  program
    .command("mcp")
    .description("Start MCP stdio server for AI agent integration")
    .action(async () => {
      try {
        const globalOpts = program.opts();

        const mcpOptions: Parameters<typeof mcpStart>[0] = {
          // Treat empty string as undefined to use default config path
          configPath: globalOpts.config || undefined,
        };
        if (globalOpts.library !== undefined) {
          mcpOptions.libraryPath = globalOpts.library;
        }
        const result = await mcpStart(mcpOptions);

        // MCP server runs until stdin closes or signal received
        // The server keeps running and handles requests via stdio
        // Wait for server to close (happens on stdin close or dispose)
        await new Promise<void>((resolve) => {
          process.stdin.on("close", async () => {
            await result.dispose();
            resolve();
          });

          process.stdin.on("end", async () => {
            await result.dispose();
            resolve();
          });
        });
      } catch (error) {
        process.stderr.write(`Error: ${error instanceof Error ? error.message : String(error)}\n`);
        process.exit(1);
      }
    });
}

/**
 * Check if an option value is a valid file path (not a boolean flag)
 */
function isValidFilePath(value: string | boolean | undefined): value is string {
  return typeof value === "string" && value !== "" && value !== "true";
}

/**
 * Parse fulltext attach options to determine file type and path
 */
function parseFulltextAttachTypeAndPath(
  filePathArg: string | undefined,
  options: { pdf?: string | boolean; markdown?: string | boolean }
): { type: "pdf" | "markdown" | undefined; filePath: string | undefined } {
  if (options.pdf) {
    return { type: "pdf", filePath: isValidFilePath(options.pdf) ? options.pdf : filePathArg };
  }
  if (options.markdown) {
    return {
      type: "markdown",
      filePath: isValidFilePath(options.markdown) ? options.markdown : filePathArg,
    };
  }
  return { type: undefined, filePath: filePathArg };
}

/**
 * Handle 'fulltext attach' command action
 */
async function handleFulltextAttachAction(
  identifier: string,
  filePathArg: string | undefined,
  options: {
    pdf?: string;
    markdown?: string;
    move?: boolean;
    force?: boolean;
    uuid?: boolean;
  },
  program: Command
): Promise<void> {
  try {
    const globalOpts = program.opts();
    const config = await loadConfigWithOverrides({ ...globalOpts, ...options });
    const context = await createExecutionContext(config, Library.load);

    const { type, filePath } = parseFulltextAttachTypeAndPath(filePathArg, options);

    // If no file path and type is specified, read from stdin
    const stdinContent = !filePath && type ? await readStdinBuffer() : undefined;

    const attachOptions: FulltextAttachOptions = {
      identifier,
      fulltextDirectory: config.fulltext.directory,
      ...(filePath && { filePath }),
      ...(type && { type }),
      ...(options.move && { move: options.move }),
      ...(options.force && { force: options.force }),
      ...(options.uuid && { idType: "uuid" as const }),
      ...(stdinContent && { stdinContent }),
    };

    const result = await executeFulltextAttach(attachOptions, context);
    const output = formatFulltextAttachOutput(result);
    process.stderr.write(`${output}\n`);
    process.exit(getFulltextExitCode(result));
  } catch (error) {
    process.stderr.write(`Error: ${error instanceof Error ? error.message : String(error)}\n`);
    process.exit(4);
  }
}

/**
 * Handle 'fulltext get' command action
 */
async function handleFulltextGetAction(
  identifier: string,
  options: {
    pdf?: boolean;
    markdown?: boolean;
    stdout?: boolean;
    uuid?: boolean;
  },
  program: Command
): Promise<void> {
  try {
    const globalOpts = program.opts();
    const config = await loadConfigWithOverrides({ ...globalOpts, ...options });

    const context = await createExecutionContext(config, Library.load);

    const getOptions: FulltextGetOptions = {
      identifier,
      fulltextDirectory: config.fulltext.directory,
      ...(options.pdf && { type: "pdf" as const }),
      ...(options.markdown && { type: "markdown" as const }),
      ...(options.stdout && { stdout: options.stdout }),
      ...(options.uuid && { idType: "uuid" as const }),
    };

    const result = await executeFulltextGet(getOptions, context);

    if (result.success && result.content && options.stdout) {
      // Write raw content to stdout
      process.stdout.write(result.content);
    } else {
      const output = formatFulltextGetOutput(result);
      if (result.success) {
        process.stdout.write(`${output}\n`);
      } else {
        process.stderr.write(`${output}\n`);
      }
    }

    process.exit(getFulltextExitCode(result));
  } catch (error) {
    process.stderr.write(`Error: ${error instanceof Error ? error.message : String(error)}\n`);
    process.exit(4);
  }
}

/**
 * Handle 'fulltext detach' command action
 */
async function handleFulltextDetachAction(
  identifier: string,
  options: {
    pdf?: boolean;
    markdown?: boolean;
    delete?: boolean;
    force?: boolean;
    uuid?: boolean;
  },
  program: Command
): Promise<void> {
  try {
    const globalOpts = program.opts();
    const config = await loadConfigWithOverrides({ ...globalOpts, ...options });

    const context = await createExecutionContext(config, Library.load);

    const detachOptions: FulltextDetachOptions = {
      identifier,
      fulltextDirectory: config.fulltext.directory,
      ...(options.pdf && { type: "pdf" as const }),
      ...(options.markdown && { type: "markdown" as const }),
      ...(options.delete && { delete: options.delete }),
      ...(options.force && { force: options.force }),
      ...(options.uuid && { idType: "uuid" as const }),
    };

    const result = await executeFulltextDetach(detachOptions, context);
    const output = formatFulltextDetachOutput(result);
    process.stderr.write(`${output}\n`);

    process.exit(getFulltextExitCode(result));
  } catch (error) {
    process.stderr.write(`Error: ${error instanceof Error ? error.message : String(error)}\n`);
    process.exit(4);
  }
}

/**
 * Handle 'fulltext open' command action
 */
async function handleFulltextOpenAction(
  identifierArg: string | undefined,
  options: {
    pdf?: boolean;
    markdown?: boolean;
    uuid?: boolean;
  },
  program: Command
): Promise<void> {
  try {
    const config = await loadConfigWithOverrides(program.opts());

    // Resolve identifier: from argument or stdin (non-tty only)
    let identifier: string;
    if (identifierArg) {
      identifier = identifierArg;
    } else {
      if (isTTY()) {
        process.stderr.write("Error: Identifier is required when running interactively.\n");
        process.exit(1);
      }
      const stdinId = (await readStdinContent()).split("\n")[0]?.trim() ?? "";
      if (!stdinId) {
        process.stderr.write("Error: No identifier provided from stdin.\n");
        process.exit(1);
      }
      identifier = stdinId;
    }

    const context = await createExecutionContext(config, Library.load);

    const openOptions: FulltextOpenOptions = {
      identifier,
      fulltextDirectory: config.fulltext.directory,
      ...(options.pdf && { type: "pdf" as const }),
      ...(options.markdown && { type: "markdown" as const }),
      ...(options.uuid && { idType: "uuid" as const }),
    };

    const result = await executeFulltextOpen(openOptions, context);
    const output = formatFulltextOpenOutput(result);
    if (result.success) {
      process.stderr.write(`${output}\n`);
    } else {
      process.stderr.write(`${output}\n`);
    }
    process.exit(getFulltextExitCode(result));
  } catch (error) {
    process.stderr.write(`Error: ${error instanceof Error ? error.message : String(error)}\n`);
    process.exit(4);
  }
}

/**
 * Register 'fulltext' command with subcommands
 */
function registerFulltextCommand(program: Command): void {
  const fulltextCmd = program
    .command("fulltext")
    .description("Manage full-text files attached to references");

  fulltextCmd
    .command("attach")
    .description("Attach a full-text file to a reference")
    .argument("<identifier>", "Citation key or UUID")
    .argument("[file-path]", "Path to the file to attach")
    .option("--pdf [path]", "Attach as PDF (path optional if provided as argument)")
    .option("--markdown [path]", "Attach as Markdown (path optional if provided as argument)")
    .option("--move", "Move file instead of copy")
    .option("-f, --force", "Overwrite existing attachment")
    .option("--uuid", "Interpret identifier as UUID")
    .action(async (identifier: string, filePath: string | undefined, options) => {
      await handleFulltextAttachAction(identifier, filePath, options, program);
    });

  fulltextCmd
    .command("get")
    .description("Get full-text file path or content")
    .argument("<identifier>", "Citation key or UUID")
    .option("--pdf", "Get PDF file only")
    .option("--markdown", "Get Markdown file only")
    .option("--stdout", "Output file content to stdout")
    .option("--uuid", "Interpret identifier as UUID")
    .action(async (identifier: string, options) => {
      await handleFulltextGetAction(identifier, options, program);
    });

  fulltextCmd
    .command("detach")
    .description("Detach full-text file from a reference")
    .argument("<identifier>", "Citation key or UUID")
    .option("--pdf", "Detach PDF only")
    .option("--markdown", "Detach Markdown only")
    .option("--delete", "Also delete the file from disk")
    .option("-f, --force", "Skip confirmation for delete")
    .option("--uuid", "Interpret identifier as UUID")
    .action(async (identifier: string, options) => {
      await handleFulltextDetachAction(identifier, options, program);
    });

  fulltextCmd
    .command("open")
    .description("Open full-text file with system default application")
    .argument("[identifier]", "Citation key or UUID (reads from stdin if not provided)")
    .option("--pdf", "Open PDF file")
    .option("--markdown", "Open Markdown file")
    .option("--uuid", "Interpret identifier as UUID")
    .action(async (identifier: string | undefined, options) => {
      await handleFulltextOpenAction(identifier, options, program);
    });
}

/**
 * Main CLI entry point
 */
export async function main(argv: string[]): Promise<void> {
  const program = createProgram();

  // Handle shell completion if COMP_LINE is set
  if (process.env.COMP_LINE) {
    await handleCompletion(program);
    return;
  }

  // Setup signal handlers
  process.on("SIGINT", () => {
    process.exit(130);
  });

  process.on("SIGTERM", () => {
    process.exit(0);
  });

  await program.parseAsync(argv);
}
