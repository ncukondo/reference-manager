import type { Config } from "../../config/schema.js";
import type { CslItem } from "../../core/csl-json/types.js";
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
  metadata?: boolean;
}

export type CheckCommandResult = CheckOperationResult;

/**
 * Build check operation options from command options.
 */
function buildCheckOptions(
  options: CheckCommandOptions,
  appConfig?: Config
): CheckOperationOptions {
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
  if (options.metadata !== undefined) {
    opOptions.metadata = options.metadata;
  }

  if (appConfig) {
    const pubmed: { email?: string; apiKey?: string } = {};
    if (appConfig.pubmed.email) pubmed.email = appConfig.pubmed.email;
    if (appConfig.pubmed.apiKey) pubmed.apiKey = appConfig.pubmed.apiKey;
    opOptions.config = {
      ...(appConfig.email ? { email: appConfig.email } : {}),
      pubmed,
    };
  }

  return opOptions;
}

/**
 * Execute check command.
 */
export async function executeCheck(
  options: CheckCommandOptions,
  context: ExecutionContext,
  appConfig?: Config
): Promise<CheckCommandResult> {
  return context.library.check(buildCheckOptions(options, appConfig));
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
    case "metadata_mismatch":
      return "[MISMATCH]";
    case "metadata_outdated":
      return "[OUTDATED]";
    default:
      return "[WARNING]";
  }
}

/**
 * Format a field diff as "field: local → remote".
 */
function formatFieldDiff(diff: {
  field: string;
  local: string | null;
  remote: string | null;
}): string {
  const local = diff.local ?? "(none)";
  const remote = diff.remote ?? "(none)";
  return `  ${diff.field}: "${local}" → "${remote}"`;
}

/**
 * Format a single finding's details.
 */
function formatFindingDetails(finding: CheckFinding, refId: string): string[] {
  const lines: string[] = [];

  // Show field diffs for metadata findings
  if (finding.details?.fieldDiffs && finding.details.fieldDiffs.length > 0) {
    for (const diff of finding.details.fieldDiffs) {
      lines.push(formatFieldDiff(diff));
    }
  }

  // Show message
  const icon = finding.type === "metadata_mismatch" ? "\u26A0" : "\u2139";
  if (finding.type === "metadata_mismatch" || finding.type === "metadata_outdated") {
    lines.push(`  ${icon} ${finding.message}`);
    lines.push(`  \u2192 Run: ref update ${refId}`);
  } else {
    lines.push(`  ${finding.message}`);
    if (finding.details?.retractionDoi) {
      lines.push(`  Retraction notice: https://doi.org/${finding.details.retractionDoi}`);
    }
    if (finding.details?.newDoi) {
      lines.push(`  New DOI: https://doi.org/${finding.details.newDoi}`);
    }
  }
  return lines;
}

const FINDING_TYPE_KEYS: Record<string, string> = {
  retracted: "retracted",
  concern: "concern",
  metadata_mismatch: "mismatch",
  metadata_outdated: "outdated",
  version_changed: "versionChanged",
};

/**
 * Count finding types across all results.
 */
function countFindingTypes(result: CheckOperationResult): Record<string, number> {
  const counts: Record<string, number> = {};
  const allFindings = result.results.flatMap((r) => r.findings);
  for (const f of allFindings) {
    const key = FINDING_TYPE_KEYS[f.type];
    if (key) counts[key] = (counts[key] ?? 0) + 1;
  }
  return counts;
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
      lines.push(...formatFindingDetails(finding, r.id));
    }
    lines.push("");
  }

  const { summary } = result;
  const parts: string[] = [`${summary.total} checked`];
  // Count specific finding types
  const fc = countFindingTypes(result);
  const summaryItems: [string, string][] = [
    ["retracted", "retracted"],
    ["concern", "concern"],
    ["mismatch", "mismatch"],
    ["outdated", "outdated"],
    ["versionChanged", "version changed"],
  ];
  for (const [key, label] of summaryItems) {
    const count = fc[key] ?? 0;
    if (count > 0) parts.push(`${count} ${label}`);
  }
  if (summary.ok > 0) parts.push(`${summary.ok} ok`);
  if (summary.skipped > 0) parts.push(`${summary.skipped} skipped`);
  lines.push(`Summary: ${parts.join(", ")}`);

  return lines.join("\n");
}

export interface FormatCheckJsonOptions {
  full?: boolean;
  items?: Map<string, CslItem>;
}

/**
 * Format check result as JSON output.
 */
export function formatCheckJsonOutput(
  result: CheckOperationResult,
  options?: FormatCheckJsonOptions
): CheckOperationResult & { results: (CheckResult & { item?: CslItem })[] } {
  if (!options?.full || !options.items) {
    return result;
  }

  const results = result.results.map((r) => {
    const item = options.items?.get(r.id);
    return item ? { ...r, item } : r;
  });

  return { ...result, results };
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

    const result = await executeCheck({ ...options, identifiers: ids }, context, config);

    // Fetch all refs once for --full JSON and --fix (avoids redundant getAll calls)
    const needAllRefs = (options.full && outputFormat === "json") || options.fix;
    const allRefs = needAllRefs ? await context.library.getAll() : undefined;

    const jsonOptions = buildJsonOptionsFromRefs(options, outputFormat, result, allRefs);
    outputCheckResult(result, outputFormat, jsonOptions);

    // Interactive repair if --fix and there are warnings
    if (options.fix && result.summary.warnings > 0 && allRefs) {
      const { runFixInteraction } = await import("../../features/check/fix-interaction.js");
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
 * Build JSON formatting options for --full output using pre-fetched refs.
 */
function buildJsonOptionsFromRefs(
  options: Omit<CheckCommandOptions, "identifiers">,
  outputFormat: string,
  result: CheckOperationResult,
  allRefs?: CslItem[]
): FormatCheckJsonOptions | undefined {
  if (!options.full || outputFormat !== "json" || !allRefs) return undefined;

  const items = new Map<string, CslItem>();
  for (const r of result.results) {
    const item = allRefs.find((ref) => ref.id === r.id);
    if (item) items.set(r.id, item);
  }
  return { full: true, items };
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
function outputCheckResult(
  result: CheckOperationResult,
  format: string,
  jsonOptions?: FormatCheckJsonOptions
): void {
  if (format === "json") {
    process.stdout.write(`${JSON.stringify(formatCheckJsonOutput(result, jsonOptions))}\n`);
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
