/**
 * CLI Entry Point
 */

import { Command } from "commander";
// Import package.json for version and description
import packageJson from "../../package.json" with { type: "json" };
import type { CslItem } from "../core/csl-json/types.js";
import { Library } from "../core/library.js";
import {
  type FormatAddJsonOptions,
  formatAddJsonOutput,
} from "../features/operations/json-output.js";
import { getPortfilePath } from "../server/portfile.js";
import { executeAdd, formatAddOutput, getExitCode } from "./commands/add.js";
import { handleCiteAction } from "./commands/cite.js";
import { registerConfigCommand } from "./commands/config.js";
import { handleEditAction } from "./commands/edit.js";
import {
  type ExportCommandOptions,
  executeExport,
  formatExportOutput,
  getExportExitCode,
} from "./commands/export.js";
import {
  handleFulltextAttachAction,
  handleFulltextDetachAction,
  handleFulltextGetAction,
  handleFulltextOpenAction,
} from "./commands/fulltext.js";
import { type ListCommandOptions, executeList, formatListOutput } from "./commands/list.js";
import { mcpStart } from "./commands/mcp.js";
import { handleRemoveAction } from "./commands/remove.js";
import {
  type SearchCommandOptions,
  executeInteractiveSearch,
  executeSearch,
  formatSearchOutput,
} from "./commands/search.js";
import { serverStart, serverStatus, serverStop } from "./commands/server.js";
import { collectSetOption, handleUpdateAction } from "./commands/update.js";
import { handleCompletion, registerCompletionCommand } from "./completion.js";
import { type ExecutionContext, createExecutionContext } from "./execution-context.js";
import type { CliOptions } from "./helpers.js";
import { loadConfigWithOverrides, readStdinContent } from "./helpers.js";

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
  registerExportCommand(program);
  registerAddCommand(program);
  registerRemoveCommand(program);
  registerUpdateCommand(program);
  registerEditCommand(program);
  registerCiteCommand(program);
  registerServerCommand(program);
  registerFulltextCommand(program);
  registerMcpCommand(program);
  registerConfigCommand(program);
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
    const output = formatListOutput(result, options);

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
    .option("-o, --output <format>", "Output format: pretty|json|bibtex|ids|uuid")
    .option("--json", "Alias for --output json")
    .option("--bibtex", "Alias for --output bibtex")
    .option("--ids-only", "Alias for --output ids")
    .option("--uuid-only", "Alias for --output uuid")
    .option("--sort <field>", "Sort by field: created|updated|published|author|title")
    .option("--order <order>", "Sort order: asc|desc")
    .option("-n, --limit <n>", "Maximum number of results", Number.parseInt)
    .option("--offset <n>", "Number of results to skip", Number.parseInt)
    .action(async (options) => {
      await handleListAction(options, program);
    });
}

/**
 * Handle 'export' command action
 */
async function handleExportAction(
  ids: string[],
  options: Omit<ExportCommandOptions, "ids">,
  program: Command
): Promise<void> {
  try {
    const globalOpts = program.opts();
    const config = await loadConfigWithOverrides({ ...globalOpts, ...options });

    const context = await createExecutionContext(config, Library.load);
    const result = await executeExport({ ...options, ids }, context);
    const output = formatExportOutput(result, { ...options, ids });

    if (output) {
      process.stdout.write(`${output}\n`);
    }

    // Print not found errors to stderr
    if (result.notFound.length > 0) {
      for (const id of result.notFound) {
        process.stderr.write(`Error: Reference not found: ${id}\n`);
      }
    }

    process.exit(getExportExitCode(result));
  } catch (error) {
    process.stderr.write(`Error: ${error instanceof Error ? error.message : String(error)}\n`);
    process.exit(4);
  }
}

/**
 * Register 'export' command
 */
