/**
 * CLI Entry Point
 */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { Command } from "commander";

// Read package.json for version and description
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const packageJson = JSON.parse(readFileSync(join(__dirname, "../../package.json"), "utf-8"));

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
  registerServerCommand(program);

  return program;
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
    .action(async () => {
      // TODO: Implement action handler
      console.log("list command not yet implemented");
    });
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
    .action(async () => {
      // TODO: Implement action handler
      console.log("search command not yet implemented");
    });
}

/**
 * Register 'add' command
 */
function registerAddCommand(program: Command): void {
  program
    .command("add")
    .description("Add new reference(s) to the library")
    .argument("[file]", "JSON file to add (or use stdin)")
    .option("-f, --force", "Skip duplicate detection")
    .action(async () => {
      // TODO: Implement action handler
      console.log("add command not yet implemented");
    });
}

/**
 * Register 'remove' command
 */
function registerRemoveCommand(program: Command): void {
  program
    .command("remove")
    .description("Remove a reference from the library")
    .argument("<identifier>", "Citation key or UUID")
    .option("--uuid", "Interpret identifier as UUID")
    .option("-f, --force", "Skip confirmation prompt")
    .action(async () => {
      // TODO: Implement action handler
      console.log("remove command not yet implemented");
    });
}

/**
 * Register 'update' command
 */
function registerUpdateCommand(program: Command): void {
  program
    .command("update")
    .description("Update fields of an existing reference")
    .argument("<identifier>", "Citation key or UUID")
    .argument("[file]", "JSON file with updates (or use stdin)")
    .option("--uuid", "Interpret identifier as UUID")
    .action(async () => {
      // TODO: Implement action handler
      console.log("update command not yet implemented");
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
    .action(async () => {
      // TODO: Implement action handler
      console.log("server start command not yet implemented");
    });

  serverCmd
    .command("stop")
    .description("Stop running server")
    .action(async () => {
      // TODO: Implement action handler
      console.log("server stop command not yet implemented");
    });

  serverCmd
    .command("status")
    .description("Check server status")
    .action(async () => {
      // TODO: Implement action handler
      console.log("server status command not yet implemented");
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
