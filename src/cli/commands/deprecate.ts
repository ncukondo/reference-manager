import { SUPERSEDED_REASONS, type SupersededReason } from "../../core/csl-json/types.js";
import type { IdentifierType } from "../../core/library-interface.js";
import { Library } from "../../core/library.js";
import { type DeprecateResult, deprecateReference } from "../../features/operations/deprecate.js";
import { type ExecutionContext, createExecutionContext } from "../execution-context.js";
import { ExitCode, loadConfigWithOverrides, setExitCode } from "../helpers.js";

/**
 * Options for the deprecate command.
 */
export interface DeprecateCommandOptions {
  identifier: string;
  /** Successor identifier (`--to`) */
  target?: string;
  reason?: SupersededReason;
  unset?: boolean;
  idType?: IdentifierType;
}

export type DeprecateCommandResult = DeprecateResult;

/**
 * Execute the deprecate command.
 *
 * `deprecateReference` only touches ILibrary methods, so this works unchanged in server mode.
 */
export async function executeDeprecate(
  options: DeprecateCommandOptions,
  context: ExecutionContext
): Promise<DeprecateCommandResult> {
  const { identifier, target, reason, unset = false, idType = "id" } = options;

  return deprecateReference(context.library, {
    identifier,
    idType,
    ...(target !== undefined && { target }),
    ...(reason !== undefined && { reason }),
    unset,
  });
}

/**
 * Validate the option combination before touching the library.
 *
 * @returns An error message, or null when the combination is usable
 */
export function validateDeprecateOptions(options: {
  to?: string | undefined;
  unset?: boolean | undefined;
  reason?: string | undefined;
}): string | null {
  const hasTarget = options.to !== undefined;
  const unset = options.unset === true;

  if (hasTarget && unset) {
    return "Cannot use --to and --unset together.";
  }
  if (!hasTarget && !unset) {
    return "Nothing to do. Use --to <id> to set a successor, or --unset to clear one.";
  }
  if (unset && options.reason !== undefined) {
    return "--reason has no meaning with --unset.";
  }
  if (
    options.reason !== undefined &&
    !(SUPERSEDED_REASONS as readonly string[]).includes(options.reason)
  ) {
    return `Invalid --reason: ${options.reason}. Expected one of: ${SUPERSEDED_REASONS.join(", ")}.`;
  }

  return null;
}

/**
 * Human-readable result line for text output. Written to stderr, like other mutation commands.
 */
export function formatDeprecateOutput(result: DeprecateCommandResult, identifier: string): string {
  if (result.noop) {
    return `${result.item?.id ?? identifier} is not marked as superseded.`;
  }
  if (result.target) {
    const reason = result.item?.custom?.superseded_reason ?? "other";
    return `Marked ${result.item?.id ?? identifier} as superseded by ${result.target.id} (${reason}).`;
  }
  return `Cleared the superseded mark from ${result.item?.id ?? identifier}.`;
}

export interface DeprecateActionOptions {
  to?: string;
  unset?: boolean;
  reason?: string;
  uuid?: boolean;
  output?: string;
  full?: boolean;
  [key: string]: unknown;
}

/**
 * Report a failure that happened before or around the operation itself.
 * In JSON mode the error is the payload, so it goes to stdout like any other result.
 */
function writeDeprecateFailure(message: string, identifier: string, asJson: boolean): void {
  if (asJson) {
    process.stdout.write(
      `${JSON.stringify({ success: false, id: identifier, error: message }, null, 2)}\n`
    );
  } else {
    process.stderr.write(`Error: ${message}\n`);
  }
}

/** Report the outcome of a completed operation. */
async function writeDeprecateResult(
  result: DeprecateCommandResult,
  identifier: string,
  options: DeprecateActionOptions,
  asJson: boolean
): Promise<void> {
  const { describeDeprecateError, formatDeprecateJsonOutput } = await import(
    "../../features/operations/json-output.js"
  );

  if (asJson) {
    const json = formatDeprecateJsonOutput(result, identifier, options.to, {
      full: options.full ?? false,
    });
    process.stdout.write(`${JSON.stringify(json, null, 2)}\n`);
    return;
  }

  if (result.errorType) {
    process.stderr.write(
      `Error: ${describeDeprecateError(result.errorType, identifier, options.to)}\n`
    );
    return;
  }

  process.stderr.write(`${formatDeprecateOutput(result, identifier)}\n`);
}

/**
 * Handle the `deprecate` command.
 */
export async function handleDeprecateAction(
  identifier: string,
  options: DeprecateActionOptions,
  globalOpts: Record<string, unknown>
): Promise<void> {
  const asJson = (options.output ?? "text") === "json";

  const optionError = validateDeprecateOptions(options);
  if (optionError) {
    writeDeprecateFailure(optionError, identifier, asJson);
    setExitCode(ExitCode.ERROR);
    return;
  }

  try {
    const config = await loadConfigWithOverrides({ ...globalOpts, ...options });
    const context = await createExecutionContext(config, Library.load);

    const result = await executeDeprecate(
      {
        identifier,
        ...(options.to !== undefined && { target: options.to }),
        ...(options.reason !== undefined && { reason: options.reason as SupersededReason }),
        unset: options.unset ?? false,
        idType: options.uuid ? "uuid" : "id",
      },
      context
    );

    await writeDeprecateResult(result, identifier, options, asJson);
    setExitCode(result.errorType ? ExitCode.ERROR : ExitCode.SUCCESS);
  } catch (error) {
    writeDeprecateFailure(
      error instanceof Error ? error.message : String(error),
      identifier,
      asJson
    );
    setExitCode(ExitCode.INTERNAL_ERROR);
  }
}