function registerExportCommand(program: Command): void {
  program
    .command("export [ids...]")
    .description("Export raw CSL-JSON for external tool integration")
    .option("--uuid", "Interpret identifiers as UUIDs")
    .option("--all", "Export all references")
    .option("--search <query>", "Export references matching search query")
    .option("-o, --output <format>", "Output format: json (default), yaml, bibtex")
    .action(async (ids, options) => {
      await handleExportAction(ids, options, program);
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

    // Handle TUI mode
    if (options.tui) {
      const result = await executeInteractiveSearch({ ...options, query }, context, config);
      if (result.output) {
        process.stdout.write(`${result.output}\n`);
      }
      process.exit(result.cancelled ? 0 : 0);
    }

    // Regular search mode
    const result = await executeSearch({ ...options, query }, context);
    const output = formatSearchOutput(result, { ...options, query });

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
    .argument("[query]", "Search query (required unless using --tui)")
    .option("-t, --tui", "Enable TUI (interactive) search mode")
    .option("-o, --output <format>", "Output format: pretty|json|bibtex|ids|uuid")
    .option("--json", "Alias for --output json")
    .option("--bibtex", "Alias for --output bibtex")
    .option("--ids-only", "Alias for --output ids")
    .option("--uuid-only", "Alias for --output uuid")
    .option("--sort <field>", "Sort by field: created|updated|published|author|title|relevance")
    .option("--order <order>", "Sort order: asc|desc")
    .option("-n, --limit <n>", "Maximum number of results", Number.parseInt)
    .option("--offset <n>", "Number of results to skip", Number.parseInt)
    .action(async (query: string | undefined, options) => {
      // Validate: query is required unless TUI mode
      if (!options.tui && !query) {
        process.stderr.write("Error: Search query is required unless using --tui\n");
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
  input?: string;
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
  if (options.input !== undefined) {
    addOptions.format = options.input;
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

  const options: FormatAddJsonOptions = { full, items };
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
    .option("-i, --input <format>", "Input format: json|bibtex|ris|pmid|doi|isbn|auto", "auto")
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
function registerRemoveCommand(program: Command): void {
  program
    .command("remove")
    .description("Remove a reference from the library")
    .argument("[identifier]", "Citation key or UUID (interactive selection if omitted)")
    .option("--uuid", "Interpret identifier as UUID")
    .option("-f, --force", "Skip confirmation prompt")
    .option("-o, --output <format>", "Output format: json|text", "text")
    .option("--full", "Include full CSL-JSON data in JSON output")
    .action(async (identifier: string | undefined, options) => {
      await handleRemoveAction(identifier, options, program.opts());
    });
}

function registerUpdateCommand(program: Command): void {
  program
    .command("update")
    .description("Update fields of an existing reference")
    .argument("[identifier]", "Citation key or UUID (interactive selection if omitted)")
    .argument("[file]", "JSON file with updates (or use stdin)")
    .option("--uuid", "Interpret identifier as UUID")
    .option("--set <field=value>", "Set field value (repeatable)", collectSetOption, [])
    .option("-o, --output <format>", "Output format: json|text", "text")
    .option("--full", "Include full CSL-JSON data in JSON output")
    .action(async (identifier: string | undefined, file: string | undefined, options) => {
      await handleUpdateAction(identifier, file, options, program.opts());
    });
}

/**
 * Register 'edit' command
 */
function registerEditCommand(program: Command): void {
  program
    .command("edit")
    .description("Edit references interactively using an external editor")
    .argument(
      "[identifier...]",
      "Citation keys or UUIDs to edit (interactive selection if omitted)"
    )
    .option("--uuid", "Interpret identifiers as UUIDs")
    .option("--format <format>", "Edit format: yaml (default), json")
    .option("--editor <editor>", "Editor command (overrides $VISUAL/$EDITOR)")
    .action(async (identifiers: string[], options) => {
      await handleEditAction(identifiers, options, program.opts());
    });
}

/**
 * Handle 'cite' command action
 */
function registerCiteCommand(program: Command): void {
  program
    .command("cite")
    .description("Generate formatted citations for references")
    .argument(
      "[id-or-uuid...]",
      "Citation keys or UUIDs to cite (interactive selection if omitted)"
    )
    .option("--uuid", "Treat arguments as UUIDs instead of IDs")
    .option("--style <style>", "CSL style name")
    .option("--csl-file <path>", "Path to custom CSL file")
    .option("--locale <locale>", "Locale code (e.g., en-US, ja-JP)")
    .option("-o, --output <format>", "Output format: text|html|rtf")
    .option("--in-text", "Generate in-text citations instead of bibliography entries")
    .action(async (identifiers: string[], options) => {
      await handleCiteAction(identifiers, options, program.opts());
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
 * Register 'fulltext' command with subcommands
 */
function registerFulltextCommand(program: Command): void {
  const fulltextCmd = program
    .command("fulltext")
    .description("Manage full-text files attached to references");

  fulltextCmd
    .command("attach")
    .description("Attach a full-text file to a reference")
    .argument("[identifier]", "Citation key or UUID (interactive selection if omitted)")
    .argument("[file-path]", "Path to the file to attach")
    .option("--pdf [path]", "Attach as PDF (path optional if provided as argument)")
    .option("--markdown [path]", "Attach as Markdown (path optional if provided as argument)")
    .option("--move", "Move file instead of copy")
    .option("-f, --force", "Overwrite existing attachment")
    .option("--uuid", "Interpret identifier as UUID")
    .action(async (identifier: string | undefined, filePath: string | undefined, options) => {
      await handleFulltextAttachAction(identifier, filePath, options, program.opts());
    });

  fulltextCmd
    .command("get")
    .description("Get full-text file path or content")
    .argument("[identifier]", "Citation key or UUID (interactive selection if omitted)")
    .option("--pdf", "Get PDF file only")
    .option("--markdown", "Get Markdown file only")
    .option("--stdout", "Output file content to stdout")
    .option("--uuid", "Interpret identifier as UUID")
    .action(async (identifier: string | undefined, options) => {
      await handleFulltextGetAction(identifier, options, program.opts());
    });

  fulltextCmd
    .command("detach")
    .description("Detach full-text file from a reference")
    .argument("[identifier]", "Citation key or UUID (interactive selection if omitted)")
    .option("--pdf", "Detach PDF only")
    .option("--markdown", "Detach Markdown only")
    .option("--delete", "Also delete the file from disk")
    .option("-f, --force", "Skip confirmation for delete")
    .option("--uuid", "Interpret identifier as UUID")
    .action(async (identifier: string | undefined, options) => {
      await handleFulltextDetachAction(identifier, options, program.opts());
    });

  fulltextCmd
    .command("open")
    .description("Open full-text file with system default application")
    .argument("[identifier]", "Citation key or UUID (interactive selection if omitted)")
    .option("--pdf", "Open PDF file")
    .option("--markdown", "Open Markdown file")
    .option("--uuid", "Interpret identifier as UUID")
    .action(async (identifier: string | undefined, options) => {
      await handleFulltextOpenAction(identifier, options, program.opts());
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
