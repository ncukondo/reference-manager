/**
 * Shell completion support using tabtab
 *
 * Provides intelligent auto-completion for Bash, Zsh, and Fish shells.
 * Completion candidates are dynamically extracted from Commander program
 * and existing type definitions to avoid duplication.
 */

import type { Command, Option } from "commander";
import type { CompletionItem, TabtabEnv } from "tabtab";
import { BUILTIN_STYLES } from "../config/csl-styles.js";
import { searchSortFieldSchema, sortOrderSchema } from "../features/pagination/types.js";

// Extract option values from existing schemas
const SEARCH_SORT_FIELDS = searchSortFieldSchema.options;
const SORT_ORDERS = sortOrderSchema.options;

// Output format options (from CitationFormatOptions type)
const CITATION_FORMATS = ["text", "html", "rtf"] as const;

// Log level options (from LogLevel type)
const LOG_LEVELS = ["silent", "info", "debug"] as const;

// Option values for specific options
// These map option flags to their possible values
export const OPTION_VALUES: Record<string, readonly string[]> = {
  "--sort": SEARCH_SORT_FIELDS, // search includes 'relevance'
  "--order": SORT_ORDERS,
  "--format": CITATION_FORMATS,
  "--style": BUILTIN_STYLES,
  "--log-level": LOG_LEVELS,
};

// Commands that support ID completion
const ID_COMPLETION_COMMANDS = new Set(["cite", "remove", "update"]);
const ID_COMPLETION_FULLTEXT_SUBCOMMANDS = new Set(["attach", "get", "detach"]);

/**
 * Convert option values to CompletionItem array
 */
function toCompletionItems(values: readonly string[]): CompletionItem[] {
  return values.map((name) => ({ name }));
}

/**
 * Extract subcommands from Commander program
 */
export function extractSubcommands(program: Command): CompletionItem[] {
  return program.commands.map((cmd) => ({
    name: cmd.name(),
    description: cmd.description(),
  }));
}

/**
 * Extract options from a command
 */
function extractOptions(cmd: Command): CompletionItem[] {
  const options: CompletionItem[] = [];

  for (const opt of cmd.options as Option[]) {
    const longFlag = opt.long;
    const shortFlag = opt.short;
    const description = opt.description;

    if (longFlag) {
      options.push({ name: longFlag, description });
    }
    if (shortFlag) {
      options.push({ name: shortFlag, description });
    }
  }

  return options;
}

/**
 * Extract global options from program
 */
export function extractGlobalOptions(program: Command): CompletionItem[] {
  const options = extractOptions(program);
  // Add --help and --version which are auto-added by Commander
  options.push({ name: "--help", description: "display help for command" });
  options.push({ name: "--version", description: "output the version number" });
  return options;
}

/**
 * Find a subcommand by name
 */
function findSubcommand(program: Command, name: string): Command | undefined {
  return program.commands.find((cmd) => cmd.name() === name);
}

/**
 * Get completions based on the current completion environment
 */
export function getCompletions(env: TabtabEnv, program: Command): CompletionItem[] {
  const { line, prev, last } = env;
  const words = line.trim().split(/\s+/);

  // Skip the program name
  const args = words.slice(1);

  const subcommands = extractSubcommands(program);
  const globalOptions = extractGlobalOptions(program);

  // No arguments yet - complete subcommands
  if (args.length === 0) {
    return subcommands;
  }

  const firstArg = args[0] ?? "";

  // Check if we're completing an option value
  if (prev && prev.startsWith("-")) {
    const optionValues = OPTION_VALUES[prev];
    if (optionValues) {
      return toCompletionItems(optionValues);
    }
  }

  // Check if current word is starting an option
  if (last.startsWith("-")) {
    const subCmd = findSubcommand(program, firstArg);
    const commandOptions = subCmd ? extractOptions(subCmd) : [];
    return [...commandOptions, ...globalOptions];
  }

  // Check for subcommand completion (nested commands like fulltext, server, completion)
  const parentCmd = findSubcommand(program, firstArg);
  if (parentCmd && parentCmd.commands.length > 0) {
    const nestedSubcommands = extractSubcommands(parentCmd);
    // If we only have the command, complete its subcommands
    if (args.length === 1 || (args.length === 2 && !last.startsWith("-"))) {
      return nestedSubcommands;
    }
  }

  // If we're at the first arg position, complete subcommands
  if (args.length === 1) {
    return subcommands.filter((cmd) => cmd.name.startsWith(last));
  }

  // Default: return subcommands
  return subcommands;
}

/**
 * Check if the current context requires ID completion
 */
export function needsIdCompletion(env: TabtabEnv): {
  needs: boolean;
  command?: string | undefined;
  subcommand?: string | undefined;
} {
  const { line, prev } = env;
  const words = line.trim().split(/\s+/);
  const args = words.slice(1);

  if (args.length === 0) {
    return { needs: false };
  }

  const command = args[0] ?? "";

  // Don't complete IDs if we're completing an option value
  if (prev && prev.startsWith("-")) {
    return { needs: false };
  }

  // Check for fulltext subcommands
  if (command === "fulltext" && args.length >= 2) {
    const subcommand = args[1] ?? "";
    if (ID_COMPLETION_FULLTEXT_SUBCOMMANDS.has(subcommand)) {
      return { needs: true, command, subcommand };
    }
    return { needs: false };
  }

  // Check for ID-completing commands
  if (ID_COMPLETION_COMMANDS.has(command)) {
    return { needs: true, command };
  }

  return { needs: false };
}

/**
 * Install shell completion for the CLI
 */
export async function installCompletion(): Promise<void> {
  const tabtab = await import("tabtab");
  await tabtab.install({
    name: "ref",
    completer: "ref",
  });
}

/**
 * Uninstall shell completion
 */
export async function uninstallCompletion(): Promise<void> {
  const tabtab = await import("tabtab");
  await tabtab.uninstall({
    name: "ref",
  });
}

/**
 * Handle completion request
 * Called when COMP_LINE environment variable is set
 */
export async function handleCompletion(program: Command): Promise<void> {
  const tabtab = await import("tabtab");
  const env = tabtab.parseEnv(process.env);

  if (!env.complete) {
    return;
  }

  // Get static completions
  const completions = getCompletions(env, program);

  // TODO: Add dynamic ID completion in Phase 17.4

  tabtab.log(completions);
}

/**
 * Register the completion command with Commander
 */
export function registerCompletionCommand(program: Command): void {
  program
    .command("completion")
    .description("Install or uninstall shell completion")
    .argument("[action]", "Action to perform (install or uninstall)", "install")
    .action(async (action: string) => {
      if (action === "install") {
        await installCompletion();
      } else if (action === "uninstall") {
        await uninstallCompletion();
      } else {
        console.error(`Unknown action: ${action}`);
        console.error("Usage: ref completion [install|uninstall]");
        process.exit(1);
      }
    });
}
