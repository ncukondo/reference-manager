import type { Config } from "../../config/schema.js";
import { Library } from "../../core/library.js";
import type { CiteOperationOptions, CiteResult } from "../../features/operations/cite.js";
import { type ExecutionContext, createExecutionContext } from "../execution-context.js";
import { isTTY, loadConfigWithOverrides } from "../helpers.js";

/**
 * Options for the cite command.
 */
export interface CiteCommandOptions {
  identifiers: string[];
  uuid?: boolean;
  style?: string;
  cslFile?: string;
  locale?: string;
  format?: "text" | "html" | "rtf";
  inText?: boolean;
}

/**
 * Result from cite command execution.
 */
export type CiteCommandResult = CiteResult;

/**
 * Validate citation options.
 */
async function validateOptions(options: CiteCommandOptions): Promise<void> {
  if (options.format && !["text", "html", "rtf"].includes(options.format)) {
    throw new Error(`Invalid format '${options.format}'. Must be one of: text, html, rtf`);
  }

  if (options.cslFile) {
    const fs = await import("node:fs");
    if (!fs.existsSync(options.cslFile)) {
      throw new Error(`CSL file '${options.cslFile}' not found`);
    }
  }
}

/**
 * Build cite operation options from command options.
 */
function buildCiteOptions(options: CiteCommandOptions): CiteOperationOptions {
  return {
    identifiers: options.identifiers,
    ...(options.uuid && { idType: "uuid" as const }),
    ...(options.style !== undefined && { style: options.style }),
    ...(options.cslFile !== undefined && { cslFile: options.cslFile }),
    ...(options.locale !== undefined && { locale: options.locale }),
    ...(options.format !== undefined && { format: options.format }),
    ...(options.inText !== undefined && { inText: options.inText }),
  };
}

/**
 * Execute cite command.
 * Uses context.library.cite() which works for both local and server modes.
 *
 * @param options - Cite command options
 * @param context - Execution context
 * @returns Cite result containing per-identifier results
 */
export async function executeCite(
  options: CiteCommandOptions,
  context: ExecutionContext
): Promise<CiteCommandResult> {
  await validateOptions(options);

  return context.library.cite(buildCiteOptions(options));
}

/**
 * Format cite result for CLI output.
 *
 * @param result - Cite result
 * @returns Formatted output string (for stdout)
 */
export function formatCiteOutput(result: CiteCommandResult): string {
  const lines: string[] = [];
  for (const r of result.results) {
    if (r.success) {
      lines.push(r.citation);
    }
  }
  return lines.join("\n");
}

/**
 * Format cite errors for stderr.
 *
 * @param result - Cite result
 * @returns Error messages to write to stderr
 */
export function formatCiteErrors(result: CiteCommandResult): string {
  const lines: string[] = [];
  for (const r of result.results) {
    if (!r.success) {
      lines.push(`Error for '${r.identifier}': ${r.error}`);
    }
  }
  return lines.join("\n");
}

/**
 * Determine exit code based on result.
 *
 * @param result - Cite result
 * @returns Exit code (0 for success/partial success, 1 for complete failure)
 */
export function getCiteExitCode(result: CiteCommandResult): number {
  const hasSuccess = result.results.some((r) => r.success);
  const hasError = result.results.some((r) => !r.success);

  if (hasSuccess) {
    return 0;
  }
  if (hasError) {
    return 1;
  }
  return 0;
}

/**
 * Execute interactive cite: select references and optionally style.
 */
async function executeInteractiveCite(
  options: Omit<CiteCommandOptions, "identifiers">,
  context: ExecutionContext,
  config: Config
): Promise<CiteCommandResult> {
  const { runReferenceSelect } = await import("../../features/interactive/reference-select.js");
  const { runStyleSelect } = await import("../../features/interactive/style-select.js");

  const allReferences = await context.library.getAll();
  if (allReferences.length === 0) {
    process.stderr.write("No references in library.\n");
    process.exit(0);
  }

  const selectResult = await runReferenceSelect(
    allReferences,
    { multiSelect: true },
    config.cli.interactive
  );

  if (selectResult.cancelled || selectResult.selected.length === 0) {
    process.exit(0);
  }

  let style = options.style;
  if (!style && !options.cslFile) {
    const styleResult = await runStyleSelect({
      cslDirectory: config.citation.cslDirectory,
      defaultStyle: config.citation.defaultStyle,
    });

    if (styleResult.cancelled) {
      process.exit(0);
    }
    style = styleResult.style;
  }

  const identifiers = selectResult.selected.map((item) => item.id);
  return executeCite({ ...options, ...(style && { style }), identifiers }, context);
}

/**
 * Handle 'cite' command action.
 */
export async function handleCiteAction(
  identifiers: string[],
  options: Omit<CiteCommandOptions, "identifiers">,
  globalOpts: Record<string, unknown>
): Promise<void> {
  try {
    const config = await loadConfigWithOverrides({ ...globalOpts, ...options });
    const context = await createExecutionContext(config, Library.load);

    let result: CiteCommandResult;

    if (identifiers.length === 0) {
      if (!isTTY()) {
        process.stderr.write(
          "Error: No identifiers provided. Provide IDs or run interactively in a TTY.\n"
        );
        process.exit(1);
      }
      result = await executeInteractiveCite(options, context, config);
    } else {
      result = await executeCite({ ...options, identifiers }, context);
    }

    const output = formatCiteOutput(result);
    if (output) {
      process.stdout.write(`${output}\n`);
    }

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
