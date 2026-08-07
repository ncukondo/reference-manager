import { Library } from "../../core/library.js";
import {
  DUPLICATE_KEY_TYPES,
  type DuplicateGroup,
  type DuplicateKeyType,
} from "../../features/duplicate/scanner.js";
import {
  type DuplicatesOperationResult,
  findDuplicates,
} from "../../features/operations/duplicates.js";
import { type ExecutionContext, createExecutionContext } from "../execution-context.js";
import {
  type CliOptions,
  ExitCode,
  isTTY,
  loadConfigWithOverrides,
  setExitCode,
} from "../helpers.js";

export interface DuplicatesCommandOptions {
  by?: readonly DuplicateKeyType[];
  includeResolved?: boolean;
}

export type DuplicatesCommandResult = DuplicatesOperationResult;

export async function executeDuplicates(
  options: DuplicatesCommandOptions,
  context: ExecutionContext
): Promise<DuplicatesCommandResult> {
  return findDuplicates(context.library, {
    ...(options.by !== undefined && { by: options.by }),
    ...(options.includeResolved !== undefined && { includeResolved: options.includeResolved }),
  });
}

/**
 * Parse the `--by` list.
 *
 * @returns The key types, or an error message
 */
export function parseByOption(value: string | undefined): DuplicateKeyType[] | string {
  if (value === undefined) {
    return [];
  }
  const requested = value
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
  if (requested.length === 0) {
    return `Empty --by list. Expected one or more of: ${DUPLICATE_KEY_TYPES.join(", ")}.`;
  }

  const unknown = requested.filter(
    (key) => !(DUPLICATE_KEY_TYPES as readonly string[]).includes(key)
  );
  if (unknown.length > 0) {
    return `Unknown --by value${unknown.length > 1 ? "s" : ""}: ${unknown.join(", ")}. Expected one or more of: ${DUPLICATE_KEY_TYPES.join(", ")}.`;
  }

  return requested as DuplicateKeyType[];
}

function formatGroup(group: DuplicateGroup, index: number): string[] {
  const matched = group.types.map((type) => `${type}=${group.keys[type]}`).join(", ");
  const lines = [`${index + 1}. ${matched}${group.resolved ? "  [already linked]" : ""}`];
  for (const item of group.items) {
    const year = item.issued?.["date-parts"]?.[0]?.[0];
    const title = typeof item.title === "string" ? item.title : "";
    lines.push(`   ${item.id}${year ? ` (${year})` : ""}  ${title}`);
  }
  return lines;
}

/**
 * Human-readable report. Written to stdout — the group listing is the command's output, not a
 * status message.
 */
export function formatDuplicatesOutput(result: DuplicatesCommandResult): string {
  if (result.groups.length === 0) {
    return `No duplicates found among ${result.scanned} references.`;
  }

  const redundant = result.groups.reduce((total, g) => total + g.items.length - 1, 0);
  const lines: string[] = [];
  result.groups.forEach((group, index) => {
    lines.push(...formatGroup(group, index));
    lines.push("");
  });
  lines.push(
    `${result.groups.length} duplicate group${result.groups.length === 1 ? "" : "s"}, ` +
      `${redundant} redundant record${redundant === 1 ? "" : "s"}, among ${result.scanned} references.`
  );
  lines.push("Run with --fix in a terminal to choose which one to keep.");
  return lines.join("\n");
}

export interface DuplicatesJsonGroup {
  types: DuplicateKeyType[];
  keys: Partial<Record<DuplicateKeyType, string>>;
  resolved: boolean;
  items: { id: string; uuid?: string; title?: string; year?: number }[];
}

export interface DuplicatesJsonOutput {
  scanned: number;
  groupCount: number;
  redundantCount: number;
  groups: DuplicatesJsonGroup[];
}

export function formatDuplicatesJsonOutput(result: DuplicatesCommandResult): DuplicatesJsonOutput {
  return {
    scanned: result.scanned,
    groupCount: result.groups.length,
    redundantCount: result.groups.reduce((total, g) => total + g.items.length - 1, 0),
    groups: result.groups.map((group) => ({
      types: group.types,
      keys: group.keys,
      resolved: group.resolved,
      items: group.items.map((item) => {
        const year = item.issued?.["date-parts"]?.[0]?.[0];
        return {
          id: item.id,
          ...(item.custom?.uuid && { uuid: item.custom.uuid }),
          ...(typeof item.title === "string" && { title: item.title }),
          ...(year !== undefined && { year }),
        };
      }),
    })),
  };
}

export interface DuplicatesActionOptions extends CliOptions {
  by?: string;
  fix?: boolean;
  includeResolved?: boolean;
  output?: string;
}

/** Walk the actionable groups interactively and report what changed. */
async function runFix(result: DuplicatesCommandResult, context: ExecutionContext): Promise<void> {
  const { runDuplicateFixInteraction } = await import(
    "../../features/duplicate/fix-interaction.js"
  );
  // Already-linked groups have nothing left to decide
  const actionable = result.groups.filter((group) => !group.resolved);
  if (actionable.length === 0) {
    return;
  }

  const fixResult = await runDuplicateFixInteraction(actionable, context.library);
  process.stderr.write(
    `Fixed ${fixResult.fixed} group${fixResult.fixed === 1 ? "" : "s"}, ` +
      `marked ${fixResult.marked.length}, skipped ${fixResult.skipped}.\n`
  );
}

export async function handleDuplicatesAction(
  options: DuplicatesActionOptions,
  globalOpts: Record<string, unknown>
): Promise<void> {
  const asJson = (options.output ?? "text") === "json";

  const by = parseByOption(options.by);
  if (typeof by === "string") {
    process.stderr.write(`Error: ${by}\n`);
    setExitCode(ExitCode.ERROR);
    return;
  }

  // Matching `check --fix`: choosing which record to keep needs a person, and there is no safe
  // default to apply unattended.
  if (options.fix && !isTTY()) {
    process.stderr.write("Error: --fix requires an interactive terminal (TTY)\n");
    setExitCode(ExitCode.ERROR);
    return;
  }

  try {
    const config = await loadConfigWithOverrides({ ...globalOpts, ...options });
    const context = await createExecutionContext(config, Library.load);

    const result = await executeDuplicates(
      {
        ...(by.length > 0 && { by }),
        ...(options.includeResolved !== undefined && { includeResolved: options.includeResolved }),
      },
      context
    );

    if (asJson) {
      process.stdout.write(`${JSON.stringify(formatDuplicatesJsonOutput(result), null, 2)}\n`);
      setExitCode(ExitCode.SUCCESS);
      return;
    }

    process.stdout.write(`${formatDuplicatesOutput(result)}\n`);

    if (options.fix) {
      await runFix(result, context);
    }

    setExitCode(ExitCode.SUCCESS);
  } catch (error) {
    process.stderr.write(`Error: ${error instanceof Error ? error.message : String(error)}\n`);
    setExitCode(ExitCode.INTERNAL_ERROR);
  }
}
