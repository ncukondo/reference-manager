/**
 * CLI Entry Point
 */

import { Command } from "commander";
import { z } from "zod";
// Import package.json for version and description
import packageJson from "../../package.json" with { type: "json" };
import type { CslItem } from "../core/csl-json/types.js";
import { Library } from "../core/library.js";
import { getPortfilePath } from "../server/portfile.js";
import { executeAdd, formatAddOutput, getExitCode } from "./commands/add.js";
import {
  type CiteCommandOptions,
  executeCite,
  formatCiteErrors,
  formatCiteOutput,
  getCiteExitCode,
} from "./commands/cite.js";
import { type ListCommandOptions, executeList, formatListOutput } from "./commands/list.js";
import {
  type RemoveCommandOptions,
  deleteFulltextFiles,
  executeRemove,
  formatFulltextWarning,
  formatRemoveOutput,
  getFulltextAttachmentTypes,
} from "./commands/remove.js";
import { type SearchCommandOptions, executeSearch, formatSearchOutput } from "./commands/search.js";
import { serverStart, serverStatus, serverStop } from "./commands/server.js";
import { type UpdateCommandOptions, executeUpdate, formatUpdateOutput } from "./commands/update.js";
import {
  type FulltextAttachOptions,
  type FulltextDetachOptions,
  type FulltextGetOptions,
  executeFulltextAttach,
  executeFulltextDetach,
  executeFulltextGet,
  formatFulltextAttachOutput,
  formatFulltextDetachOutput,
  formatFulltextGetOutput,
  getFulltextExitCode,
} from "./commands/fulltext.js";
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
    const output = formatListOutput(result);

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
    const result = await executeSearch({ ...options, query }, context);
    const output = formatSearchOutput(result);

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
    .argument("<query>", "Search query")
    .option("--json", "Output in JSON format")
    .option("--ids-only", "Output only citation keys")
    .option("--uuid", "Output only UUIDs")
    .option("--bibtex", "Output in BibTeX format")
    .action(async (query: string, options) => {
      await handleSearchAction(query, options, program);
    });
}

/**
 * Register 'add' command
 */
interface AddCommandOptions extends CliOptions {
  force?: boolean;
  format?: string;
  verbose?: boolean;
}

async function handleAddAction(
  inputs: string[],
  options: AddCommandOptions,
  program: Command
): Promise<void> {
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

    // Build add options - avoid undefined values for exactOptionalPropertyTypes
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

    // Execute add command
    const result = await executeAdd(addOptions, context);

    // Format and output result
    const output = formatAddOutput(result, options.verbose ?? false);
    process.stderr.write(`${output}\n`);

    // Exit with appropriate code
    process.exit(getExitCode(result));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    process.stderr.write(`Error: ${message}\n`);
    process.exit(1);
  }
}

function registerAddCommand(program: Command): void {
  program
    .command("add")
    .description("Add new reference(s) to the library")
    .argument("[input...]", "File paths or identifiers (PMID/DOI), or use stdin")
    .option("-f, --force", "Skip duplicate detection")
    .option("--format <format>", "Explicit input format: json|bibtex|ris|pmid|doi|auto", "auto")
    .option("--verbose", "Show detailed error information")
    .action(async (inputs: string[], options: AddCommandOptions) => {
      await handleAddAction(inputs, options, program);
    });
}

/**
 * Register 'remove' command
 */
async function findReferenceToRemove(
  identifier: string,
  byUuid: boolean,
  context: ExecutionContext
): Promise<CslItem | undefined> {
  if (context.type === "server") {
    const item = await context.client.find(identifier, { byUuid });
    return item ?? undefined;
  }

  const ref = byUuid
    ? context.library.findByUuid(identifier)
    : context.library.findById(identifier);
  return ref?.getItem();
}

async function confirmRemoval(
  refToRemove: CslItem,
  force: boolean,
  fulltextWarning?: string
): Promise<boolean> {
  if (force || !isTTY()) {
    return true;
  }

  const authors = Array.isArray(refToRemove.author)
    ? refToRemove.author.map((a) => `${a.family || ""}, ${a.given?.[0] || ""}.`).join("; ")
    : "(no authors)";
  let confirmMsg = `Remove reference [${refToRemove.id}]?\nTitle: ${refToRemove.title || "(no title)"}\nAuthors: ${authors}`;

  if (fulltextWarning) {
    confirmMsg += `\n\n${fulltextWarning}`;
  }

  confirmMsg += "\nContinue?";

  return await readConfirmation(confirmMsg);
}

function handleRemoveError(error: unknown): never {
  const message = error instanceof Error ? error.message : String(error);
  if (message.includes("not found")) {
    process.stderr.write(`Error: ${message}\n`);
    process.exit(1);
  }
  process.stderr.write(`Error: ${message}\n`);
  process.exit(4);
}

/**
 * Format type labels for fulltext files.
 */
function formatTypeLabels(types: ("pdf" | "markdown")[]): string {
  return types.map((t) => (t === "pdf" ? "PDF" : "Markdown")).join(" and ");
}

/**
 * Handle fulltext deletion and output.
 */
async function handleFulltextDeletion(
  item: CslItem,
  fulltextDirectory: string,
  types: ("pdf" | "markdown")[],
  output: string
): Promise<void> {
  await deleteFulltextFiles(item, fulltextDirectory);
  const typeLabels = formatTypeLabels(types);
  process.stderr.write(`${output}\n`);
  process.stderr.write(`Deleted fulltext files: ${typeLabels}\n`);
}

