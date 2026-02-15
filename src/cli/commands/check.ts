import type { Config } from "../../config/schema.js";
import { Library } from "../../core/library.js";
import type { CheckFinding, CheckResult } from "../../features/check/types.js";
import type {
  CheckOperationOptions,
  CheckOperationResult,
} from "../../features/operations/check.js";
import { type ExecutionContext, createExecutionContext } from "../execution-context.js";
import {
  ExitCode,
  isTTY,
  loadConfigWithOverrides,
  readIdentifiersFromStdin,
  setExitCode,
} from "../helpers.js";

export interface CheckCommandOptions {
  identifiers: string[];
  uuid?: boolean;
  all?: boolean;
  search?: string;
  output?: "text" | "json";
  full?: boolean;
  noSave?: boolean;
  days?: number;
  fix?: boolean;
}

export type CheckCommandResult = CheckOperationResult;

/**
 * Build check operation options from command options.
 */
function buildCheckOptions(options: CheckCommandOptions): CheckOperationOptions {
  const opOptions: CheckOperationOptions = {};

  if (options.all) {
    opOptions.all = true;
  } else if (options.search) {
    opOptions.searchQuery = options.search;
  } else if (options.identifiers.length > 0) {
    opOptions.identifiers = options.identifiers;
  }

  if (options.uuid) {
    opOptions.idType = "uuid";
  }
  if (options.days !== undefined) {
    opOptions.skipDays = options.days;
  }
  if (options.noSave) {
    opOptions.save = false;
  }

  return opOptions;
}

/**
 * Execute check command.
 */
export async function executeCheck(
  options: CheckCommandOptions,
  context: ExecutionContext
): Promise<CheckCommandResult> {
  return context.library.check(buildCheckOptions(options));
}

/**
 * Get status label for a check result.
 */
function getStatusLabel(result: CheckResult): string {
  if (result.status === "skipped") return "[SKIPPED]";
  if (result.status === "ok") return "[OK]";
  const finding = result.findings[0];
  if (!finding) return "[WARNING]";
  switch (finding.type) {
    case "retracted":
      return "[RETRACTED]";
    case "concern":
      return "[CONCERN]";
    case "version_changed":
      return "[VERSION]";
    case "metadata_changed":
      return "[METADATA]";
    default:
      return "[WARNING]";
  }
}

/**
 * Format a single finding's details.
 */
function formatFindingDetails(finding: CheckFinding): string[] {
  const lines: string[] = [];
  lines.push(`  ${finding.message}`);
  if (finding.details?.retractionDoi) {
    lines.push(`  Retraction notice: https://doi.org/${finding.details.retractionDoi}`);
  }
  if (finding.details?.newDoi) {
    lines.push(`  New DOI: https://doi.org/${finding.details.newDoi}`);
  }
  return lines;
}

/**
 * Format check result as text output.
 */
export function formatCheckTextOutput(result: CheckOperationResult): string {
  const lines: string[] = [];

  for (const r of result.results) {
    const label = getStatusLabel(r);
    lines.push(`${label} ${r.id}`);
    for (const finding of r.findings) {
      lines.push(...formatFindingDetails(finding));
    }
    lines.push("");
  }

  const { summary } = result;
  const parts: string[] = [`${summary.total} checked`];
  if (summary.warnings > 0) parts.push(`${summary.warnings} warning(s)`);
  if (summary.ok > 0) parts.push(`${summary.ok} ok`);
  if (summary.skipped > 0) parts.push(`${summary.skipped} skipped`);
  lines.push(`Summary: ${parts.join(", ")}`);

  return lines.join("\n");
}

/**
 * Format check result as JSON output.
 */
export function formatCheckJsonOutput(result: CheckOperationResult): CheckOperationResult {
  return result;
}

/**
 * Handle 'check' command action.
 */
