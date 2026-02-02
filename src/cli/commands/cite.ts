import type { Config } from "../../config/schema.js";
import { Library } from "../../core/library.js";
import type { CiteOperationOptions, CiteResult } from "../../features/operations/cite.js";
import { type ExecutionContext, createExecutionContext } from "../execution-context.js";
import {
  ExitCode,
  isTTY,
  loadConfigWithOverrides,
  readIdentifiersFromStdin,
  resolveClipboardEnabled,
  setExitCode,
  writeOutputWithClipboard,
} from "../helpers.js";

/**
 * Options for the cite command.
 */
export interface CiteCommandOptions {
  identifiers: string[];
  uuid?: boolean;
  style?: string;
  cslFile?: string;
  locale?: string;
  output?: "text" | "html" | "rtf";
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
  if (options.output && !["text", "html", "rtf"].includes(options.output)) {
    throw new Error(`Invalid output format '${options.output}'. Must be one of: text, html, rtf`);
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
    ...(options.output !== undefined && { format: options.output }),
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
  const { withAlternateScreen } = await import("../../features/interactive/alternate-screen.js");
  const { runCiteFlow } = await import("../../features/interactive/apps/index.js");
  const { buildStyleChoices, listCustomStyles } = await import(
    "../../features/interactive/style-select.js"
  );
  const { search } = await import("../../features/search/matcher.js");
  const { tokenize } = await import("../../features/search/tokenizer.js");
  const { checkTTY } = await import("../../features/interactive/tty.js");

  // Check TTY requirement
  checkTTY();

  const allReferences = await context.library.getAll();

  if (allReferences.length === 0) {
    process.stderr.write("No references in library.\n");
    setExitCode(ExitCode.SUCCESS);
    return { results: [] };
  }

  // Create search function
  const searchFn = (query: string) => {
    const { tokens } = tokenize(query);
    return search(allReferences, tokens);
  };

  // Build style options
  const showStyleSelect = !options.style && !options.cslFile;
  const customStyles = listCustomStyles(config.citation.cslDirectory);
  const styleOptions = buildStyleChoices(customStyles, config.citation.defaultStyle);

  // Run cite flow in alternate screen (Single App Pattern)
  const result = await withAlternateScreen(() =>
    runCiteFlow({
      allReferences,
      searchFn,
      config: { limit: config.cli.tui.limit },
      styleOptions,
      showStyleSelect,
    })
  );

  if (result.cancelled || result.identifiers.length === 0) {
    setExitCode(ExitCode.SUCCESS);
    return { results: [] };
  }

  const style = result.style ?? options.style;
  return executeCite(
    { ...options, ...(style && { style }), identifiers: result.identifiers },
    context
  );
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
    let isTuiMode = false;

    if (identifiers.length === 0) {
      if (isTTY()) {
        // TTY mode: interactive selection
        isTuiMode = true;
        result = await executeInteractiveCite(options, context, config);
      } else {
        // Non-TTY mode: read from stdin (pipeline support)
        const stdinIds = await readIdentifiersFromStdin();
        if (stdinIds.length === 0) {
          process.stderr.write(
            "Error: No identifiers provided. Provide IDs, pipe them via stdin, or run interactively in a TTY.\n"
          );
          setExitCode(ExitCode.ERROR);
          return;
        }
        result = await executeCite({ ...options, identifiers: stdinIds }, context);
      }
    } else {
      result = await executeCite({ ...options, identifiers }, context);
    }

    const output = formatCiteOutput(result);
    if (output) {
      const clipboardEnabled = resolveClipboardEnabled(globalOpts, config, isTuiMode);
      await writeOutputWithClipboard(output, clipboardEnabled, config.logLevel === "silent");
    }

    const errors = formatCiteErrors(result);
    if (errors) {
      process.stderr.write(`${errors}\n`);
    }

    setExitCode(getCiteExitCode(result));
  } catch (error) {
    process.stderr.write(`Error: ${error instanceof Error ? error.message : String(error)}\n`);
    setExitCode(ExitCode.INTERNAL_ERROR);
  }
}