async function handleRemoveAction(
  identifier: string,
  options: { uuid?: boolean; force?: boolean },
  program: Command
): Promise<void> {
  try {
    const globalOpts = program.opts();
    const config = await loadConfigWithOverrides({ ...globalOpts, ...options });
    const context = await createExecutionContext(config, Library.load);

    // Find reference for confirmation display
    const refToRemove = await findReferenceToRemove(identifier, options.uuid ?? false, context);

    if (!refToRemove) {
      process.stderr.write(`Error: Reference not found: ${identifier}\n`);
      process.exit(1);
    }

    // Check for fulltext attachments
    const fulltextTypes = getFulltextAttachmentTypes(refToRemove);
    const hasFulltext = fulltextTypes.length > 0;

    // If fulltext attached and not TTY without --force, require --force
    if (hasFulltext && !isTTY() && !options.force) {
      const warning = formatFulltextWarning(fulltextTypes);
      process.stderr.write(`Error: ${warning}\n`);
      process.exit(1);
    }

    // Interactive confirmation (with fulltext warning if applicable)
    const fulltextWarning =
      hasFulltext && !options.force ? formatFulltextWarning(fulltextTypes) : undefined;
    const confirmed = await confirmRemoval(refToRemove, options.force ?? false, fulltextWarning);
    if (!confirmed) {
      process.stderr.write("Cancelled.\n");
      process.exit(2);
    }

    // Execute removal using unified pattern
    const removeOptions: RemoveCommandOptions = {
      identifier,
    };
    if (options.uuid !== undefined) {
      removeOptions.byUuid = options.uuid;
    }

    const result = await executeRemove(removeOptions, context);
    const output = formatRemoveOutput(result, identifier);

    if (!result.removed) {
      process.stderr.write(`${output}\n`);
      process.exit(1);
    }

    // Delete fulltext files if --force and fulltext was attached
    if (hasFulltext && options.force) {
      await handleFulltextDeletion(refToRemove, config.fulltext.directory, fulltextTypes, output);
    } else {
      process.stderr.write(`${output}\n`);
    }
    process.exit(0);
  } catch (error) {
    handleRemoveError(error);
  }
}

function registerRemoveCommand(program: Command): void {
  program
    .command("remove")
    .description("Remove a reference from the library")
    .argument("<identifier>", "Citation key or UUID")
    .option("--uuid", "Interpret identifier as UUID")
    .option("-f, --force", "Skip confirmation prompt")
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

async function handleUpdateAction(
  identifier: string,
  file: string | undefined,
  options: { uuid?: boolean },
  program: Command
): Promise<void> {
  try {
    const globalOpts = program.opts();
    const config = await loadConfigWithOverrides({ ...globalOpts, ...options });

    const inputStr = await readJsonInput(file);
    const updates = parseJsonInput(inputStr);

    // Validate that updates is a non-null object using zod
    const updatesSchema = z.record(z.string(), z.unknown());
    const validatedUpdates = updatesSchema.parse(updates);

    const context = await createExecutionContext(config, Library.load);

    const updateOptions: UpdateCommandOptions = {
      identifier,
      updates: validatedUpdates as Partial<CslItem>,
    };
    if (options.uuid !== undefined) {
      updateOptions.byUuid = options.uuid;
    }

    const result = await executeUpdate(updateOptions, context);
    const output = formatUpdateOutput(result, identifier);

    if (result.updated) {
      process.stderr.write(`${output}\n`);
      process.exit(0);
    } else {
      process.stderr.write(`${output}\n`);
      process.exit(1);
    }
  } catch (error) {
    handleUpdateError(error);
  }
}

function registerUpdateCommand(program: Command): void {
  program
    .command("update")
    .description("Update fields of an existing reference")
    .argument("<identifier>", "Citation key or UUID")
    .argument("[file]", "JSON file with updates (or use stdin)")
    .option("--uuid", "Interpret identifier as UUID")
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
          ...(options.port && { port: Number.parseInt(options.port, 10) }),
        };

        await serverStart(startOptions);

        process.exit(0);
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

    // Determine file path and type
    let filePath = filePathArg;
    let type: "pdf" | "markdown" | undefined;
    let stdinContent: Buffer | undefined;

    if (options.pdf) {
      type = "pdf";
      if (options.pdf !== "" && typeof options.pdf === "string" && options.pdf !== "true") {
        filePath = options.pdf;
      }
    } else if (options.markdown) {
      type = "markdown";
      if (
        options.markdown !== "" &&
        typeof options.markdown === "string" &&
        options.markdown !== "true"
      ) {
        filePath = options.markdown;
      }
    }

    // If no file path and type is specified, read from stdin
    if (!filePath && type) {
      stdinContent = await readStdinBuffer();
    }

    const attachOptions: FulltextAttachOptions = {
      identifier,
      fulltextDirectory: config.fulltext.directory,
      ...(filePath && { filePath }),
      ...(type && { type }),
      ...(options.move && { move: options.move }),
      ...(options.force && { force: options.force }),
      ...(options.uuid && { byUuid: options.uuid }),
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
      ...(options.uuid && { byUuid: options.uuid }),
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
      ...(options.uuid && { byUuid: options.uuid }),
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
}

/**
 * Main CLI entry point
 */
export async function main(argv: string[]): Promise<void> {
  const program = createProgram();

  // Setup signal handlers
  process.on("SIGINT", () => {
    process.exit(130);
  });

  process.on("SIGTERM", () => {
    process.exit(0);
  });

  await program.parseAsync(argv);
}