export async function handleCheckAction(
  identifiers: string[],
  options: Omit<CheckCommandOptions, "identifiers">,
  globalOpts: Record<string, unknown>
): Promise<void> {
  const outputFormat = options.output ?? "text";

  // --fix requires TTY
  if (options.fix && !isTTY()) {
    outputCheckError(new Error("--fix requires an interactive terminal (TTY)"), outputFormat);
    setExitCode(ExitCode.ERROR);
    return;
  }

  try {
    const config = await loadConfigWithOverrides({ ...globalOpts, ...options });
    const context = await createExecutionContext(config, Library.load);

    const ids = await resolveIdentifiers(identifiers, options, context, config);
    if (ids === null) return;

    const result = await executeCheck({ ...options, identifiers: ids }, context);
    outputCheckResult(result, outputFormat);

    // Interactive repair if --fix and there are warnings
    if (options.fix && result.summary.warnings > 0) {
      const { runFixInteraction } = await import("../../features/check/fix-interaction.js");
      const allRefs = await context.library.getAll();
      const findItem = (id: string): ReturnType<typeof allRefs.find> =>
        allRefs.find((item) => item.id === id);

      const fixResult = await runFixInteraction(result.results, context.library, findItem);

      const removedSuffix =
        fixResult.removed.length > 0 ? `, ${fixResult.removed.length} removed` : "";
      process.stderr.write(
        `\nFix summary: ${fixResult.applied} applied, ${fixResult.skipped} skipped${removedSuffix}\n`
      );
    }

    setExitCode(ExitCode.SUCCESS);
  } catch (error) {
    outputCheckError(error, outputFormat);
    setExitCode(ExitCode.ERROR);
  }
}

/**
 * Resolve identifiers from args, stdin, or interactive selection.
 * Returns null if the caller should return early (e.g. cancelled selection).
 */
async function resolveIdentifiers(
  identifiers: string[],
  options: Omit<CheckCommandOptions, "identifiers">,
  context: ExecutionContext,
  config: Config
): Promise<string[] | null> {
  if (identifiers.length > 0 || options.all || options.search) {
    return identifiers;
  }

  if (isTTY()) {
    const ids = await selectReferencesInteractively(context, config);
    if (ids.length === 0) {
      setExitCode(ExitCode.SUCCESS);
      return null;
    }
    return ids;
  }

  const stdinIds = await readIdentifiersFromStdin();
  if (stdinIds.length === 0) {
    process.stderr.write(
      "Error: No identifiers provided. Provide IDs, use --all, --search, or run interactively.\n"
    );
    setExitCode(ExitCode.ERROR);
    return null;
  }
  return stdinIds;
}

/**
 * Output check result in the specified format.
 */
function outputCheckResult(result: CheckOperationResult, format: string): void {
  if (format === "json") {
    process.stdout.write(`${JSON.stringify(formatCheckJsonOutput(result))}\n`);
  } else {
    process.stderr.write(`${formatCheckTextOutput(result)}\n`);
  }
}

/**
 * Output check error in the specified format.
 */
function outputCheckError(error: unknown, format: string): void {
  const message = error instanceof Error ? error.message : String(error);
  if (format === "json") {
    process.stdout.write(`${JSON.stringify({ error: message })}\n`);
  } else {
    process.stderr.write(`Error: ${message}\n`);
  }
}

/**
 * Interactive reference selection for check command.
 */
async function selectReferencesInteractively(
  context: ExecutionContext,
  config: Config
): Promise<string[]> {
  const { withAlternateScreen } = await import("../../features/interactive/alternate-screen.js");
  const { selectReferenceItemsOrExit } = await import(
    "../../features/interactive/reference-select.js"
  );

  const allReferences = await context.library.getAll();

  if (allReferences.length === 0) {
    process.stderr.write("No references in library.\n");
    return [];
  }

  const selectedItems = await withAlternateScreen(() =>
    selectReferenceItemsOrExit(allReferences, { multiSelect: true }, config.cli.tui)
  );

  return selectedItems.map((item) => item.id);
}
