/**
 * CLI Entry Point
 */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { Command } from "commander";
import type { CslItem } from "../core/csl-json/types.js";
import { Library } from "../core/library.js";
import { getPortfilePath } from "../server/portfile.js";
import { add as addCommand } from "./commands/add.js";
import { list } from "./commands/list.js";
import { search as searchCommand } from "./commands/search.js";
import { serverStart, serverStatus, serverStop } from "./commands/server.js";
import { update as updateCommand } from "./commands/update.js";
import {
  isTTY,
  loadConfigWithOverrides,
  parseJsonInput,
  readConfirmation,
  readJsonInput,
} from "./helpers.js";
import { ServerClient } from "./server-client.js";
import { getServerConnection } from "./server-detection.js";

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
    .action(async (options) => {
      try {
        const globalOpts = program.opts();
        const config = await loadConfigWithOverrides({ ...globalOpts, ...options });

        // Get items (server or direct)
        const server = await getServerConnection(config.library, config);
        let items: CslItem[];

        if (server) {
          // Use server API
          const client = new ServerClient(server.baseUrl);
          items = await client.getAll();
        } else {
          // Direct file access
          const library = await Library.load(config.library);
          items = library.getAll().map((ref) => ref.getItem());
        }

        // Execute list command
        await list(items, {
          json: options.json,
          idsOnly: options.idsOnly,
          uuid: options.uuid,
          bibtex: options.bibtex,
        });

        process.exit(0);
      } catch (error) {
        process.stderr.write(`Error: ${error instanceof Error ? error.message : String(error)}\n`);
        process.exit(4);
      }
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
    .action(async (query: string, options) => {
      try {
        const globalOpts = program.opts();
        const config = await loadConfigWithOverrides({ ...globalOpts, ...options });

        // Get items (server or direct)
        const server = await getServerConnection(config.library, config);
        let items: CslItem[];

        if (server) {
          // Use server API
          const client = new ServerClient(server.baseUrl);
          items = await client.getAll();
        } else {
          // Direct file access
          const library = await Library.load(config.library);
          items = library.getAll().map((ref) => ref.getItem());
        }

        // Execute search command (handles search and output)
        await searchCommand(items, query, {
          json: options.json,
          idsOnly: options.idsOnly,
          uuid: options.uuid,
          bibtex: options.bibtex,
        });

        process.exit(0);
      } catch (error) {
        process.stderr.write(`Error: ${error instanceof Error ? error.message : String(error)}\n`);
        process.exit(4);
      }
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
    .action(async (file: string | undefined, options) => {
      try {
        const globalOpts = program.opts();
        const config = await loadConfigWithOverrides({ ...globalOpts, ...options });

        // Read and parse input
        const inputStr = await readJsonInput(file);
        const input = parseJsonInput(inputStr);

        // Validate input type
        const items: CslItem[] = Array.isArray(input) ? input : [input as CslItem];

        // Get library (server or direct)
        const server = await getServerConnection(config.library, config);

        if (server) {
          // Use server API
          const client = new ServerClient(server.baseUrl);

          for (const item of items) {
            try {
              await client.add(item);
              process.stderr.write(`Added reference: [${item.id}]\n`);
            } catch (error) {
              if (!options.force && error instanceof Error && error.message.includes("Duplicate")) {
                process.stderr.write(`Error: ${error.message}\n`);
                process.exit(1);
              }
              throw error;
            }
          }
        } else {
          // Direct file access
          const library = await Library.load(config.library);
          const existingItems = library.getAll().map((ref) => ref.getItem());

          // Process each item
          for (const item of items) {
            const result = await addCommand(existingItems, item, { force: options.force });

            if (result.added) {
              library.add(result.item);
              process.stderr.write(`Added reference: [${result.item.id}]\n`);
              // Update existing items for next iteration
              existingItems.push(result.item);
            } else if (result.duplicate) {
              throw new Error(
                `Duplicate detected: ${result.duplicate.type} match with existing reference [${result.duplicate.existing.id}]`
              );
            }
          }

          await library.save();
        }

        process.exit(0);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        if (message.includes("Parse error")) {
          process.stderr.write(`Error: ${message}\n`);
          process.exit(3);
        }
        if (message.includes("Duplicate")) {
          process.stderr.write(`Error: ${message}\n`);
          process.exit(1);
        }
        process.stderr.write(`Error: ${message}\n`);
        process.exit(4);
      }
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
    .action(async (identifier: string, options) => {
      try {
        const globalOpts = program.opts();
        const config = await loadConfigWithOverrides({ ...globalOpts, ...options });

        // Get library (server or direct)
        const server = await getServerConnection(config.library, config);

        // Find reference for confirmation prompt
        let refToRemove: CslItem | undefined;
        if (server) {
          const client = new ServerClient(server.baseUrl);
          const items = await client.getAll();
          refToRemove = options.uuid
            ? items.find((item) => item.custom?.uuid === identifier)
            : items.find((item) => item.id === identifier);
        } else {
          const library = await Library.load(config.library);
          const ref = options.uuid ? library.findByUuid(identifier) : library.findById(identifier);
          refToRemove = ref?.getItem();
        }

        if (!refToRemove) {
          process.stderr.write(`Error: Reference not found: ${identifier}\n`);
          process.exit(1);
        }

        // Confirmation prompt
        if (!options.force && isTTY()) {
          const authors = Array.isArray(refToRemove.author)
            ? refToRemove.author.map((a) => `${a.family || ""}, ${a.given?.[0] || ""}.`).join("; ")
            : "(no authors)";
          const confirmMsg = `Remove reference [${refToRemove.id}]?\nTitle: ${refToRemove.title || "(no title)"}\nAuthors: ${authors}\nContinue?`;
          const confirmed = await readConfirmation(confirmMsg);

          if (!confirmed) {
            process.stderr.write("Cancelled.\n");
            process.exit(2);
          }
        }

        // Remove reference
        if (server) {
          const client = new ServerClient(server.baseUrl);
          if (!refToRemove.custom?.uuid) {
            throw new Error("Reference missing UUID");
          }
          await client.remove(refToRemove.custom.uuid);
        } else {
          const library = await Library.load(config.library);

          // Remove using Library methods
          const removed = options.uuid
            ? library.removeByUuid(identifier)
            : library.removeById(identifier);

          if (!removed) {
            throw new Error("Reference not found");
          }

          await library.save();
        }

        process.stderr.write(`Removed reference: [${refToRemove.id}]\n`);
        process.exit(0);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        if (message.includes("not found")) {
          process.stderr.write(`Error: ${message}\n`);
          process.exit(1);
        }
        process.stderr.write(`Error: ${message}\n`);
        process.exit(4);
      }
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
    .action(async (identifier: string, file: string | undefined, options) => {
      try {
        const globalOpts = program.opts();
        const config = await loadConfigWithOverrides({ ...globalOpts, ...options });

        // Read and parse input
        const inputStr = await readJsonInput(file);
        const updates = parseJsonInput(inputStr);

        if (typeof updates !== "object" || Array.isArray(updates) || updates === null) {
          throw new Error("Parse error: Updates must be a JSON object");
        }

        // Get library (server or direct)
        const server = await getServerConnection(config.library, config);

        if (server) {
          // Use server API
          const client = new ServerClient(server.baseUrl);
          const items = await client.getAll();
          const refToUpdate = options.uuid
            ? items.find((item) => item.custom?.uuid === identifier)
            : items.find((item) => item.id === identifier);

          if (!refToUpdate || !refToUpdate.custom?.uuid) {
            process.stderr.write(`Error: Reference not found: ${identifier}\n`);
            process.exit(1);
          }

          // Merge updates with existing item
          const updatedItem = { ...refToUpdate, ...updates } as CslItem;
          await client.update(refToUpdate.custom.uuid, updatedItem);
        } else {
          // Direct file access
          const library = await Library.load(config.library);
          const items = library.getAll().map((ref) => ref.getItem());

          const result = await updateCommand(items, identifier, updates as Partial<CslItem>, {
            byUuid: options.uuid,
          });

          if (!result.updated || !result.item) {
            throw new Error("Reference not found");
          }

          // Remove old and add updated
          if (result.item.custom?.uuid) {
            library.removeByUuid(result.item.custom.uuid);
            library.add(result.item);
          }

          await library.save();
        }

        process.stderr.write(`Updated reference: [${identifier}]\n`);
        process.exit(0);
      } catch (error) {
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
