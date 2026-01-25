/**
 * CLI Helper Functions
 */

import { readFileSync } from "node:fs";
import { stdin, stdout } from "node:process";
import { loadConfig } from "../config/loader.js";
import type { Config } from "../config/schema.js";

/**
 * Output format type
 */
export type OutputFormat = "pretty" | "json" | "ids-only" | "uuid" | "bibtex";

/**
 * CLI options interface
 */
export interface CliOptions {
  library?: string;
  logLevel?: "silent" | "info" | "debug";
  config?: string;
  quiet?: boolean;
  verbose?: boolean;
  backup?: boolean;
  backupDir?: string;
  json?: boolean;
  idsOnly?: boolean;
  uuid?: boolean;
  bibtex?: boolean;
}

/**
 * Read JSON input from file or stdin
 * @param file - File path (optional, defaults to stdin)
 * @returns JSON string
 */
export async function readJsonInput(file?: string): Promise<string> {
  if (file) {
    // Read from file
    try {
      return readFileSync(file, "utf-8");
    } catch (error) {
      throw new Error(
        `I/O error: Cannot read file ${file}: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  // Read from stdin
  const chunks: Buffer[] = [];
  for await (const chunk of stdin) {
    chunks.push(chunk as Buffer);
  }
  return Buffer.concat(chunks).toString("utf-8");
}

/**
 * Parse JSON input
 * @param input - JSON string
 * @returns Parsed JSON object or array
 */
export function parseJsonInput(input: string): unknown {
  if (!input || input.trim() === "") {
    throw new Error("Parse error: Empty input");
  }

  try {
    return JSON.parse(input);
  } catch (error) {
    throw new Error(
      `Parse error: Invalid JSON: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Load config with CLI argument overrides
 * @param options - CLI options
 * @returns Config with overrides applied
 */
export async function loadConfigWithOverrides(options: CliOptions): Promise<Config> {
  // Load base config
  // Note: options.config is currently ignored as loadConfig uses cwd and userConfigPath
  const config = await loadConfig();

  // Apply CLI overrides
  const overrides: Partial<Config> = {};

  // Library path
  if (options.library) {
    overrides.library = options.library;
  }

  // Log level
  if (options.quiet) {
    overrides.logLevel = "silent";
  } else if (options.verbose) {
    overrides.logLevel = "debug";
  } else if (options.logLevel) {
    overrides.logLevel = options.logLevel;
  }

  // Backup settings
  if (options.backup !== undefined || options.backupDir) {
    overrides.backup = {
      ...config.backup,
      ...(options.backup !== undefined && { enabled: options.backup }),
      ...(options.backupDir && { directory: options.backupDir }),
    };
  }

  return { ...config, ...overrides };
}

/**
 * Get output format from options
 * @param options - CLI options
 * @returns Output format
 * @throws Error if multiple formats specified
 */
export function getOutputFormat(options: CliOptions): OutputFormat {
  const formats: OutputFormat[] = [];

  if (options.json) formats.push("json");
  if (options.idsOnly) formats.push("ids-only");
  if (options.uuid) formats.push("uuid");
  if (options.bibtex) formats.push("bibtex");

  if (formats.length > 1) {
    throw new Error(
      "Multiple output formats specified. Only one of --json, --ids-only, --uuid, --bibtex can be used."
    );
  }

  return formats[0] || "pretty";
}

/**
 * Check if running in TTY
 * @returns True if stdin and stdout are TTY, or if REF_SKIP_TTY_CHECK is set
 *
 * @remarks
 * Set REF_SKIP_TTY_CHECK=1 environment variable to skip TTY check (for testing only)
 */
export function isTTY(): boolean {
  if (process.env.REF_SKIP_TTY_CHECK === "1") {
    return true;
  }
  return Boolean(stdin.isTTY && stdout.isTTY);
}

/**
 * Read identifiers from stdin (for non-TTY/pipeline mode).
 * Reads all lines, splits by whitespace/newlines, filters empty.
 * Returns empty array if stdin has no content.
 */
export async function readIdentifiersFromStdin(): Promise<string[]> {
  const content = await readStdinContent();
  if (!content) {
    return [];
  }
  return content.split(/[\s\n]+/).filter((id) => id.length > 0);
}

/**
 * Read a single identifier from stdin (for non-TTY/pipeline mode).
 * Returns the first non-empty line, or undefined if stdin is empty.
 */
export async function readIdentifierFromStdin(): Promise<string | undefined> {
  const content = await readStdinContent();
  const firstLine = content.split("\n")[0]?.trim();
  return firstLine || undefined;
}

/**
 * Read confirmation from user (y/N)
 * @param prompt - Confirmation prompt message
 * @returns True if user confirmed (y/yes), false otherwise
 */
export async function readConfirmation(prompt: string): Promise<boolean> {
  // If not TTY, auto-confirm
  if (!isTTY()) {
    return true;
  }

  // Use Enquirer for confirmation to work correctly after other Enquirer prompts
  // enquirer is a CommonJS module, so we must use default import
  const enquirer = await import("enquirer");
  const Confirm = (enquirer.default as unknown as Record<string, unknown>)
    .Confirm as new (options: { name: string; message: string; initial?: boolean }) => {
    run: () => Promise<boolean>;
  };

  const confirmPrompt = new Confirm({
    name: "confirm",
    message: prompt,
    initial: false,
  });

  try {
    return await confirmPrompt.run();
  } catch {
    // User cancelled (Ctrl+C)
    return false;
  }
}

/**
 * Read stdin content and split into inputs.
 * Used for reading identifiers from stdin.
 * @returns Array of input strings (split by whitespace)
 */
export async function readStdinInputs(): Promise<string[]> {
  const content = await readStdinContent();

  if (!content) {
    return [];
  }

  // Split by whitespace (space, tab, newline)
  return content.split(/\s+/).filter((s) => s.length > 0);
}

/**
 * Read raw stdin content without splitting.
 * Used for reading file content (JSON, BibTeX, RIS) from stdin.
 * @returns Raw stdin content as string
 */
export async function readStdinContent(): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of stdin) {
    chunks.push(chunk as Buffer);
  }
  return Buffer.concat(chunks).toString("utf-8").trim();
}

/**
 * Read raw stdin content as Buffer.
 * Used for reading binary file content (PDF) from stdin.
 * @returns Raw stdin content as Buffer
 */
export async function readStdinBuffer(): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const chunk of stdin) {
    chunks.push(chunk as Buffer);
  }
  return Buffer.concat(chunks);
}

