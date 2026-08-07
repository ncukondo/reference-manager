/**
 * Show Command
 *
 * Single-reference detail view for comprehensive inspection.
 */

import { stringify as yamlStringify } from "yaml";
import type { Config } from "../../config/schema.js";
import type { CslItem } from "../../core/csl-json/types.js";
import { Library } from "../../core/library.js";
import { formatBibtex } from "../../features/format/bibtex.js";
import { normalizeReference } from "../../features/format/show-normalizer.js";
import { formatShowPretty } from "../../features/format/show-pretty.js";
import { isSuperseded } from "../../features/superseded/index.js";
import { type ExecutionContext, createExecutionContext } from "../execution-context.js";
import {
  ExitCode,
  exitWithError,
  isTTY,
  loadConfigWithOverrides,
  readIdentifierFromStdin,
  setExitCode,
  writeOutputWithClipboard,
} from "../helpers.js";
import { reportSuperseded } from "../superseded-report.js";

export interface ShowCommandOptions {
  uuid?: boolean;
  output?: "pretty" | "json" | "yaml" | "bibtex";
  json?: boolean;
}

export async function executeShow(
  identifier: string,
  options: ShowCommandOptions,
  context: ExecutionContext
): Promise<CslItem | undefined> {
  const idType = options.uuid ? "uuid" : "id";
  return context.library.find(identifier, { idType }) as Promise<CslItem | undefined>;
}

export function formatShowOutput(
  item: CslItem,
  options: ShowCommandOptions,
  attachmentsDirectory?: string,
  allItems?: CslItem[]
): string {
  const format = options.json ? "json" : (options.output ?? "pretty");
  const normalizeOpts =
    attachmentsDirectory || allItems
      ? {
          ...(attachmentsDirectory && { attachmentsDirectory }),
          ...(allItems && { allItems }),
        }
      : undefined;

  if (format === "json") {
    const normalized = normalizeReference(item, normalizeOpts);
    return JSON.stringify(normalized, null, 2);
  }

  if (format === "yaml") {
    const normalized = normalizeReference(item, normalizeOpts);
    return yamlStringify(normalized);
  }

  if (format === "bibtex") {
    return formatBibtex([item]);
  }

  // pretty (default)
  const normalized = normalizeReference(item, normalizeOpts);
  return formatShowPretty(normalized);
}

async function executeInteractiveSelect(
  context: ExecutionContext,
  config: Config
): Promise<string> {
  const { withAlternateScreen } = await import("../../features/interactive/alternate-screen.js");
  const { selectReferencesOrExit } = await import("../../features/interactive/reference-select.js");

  const allReferences = await context.library.getAll();

  const identifiers = await withAlternateScreen(() =>
    selectReferencesOrExit(allReferences, { multiSelect: false }, config.cli.tui)
  );

  return identifiers[0] ?? "";
}

export async function handleShowAction(
  identifier: string | undefined,
  options: ShowCommandOptions,
  globalOpts: Record<string, unknown>
): Promise<void> {
  try {
    const config = await loadConfigWithOverrides({ ...globalOpts, ...options });
    const context = await createExecutionContext(config, Library.load);

    let resolvedIdentifier: string;

    if (identifier) {
      resolvedIdentifier = identifier;
    } else if (isTTY()) {
      resolvedIdentifier = await executeInteractiveSelect(context, config);
    } else {
      const stdinId = await readIdentifierFromStdin();
      if (!stdinId) {
        exitWithError("Identifier required (non-interactive mode)");
        return;
      }
      resolvedIdentifier = stdinId;
    }

    const item = await executeShow(resolvedIdentifier, options, context);

    if (!item) {
      exitWithError(`Reference not found: ${resolvedIdentifier}`);
      return;
    }

    // Only fetch the library when this record actually points somewhere — resolving the
    // successor's citation key needs it, but the common case is an unmarked record.
    const allItems = isSuperseded(item) ? await context.library.getAll() : undefined;

    const output = formatShowOutput(item, options, config.attachments.directory, allItems);
    if (output) {
      await writeOutputWithClipboard(output, false, config.logLevel === "silent");
    }

    await reportSuperseded([item], context, { silent: config.logLevel === "silent" });

    setExitCode(ExitCode.SUCCESS);
  } catch (error) {
    process.stderr.write(`Error: ${error instanceof Error ? error.message : String(error)}\n`);
    setExitCode(ExitCode.INTERNAL_ERROR);
  }
}
