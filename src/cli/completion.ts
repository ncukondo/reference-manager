/**
 * Shell completion support using tabtab
 *
 * Provides intelligent auto-completion for Bash, Zsh, and Fish shells.
 */

import type { Command } from "commander";
import type { CompletionItem, TabtabEnv } from "tabtab";

// Subcommands available in the CLI
const SUBCOMMANDS: CompletionItem[] = [
  { name: "list", description: "List all references" },
  { name: "search", description: "Search references" },
  { name: "add", description: "Add a new reference" },
  { name: "remove", description: "Remove a reference" },
  { name: "update", description: "Update a reference" },
  { name: "cite", description: "Generate citation" },
  { name: "fulltext", description: "Manage full-text files" },
  { name: "server", description: "HTTP server commands" },
  { name: "mcp", description: "MCP stdio server" },
  { name: "completion", description: "Shell completion" },
];

// Global options available for all commands
const GLOBAL_OPTIONS: CompletionItem[] = [
  { name: "--help", description: "Display help" },
  { name: "--version", description: "Display version" },
  { name: "--config", description: "Config file path" },
  { name: "--library", description: "Library file path" },
  { name: "--quiet", description: "Suppress output" },
  { name: "--verbose", description: "Enable verbose output" },
  { name: "--log-level", description: "Log level" },
  { name: "--no-backup", description: "Disable backup" },
  { name: "--backup-dir", description: "Backup directory" },
];

// Command-specific options
const COMMAND_OPTIONS: Record<string, CompletionItem[]> = {
  list: [
    { name: "--json", description: "Output JSON" },
    { name: "--ids-only", description: "Output IDs only" },
    { name: "--uuid", description: "Show UUID" },
    { name: "--bibtex", description: "Output BibTeX" },
    { name: "--sort", description: "Sort field" },
    { name: "--order", description: "Sort order" },
    { name: "--limit", description: "Max results" },
    { name: "-n", description: "Max results (short)" },
    { name: "--offset", description: "Skip results" },
  ],
  search: [
    { name: "--json", description: "Output JSON" },
    { name: "--ids-only", description: "Output IDs only" },
    { name: "--uuid", description: "Show UUID" },
    { name: "--bibtex", description: "Output BibTeX" },
    { name: "--sort", description: "Sort field" },
    { name: "--order", description: "Sort order" },
    { name: "--limit", description: "Max results" },
    { name: "-n", description: "Max results (short)" },
    { name: "--offset", description: "Skip results" },
  ],
  add: [
    { name: "--stdin", description: "Read from stdin" },
    { name: "--link", description: "Link file instead of copy" },
  ],
  remove: [
    { name: "--force", description: "Skip confirmation" },
    { name: "--uuid", description: "Use UUID" },
  ],
  update: [
    { name: "--field", description: "Field to update" },
    { name: "--uuid", description: "Use UUID" },
  ],
  cite: [
    { name: "--style", description: "Citation style" },
    { name: "--csl-file", description: "Custom CSL file" },
    { name: "--locale", description: "Locale" },
    { name: "--format", description: "Output format" },
    { name: "--in-text", description: "In-text citation" },
    { name: "--uuid", description: "Use UUID" },
  ],
  fulltext: [],
  server: [],
  mcp: [{ name: "--config", description: "Config file" }],
  completion: [],
};

// Option values for specific options
const OPTION_VALUES: Record<string, CompletionItem[]> = {
  "--sort": [
    { name: "created", description: "Creation date" },
    { name: "updated", description: "Last updated" },
    { name: "published", description: "Publication date" },
    { name: "author", description: "Author name" },
    { name: "title", description: "Title" },
    { name: "relevance", description: "Search relevance" },
  ],
  "--order": [
    { name: "asc", description: "Ascending" },
    { name: "desc", description: "Descending" },
  ],
  "--format": [
    { name: "text", description: "Plain text" },
    { name: "html", description: "HTML" },
    { name: "rtf", description: "RTF" },
  ],
  "--style": [
    { name: "apa", description: "APA style" },
    { name: "vancouver", description: "Vancouver style" },
    { name: "chicago-author-date", description: "Chicago style" },
    { name: "harvard1", description: "Harvard style" },
    { name: "ieee", description: "IEEE style" },
    { name: "mla", description: "MLA style" },
  ],
  "--log-level": [
    { name: "silent", description: "No output" },
    { name: "info", description: "Info level" },
    { name: "debug", description: "Debug level" },
  ],
};

// Subcommand completions for nested commands
const SUBCOMMAND_VALUES: Record<string, CompletionItem[]> = {
  fulltext: [
    { name: "attach", description: "Attach file" },
    { name: "get", description: "Get file" },
    { name: "detach", description: "Detach file" },
  ],
  server: [
    { name: "start", description: "Start server" },
    { name: "stop", description: "Stop server" },
    { name: "status", description: "Server status" },
  ],
  completion: [
    { name: "install", description: "Install completion" },
    { name: "uninstall", description: "Remove completion" },
  ],
};

// Commands that support ID completion
const ID_COMPLETION_COMMANDS = new Set(["cite", "remove", "update"]);
const ID_COMPLETION_FULLTEXT_SUBCOMMANDS = new Set(["attach", "get", "detach"]);

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
 * Get completions based on the current completion environment
 */
export function getCompletions(env: TabtabEnv): CompletionItem[] {
  const { line, prev, last } = env;
  const words = line.trim().split(/\s+/);

  // Skip the program name
  const args = words.slice(1);

  // No arguments yet - complete subcommands
  if (args.length === 0) {
    return SUBCOMMANDS;
  }

  const firstArg = args[0] ?? "";

  // Check if we're completing an option value
  if (prev && prev.startsWith("-")) {
    const optionValues = OPTION_VALUES[prev];
    if (optionValues) {
      return optionValues;
    }
  }

  // Check if current word is starting an option
  if (last.startsWith("-")) {
    const commandOptions = COMMAND_OPTIONS[firstArg] ?? [];
    return [...commandOptions, ...GLOBAL_OPTIONS];
  }

  // Check for subcommand completion (fulltext, server, completion)
  const subcommandValues = SUBCOMMAND_VALUES[firstArg];
  if (subcommandValues) {
    // If we only have the command, complete its subcommands
    if (args.length === 1 || (args.length === 2 && !last.startsWith("-"))) {
      return subcommandValues;
    }
  }

  // If we're at the first arg position, complete subcommands
  if (args.length === 1) {
    return SUBCOMMANDS.filter((cmd) => cmd.name.startsWith(last));
  }

  // Default: return subcommands
  return SUBCOMMANDS;
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
 * Handle completion request
 * Called when COMP_LINE environment variable is set
 */
export async function handleCompletion(): Promise<void> {
  const tabtab = await import("tabtab");
  const env = tabtab.parseEnv(process.env);

  if (!env.complete) {
    return;
  }

  // Get static completions
  const completions = getCompletions(env);

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