// ============================================================================
// Exit code helpers
// ============================================================================
// These helpers set process.exitCode instead of calling process.exit() directly.
// This allows the event loop to complete naturally, ensuring all output is flushed.
// Usage: setExitCode(1); return;

/**
 * Standard exit codes for CLI commands
 */
export const ExitCode = {
  /** Success */
  SUCCESS: 0,
  /** General error (e.g., not found, validation failed) */
  ERROR: 1,
  /** Internal/unexpected error */
  INTERNAL_ERROR: 4,
  /** Interrupted by SIGINT */
  SIGINT: 130,
} as const;

/**
 * Set the process exit code without immediately exiting.
 * The process will exit with this code when the event loop completes.
 * @param code - Exit code (0 = success, non-zero = error)
 */
export function setExitCode(code: number): void {
  process.exitCode = code;
}

/**
 * Write error message to stderr and set exit code.
 * @param message - Error message to display
 * @param code - Exit code (defaults to 1)
 */
export function exitWithError(message: string, code: number = ExitCode.ERROR): void {
  process.stderr.write(`Error: ${message}\n`);
  setExitCode(code);
}

/**
 * Write message to stderr and set exit code.
 * @param message - Message to display
 * @param code - Exit code
 */
export function exitWithMessage(message: string, code: number): void {
  process.stderr.write(`${message}\n`);
  setExitCode(code);
}

/**
 * Write output to stdout and set success exit code.
 * @param output - Output to display
 */
export function exitWithOutput(output: string): void {
  process.stdout.write(`${output}\n`);
  setExitCode(ExitCode.SUCCESS);
}
