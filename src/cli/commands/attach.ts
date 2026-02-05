/**
 * Attach CLI commands: open, add, list, get, detach, sync
 *
 * Uses ILibrary interface for unified operations across local and server modes.
 */

import path from "node:path";
import type { Config } from "../../config/schema.js";
import type { IdentifierType } from "../../core/library-interface.js";
import { Library } from "../../core/library.js";
import { generateFilename } from "../../features/attachments/filename.js";
import { type AttachmentFile, RESERVED_ROLES } from "../../features/attachments/types.js";
import {
  type AddAttachmentResult,
  type DetachAttachmentResult,
  type GetAttachmentResult,
  type ListAttachmentsResult,
  type OpenAttachmentResult,
  type AddAttachmentOptions as OperationAddOptions,
  type DetachAttachmentOptions as OperationDetachOptions,
  type GetAttachmentOptions as OperationGetOptions,
  type ListAttachmentsOptions as OperationListOptions,
  type OpenAttachmentOptions as OperationOpenOptions,
  type SyncAttachmentOptions as OperationSyncOptions,
  type SyncAttachmentResult,
  addAttachment,
  detachAttachment,
  getAttachment,
  listAttachments,
  openAttachment,
  syncAttachments,
} from "../../features/operations/attachments/index.js";
import {
  type InferredFile,
  suggestRoleFromContext,
} from "../../features/operations/attachments/sync.js";
import { type ExecutionContext, createExecutionContext } from "../execution-context.js";
import {
  ExitCode,
  isTTY,
  loadConfigWithOverrides,
  readChoice,
  readConfirmation,
  readIdentifierFromStdin,
  setExitCode,
} from "../helpers.js";

// ============================================================================
// Options interfaces
// ============================================================================

/**
 * Options for attach open command
 */
export interface AttachOpenOptions {
  identifier: string;
  filename?: string;
  role?: string;
  print?: boolean;
  noSync?: boolean;
  idType?: IdentifierType;
  attachmentsDirectory: string;
}

/**
 * Options for attach add command
 */
export interface AttachAddOptions {
  identifier: string;
  filePath: string;
  role: string;
  label?: string;
  move?: boolean;
  force?: boolean;
  idType?: IdentifierType;
  attachmentsDirectory: string;
}

/**
 * Options for attach list command
 */
export interface AttachListOptions {
  identifier: string;
  role?: string;
  idType?: IdentifierType;
  attachmentsDirectory: string;
}

/**
 * Options for attach get command
 */
export interface AttachGetOptions {
  identifier: string;
  filename?: string;
  role?: string;
  stdout?: boolean;
  idType?: IdentifierType;
  attachmentsDirectory: string;
}

/**
 * Options for attach detach command
 */
export interface AttachDetachOptions {
  identifier: string;
  filename?: string;
  role?: string;
  all?: boolean;
  removeFiles?: boolean;
  idType?: IdentifierType;
  attachmentsDirectory: string;
}

/**
 * Options for attach sync command
 */
export interface AttachSyncOptions {
  identifier: string;
  yes?: boolean;
  fix?: boolean;
  idType?: IdentifierType;
  attachmentsDirectory: string;
  roleOverrides?: Record<string, { role: string; label?: string }>;
  /** Skip file renaming (used in Step 6) */
  noRename?: boolean;
}

// Re-export result types
export type {
  AddAttachmentResult,
  DetachAttachmentResult,
  GetAttachmentResult,
  ListAttachmentsResult,
  OpenAttachmentResult,
  SyncAttachmentResult,
};

// ============================================================================
// Execute functions
// ============================================================================

/**
 * Execute attach open command
 */
export async function executeAttachOpen(
  options: AttachOpenOptions,
  context: ExecutionContext
): Promise<OpenAttachmentResult> {
  const operationOptions: OperationOpenOptions = {
    identifier: options.identifier,
    attachmentsDirectory: options.attachmentsDirectory,
    ...(options.filename !== undefined && { filename: options.filename }),
    ...(options.role !== undefined && { role: options.role }),
    ...(options.print !== undefined && { print: options.print }),
    ...(options.idType !== undefined && { idType: options.idType }),
  };

  return openAttachment(context.library, operationOptions);
}

/**
 * Execute attach add command
 */
export async function executeAttachAdd(
  options: AttachAddOptions,
  context: ExecutionContext
): Promise<AddAttachmentResult> {
  const operationOptions: OperationAddOptions = {
    identifier: options.identifier,
    filePath: options.filePath,
    role: options.role,
    attachmentsDirectory: options.attachmentsDirectory,
    ...(options.label !== undefined && { label: options.label }),
    ...(options.move !== undefined && { move: options.move }),
    ...(options.force !== undefined && { force: options.force }),
    ...(options.idType !== undefined && { idType: options.idType }),
  };

  return addAttachment(context.library, operationOptions);
}

/**
 * Execute attach list command
 */
export async function executeAttachList(
  options: AttachListOptions,
  context: ExecutionContext
): Promise<ListAttachmentsResult> {
  const operationOptions: OperationListOptions = {
    identifier: options.identifier,
    attachmentsDirectory: options.attachmentsDirectory,
    ...(options.role !== undefined && { role: options.role }),
    ...(options.idType !== undefined && { idType: options.idType }),
  };

  return listAttachments(context.library, operationOptions);
}

/**
 * Execute attach get command
 */
export async function executeAttachGet(
  options: AttachGetOptions,
  context: ExecutionContext
): Promise<GetAttachmentResult> {
  const operationOptions: OperationGetOptions = {
    identifier: options.identifier,
    attachmentsDirectory: options.attachmentsDirectory,
    ...(options.filename !== undefined && { filename: options.filename }),
    ...(options.role !== undefined && { role: options.role }),
    ...(options.stdout !== undefined && { stdout: options.stdout }),
    ...(options.idType !== undefined && { idType: options.idType }),
  };

  return getAttachment(context.library, operationOptions);
}

/**
 * Execute attach detach command
 */
export async function executeAttachDetach(
  options: AttachDetachOptions,
  context: ExecutionContext
): Promise<DetachAttachmentResult> {
  const operationOptions: OperationDetachOptions = {
    identifier: options.identifier,
    attachmentsDirectory: options.attachmentsDirectory,
    ...(options.filename !== undefined && { filename: options.filename }),
    ...(options.role !== undefined && { role: options.role }),
    ...(options.all !== undefined && { all: options.all }),
    ...(options.removeFiles !== undefined && { removeFiles: options.removeFiles }),
    ...(options.idType !== undefined && { idType: options.idType }),
  };

  return detachAttachment(context.library, operationOptions);
}

/**
 * Execute attach sync command
 */
export async function executeAttachSync(
  options: AttachSyncOptions,
  context: ExecutionContext
): Promise<SyncAttachmentResult> {
  const operationOptions: OperationSyncOptions = {
    identifier: options.identifier,
    attachmentsDirectory: options.attachmentsDirectory,
    ...(options.yes !== undefined && { yes: options.yes }),
    ...(options.fix !== undefined && { fix: options.fix }),
    ...(options.idType !== undefined && { idType: options.idType }),
    ...(options.roleOverrides !== undefined && { roleOverrides: options.roleOverrides }),
  };

  return syncAttachments(context.library, operationOptions);
}

// ============================================================================
// Output formatting functions
// ============================================================================

/**
 * Format attach open output
 */
export function formatAttachOpenOutput(result: OpenAttachmentResult): string {
  if (!result.success) {
    return `Error: ${result.error}`;
  }

  if (result.directoryCreated) {
    return `Created and opened: ${result.path}`;
  }

  return `Opened: ${result.path}`;
}

/**
 * Format attach add output
 */
export function formatAttachAddOutput(result: AddAttachmentResult): string {
  if (result.requiresConfirmation) {
    return `File already exists: ${result.existingFile}\nUse --force to overwrite.`;
  }

  if (!result.success) {
    return `Error: ${result.error}`;
  }

  if (result.overwritten) {
    return `Added (overwritten): ${result.filename}`;
  }

  return `Added: ${result.filename}`;
}

/**
 * Format attach list output
 */
export function formatAttachListOutput(result: ListAttachmentsResult, identifier: string): string {
  if (!result.success) {
    return `Error: ${result.error}`;
  }

  if (result.files.length === 0) {
    return `No attachments for reference: ${identifier}`;
  }

  // Group files by role
  const grouped = new Map<string, AttachmentFile[]>();
  for (const file of result.files) {
    const existing = grouped.get(file.role) ?? [];
    existing.push(file);
    grouped.set(file.role, existing);
  }

  const lines: string[] = [];
  lines.push(`Attachments for ${identifier} (${result.directory}/):`);
  lines.push("");

  for (const [role, files] of grouped) {
    lines.push(`${role}:`);
    for (const file of files) {
      if (file.label) {
        lines.push(`  ${file.filename} - "${file.label}"`);
      } else {
        lines.push(`  ${file.filename}`);
      }
    }
    lines.push("");
  }

  return lines.join("\n").trimEnd();
}

/**
 * Format attach get output
 */
export function formatAttachGetOutput(result: GetAttachmentResult): string {
  if (!result.success) {
    return `Error: ${result.error}`;
  }

  if (result.content) {
    return result.content.toString();
  }

  return result.path ?? "";
}

/**
 * Format attach detach output
 */
export function formatAttachDetachOutput(result: DetachAttachmentResult): string {
  if (!result.success) {
    return `Error: ${result.error}`;
  }

  const lines: string[] = [];
  for (const filename of result.detached) {
    if (result.deleted.includes(filename)) {
      lines.push(`Detached and deleted: ${filename}`);
    } else {
      lines.push(`Detached: ${filename}`);
    }
  }

  if (result.directoryDeleted) {
    lines.push("Directory removed.");
  }

  return lines.join("\n");
}

/**
 * Helper function to pluralize
 */
function pluralize(count: number, singular: string): string {
  return count > 1 ? `${singular}s` : singular;
}

/**
 * Format new files section
 */
function formatNewFilesSection(result: SyncAttachmentResult, lines: string[]): void {
  const count = result.newFiles.length;
  if (count === 0) return;

  const verb = result.applied ? "Added" : "Found";
  const suffix = result.applied ? "" : " new";
  lines.push(`${verb} ${count}${suffix} ${pluralize(count, "file")}:`);

  for (const file of result.newFiles) {
    const labelPart = file.label ? `, label: "${file.label}"` : "";
    lines.push(`  ${file.filename} → role: ${file.role}${labelPart}`);
  }
  lines.push("");
}

/**
 * Format missing files section
 */
function formatMissingFilesSection(result: SyncAttachmentResult, lines: string[]): void {
  const count = result.missingFiles.length;
  if (count === 0) return;

  const header = result.applied
    ? `Removed ${count} missing ${pluralize(count, "file")} from metadata:`
    : `Missing ${count} ${pluralize(count, "file")} (in metadata but not on disk):`;
  lines.push(header);

  for (const filename of result.missingFiles) {
    lines.push(`  ${filename}`);
  }
  lines.push("");
}

// ============================================================================
// Role suggestion and rename helpers
// ============================================================================

/**
 * Build role overrides from context-based suggestions for files inferred as "other".
 * Pure function: uses suggestRoleFromContext to suggest roles.
 */
export function buildRoleOverridesFromSuggestions(
  newFiles: InferredFile[]
): Record<string, { role: string; label?: string }> {
  const overrides: Record<string, { role: string; label?: string }> = {};
  for (const file of newFiles) {
    if (file.role !== "other") continue;
    const suggested = suggestRoleFromContext(file.filename, newFiles);
    if (suggested) {
      overrides[file.filename] = { role: suggested };
    }
  }
  return overrides;
}

/**
 * Generate a rename map for files whose names don't match the naming convention
 * after role override. Key: current filename, Value: new filename.
 */
export function generateRenameMap(
  newFiles: InferredFile[],
  overrides: Record<string, { role: string; label?: string }>
): Record<string, string> {
  const renames: Record<string, string> = {};
  for (const file of newFiles) {
    const override = overrides[file.filename];
    if (!override) continue;
    const ext = path.extname(file.filename);
    const extWithoutDot = ext.startsWith(".") ? ext.slice(1) : ext;
    const baseName = ext ? file.filename.slice(0, -ext.length) : file.filename;
    // Check if filename already matches the canonical form (role.ext or role-label.ext).
    // If it does, no rename is needed.
    const canonical = generateFilename(override.role, extWithoutDot, override.label);
    if (canonical !== file.filename) {
      // For files with a label, the canonical name is the target.
      // For files without a label, preserve the original basename with a role prefix.
      const newName = override.label ? canonical : `${override.role}-${baseName}${ext}`;
      renames[file.filename] = newName;
    }
  }
  return renames;
}

/**
 * Format a single file entry in the suggestion preview.
 */
function formatSuggestedFileEntry(
  file: InferredFile,
  suggestions: Record<string, { role: string; label?: string }>,
  renames: Record<string, string>,
  lines: string[]
): void {
  lines.push(`    ${file.filename}`);
  const suggestion = suggestions[file.filename];
  if (suggestion) {
    lines.push(`      role: ${suggestion.role} (suggested, inferred: ${file.role})`);
  } else {
    const labelPart = file.label ? `, label: "${file.label}"` : "";
    lines.push(`      role: ${file.role}${labelPart}`);
  }
  const rename = renames[file.filename];
  if (rename) {
    lines.push(`      rename: ${rename}`);
  }
}

/**
 * Format sync preview with role suggestions and rename previews for non-TTY output.
 */
export function formatSyncPreviewWithSuggestions(
  result: SyncAttachmentResult,
  suggestions: Record<string, { role: string; label?: string }>,
  renames: Record<string, string>,
  identifier: string
): string {
  if (!result.success) {
    return `Error: ${result.error}`;
  }

  const hasNewFiles = result.newFiles.length > 0;
  const hasMissingFiles = result.missingFiles.length > 0;
  const hasRenames = Object.keys(renames).length > 0;

  if (!hasNewFiles && !hasMissingFiles) {
    return "Already in sync.";
  }

  const lines: string[] = [];
  lines.push(`Sync preview for ${identifier}:`);

  if (hasNewFiles) {
    lines.push("  New files:");
    for (const file of result.newFiles) {
      formatSuggestedFileEntry(file, suggestions, renames, lines);
    }
    lines.push("");
  }

  formatMissingFilesSection(result, lines);

  lines.push(`To apply: ref attach sync ${identifier} --yes`);
  if (hasRenames) {
    lines.push(`To apply without renaming: ref attach sync ${identifier} --yes --no-rename`);
  }

  return lines.join("\n").trimEnd();
}

/**
 * Format attach sync output
 */
export function formatAttachSyncOutput(result: SyncAttachmentResult): string {
  if (!result.success) {
    return `Error: ${result.error}`;
  }

  const hasNewFiles = result.newFiles.length > 0;
  const hasMissingFiles = result.missingFiles.length > 0;

  if (!hasNewFiles && !hasMissingFiles) {
    return "Already in sync.";
  }

  const lines: string[] = [];
  formatNewFilesSection(result, lines);
  formatMissingFilesSection(result, lines);

  if (result.applied) {
    lines.push("Changes applied.");
  } else {
    // Show clear dry-run message for non-TTY mode
    lines.push("");
    lines.push("(dry-run: no changes made)");
    if (hasNewFiles) {
      lines.push("Run with --yes to add new files");
    }
    if (hasMissingFiles) {
      lines.push("Run with --fix to remove missing files from metadata");
    }
  }

  return lines.join("\n").trimEnd();
}

/**
 * Format sync preview for TTY interactive mode (no dry-run hints)
 */
function formatSyncPreview(result: SyncAttachmentResult): string {
  if (!result.success) {
    return `Error: ${result.error}`;
  }

  const lines: string[] = [];
  formatNewFilesSection(result, lines);
  formatMissingFilesSection(result, lines);

  return lines.join("\n").trimEnd();
}

/**
 * Get exit code for attach command result
 */
export function getAttachExitCode(
  result:
    | OpenAttachmentResult
    | AddAttachmentResult
    | ListAttachmentsResult
    | GetAttachmentResult
    | DetachAttachmentResult
    | SyncAttachmentResult
): number {
  return result.success ? 0 : 1;
}

// ============================================================================
// Interactive mode and action handlers
// ============================================================================

/**
 * Execute interactive selection for attach commands (single-select).
 */
async function executeInteractiveSelect(
  context: ExecutionContext,
  config: Config
): Promise<string> {
  const { withAlternateScreen } = await import("../../features/interactive/alternate-screen.js");
  const { selectReferencesOrExit } = await import("../../features/interactive/reference-select.js");

  const allReferences = await context.library.getAll();

  // Run TUI session in alternate screen to preserve terminal scrollback
  const identifiers = await withAlternateScreen(() =>
    selectReferencesOrExit(allReferences, { multiSelect: false }, config.cli.tui)
  );

  // Type assertion is safe: selectReferencesOrExit guarantees non-empty array
  return identifiers[0] as string;
}

/**
 * Resolve identifier from argument, stdin, or interactive selection
 */
async function resolveIdentifier(
  identifierArg: string | undefined,
  context: ExecutionContext,
  config: Config
): Promise<string> {
  if (identifierArg) {
    return identifierArg;
  }

  if (isTTY()) {
    return executeInteractiveSelect(context, config);
  }

  const stdinId = await readIdentifierFromStdin();
  if (!stdinId) {
    process.stderr.write(
      "Error: No identifier provided. Provide an ID, pipe one via stdin, or run interactively in a TTY.\n"
    );
    setExitCode(ExitCode.ERROR);
    return "";
  }
  return stdinId;
}

/**
 * Options for attach open action
 */
export interface AttachOpenActionOptions {
  print?: boolean;
  role?: string;
  sync?: boolean;
  uuid?: boolean;
}

/**
 * Display naming convention for interactive mode
 */
function displayNamingConvention(identifier: string, dirPath: string): void {
  process.stderr.write(`\nOpening attachments directory for ${identifier}...\n\n`);
  process.stderr.write("File naming convention:\n");
  process.stderr.write("  fulltext.pdf / fulltext.md    - Paper body\n");
  process.stderr.write("  supplement-{label}.ext        - Supplementary materials\n");
  process.stderr.write("  notes-{label}.ext             - Your notes\n");
  process.stderr.write("  draft-{label}.ext             - Draft versions\n");
  process.stderr.write("  {custom}-{label}.ext          - Custom role\n\n");
  process.stderr.write(`Directory: ${dirPath}/\n\n`);
}

/**
 * Wait for user to press Enter
 */
async function waitForEnter(): Promise<void> {
  return new Promise((resolve) => {
    process.stderr.write("Press Enter when done editing...");
    process.stdin.setRawMode(true);
    process.stdin.resume();

    // Use a timer to keep the event loop alive.
    // In Node.js 22+, stdin.ref() alone may not be sufficient after enquirer prompts
    // complete, as enquirer may leave stdin in a state where ref() doesn't work as expected.
    const keepAliveTimer = setInterval(() => {
      // No-op: timer exists solely to keep event loop active
    }, 60000);

    // Also call ref() for belt-and-suspenders approach
    if (typeof process.stdin.ref === "function") {
      process.stdin.ref();
    }

    process.stdin.once("data", () => {
      clearInterval(keepAliveTimer);
      process.stdin.setRawMode(false);
      process.stdin.pause();
      process.stderr.write("\n\n");
      resolve();
    });
  });
}

/**
 * Sync new files with interactive role assignment prompt.
 * Shared logic for both `attach open` and `attach sync` interactive flows.
 *
 * Flow: dry-run → prompt for unknown roles → show preview → confirm → apply
 */
export async function syncNewFilesWithRolePrompt(
  identifier: string,
  attachmentsDirectory: string,
  idType: "uuid" | undefined,
  context: ExecutionContext
): Promise<void> {
  // Dry-run to discover new files
  const dryRunResult = await executeAttachSync(
    {
      identifier,
      attachmentsDirectory,
      ...(idType && { idType }),
    },
    context
  );

  if (!dryRunResult.success) {
    process.stderr.write(`Sync error: ${dryRunResult.error}\n`);
    return;
  }

  if (dryRunResult.newFiles.length === 0) {
    process.stderr.write("No new files detected.\n");
    return;
  }

  // Prompt for role assignment on unknown files
  const roleOverrides = await promptForUnknownRoles(dryRunResult.newFiles);

  // Build preview with overrides applied
  const previewFiles = dryRunResult.newFiles.map((file) => {
    const override = roleOverrides[file.filename];
    if (override) {
      return { ...file, role: override.role, ...(override.label && { label: override.label }) };
    }
    return file;
  });

  // Show preview
  process.stderr.write("\nScanning directory...\n\n");
  process.stderr.write(
    `Found ${previewFiles.length} new file${previewFiles.length > 1 ? "s" : ""}:\n`
  );
  for (const file of previewFiles) {
    const labelPart = file.label ? `, label: "${file.label}"` : "";
    process.stderr.write(`  \u2713 ${file.filename} \u2192 role: ${file.role}${labelPart}\n`);
  }

  // Confirm
  const shouldApply = await readConfirmation("\nAdd new files to metadata?");
  if (!shouldApply) {
    process.stderr.write("No changes applied.\n");
    return;
  }

  // Apply with overrides
  const hasOverrides = Object.keys(roleOverrides).length > 0;
  const applyResult = await executeAttachSync(
    {
      identifier,
      attachmentsDirectory,
      yes: true,
      ...(idType && { idType }),
      ...(hasOverrides && { roleOverrides }),
    },
    context
  );

  if (applyResult.success) {
    process.stderr.write(`\nUpdated metadata for ${identifier}.\n`);
  } else {
    process.stderr.write(`Sync error: ${applyResult.error}\n`);
  }
}

/**
 * Run interactive mode: show convention, wait for Enter, sync with role prompt
 */
export async function runInteractiveMode(
  identifier: string,
  dirPath: string,
  attachmentsDirectory: string,
  idType: "uuid" | undefined,
  context: ExecutionContext
): Promise<void> {
  displayNamingConvention(identifier, dirPath);
  await waitForEnter();
  await syncNewFilesWithRolePrompt(identifier, attachmentsDirectory, idType, context);
}

/**
 * Build open options from action options
 */
function buildOpenOptions(
  identifier: string,
  filenameArg: string | undefined,
  options: AttachOpenActionOptions,
  attachmentsDirectory: string
): AttachOpenOptions {
  return {
    identifier,
    attachmentsDirectory,
    ...(filenameArg && { filename: filenameArg }),
    ...(options.print && { print: options.print }),
    ...(options.role && { role: options.role }),
    ...(options.uuid && { idType: "uuid" as const }),
  };
}

/**
 * Handle 'attach open' command action.
 */
export async function handleAttachOpenAction(
  identifierArg: string | undefined,
  filenameArg: string | undefined,
  options: AttachOpenActionOptions,
  globalOpts: Record<string, unknown>
): Promise<void> {
  try {
    const config = await loadConfigWithOverrides({ ...globalOpts, ...options });
    const context = await createExecutionContext(config, Library.load);
    const identifier = await resolveIdentifier(identifierArg, context, config);

    const isDirectoryMode = !filenameArg && !options.role;
    const shouldUseInteractive =
      isTTY() && isDirectoryMode && !options.print && options.sync !== false;
    const openOptions = buildOpenOptions(
      identifier,
      filenameArg,
      options,
      config.attachments.directory
    );
    const result = await executeAttachOpen(openOptions, context);

    if (!result.success) {
      process.stderr.write(`Error: ${result.error}\n`);
      setExitCode(ExitCode.ERROR);
      return;
    }

    if (options.print) {
      process.stdout.write(`${result.path}\n`);
      setExitCode(ExitCode.SUCCESS);
      return;
    }

    if (shouldUseInteractive) {
      await runInteractiveMode(
        identifier,
        result.path ?? "",
        config.attachments.directory,
        options.uuid ? "uuid" : undefined,
        context
      );
    } else {
      process.stderr.write(`${formatAttachOpenOutput(result)}\n`);
    }

    setExitCode(ExitCode.SUCCESS);
  } catch (error) {
    process.stderr.write(`Error: ${error instanceof Error ? error.message : String(error)}\n`);
    setExitCode(ExitCode.INTERNAL_ERROR);
  }
}

/**
 * Options for attach add action
 */
export interface AttachAddActionOptions {
  role: string;
  label?: string;
  move?: boolean;
  force?: boolean;
  uuid?: boolean;
}

/**
 * Handle 'attach add' command action.
 */
export async function handleAttachAddAction(
  identifierArg: string | undefined,
  filePathArg: string,
  options: AttachAddActionOptions,
  globalOpts: Record<string, unknown>
): Promise<void> {
  try {
    const config = await loadConfigWithOverrides({ ...globalOpts, ...options });
    const context = await createExecutionContext(config, Library.load);

    const identifier = await resolveIdentifier(identifierArg, context, config);

    const addOptions: AttachAddOptions = {
      identifier,
      filePath: filePathArg,
      role: options.role,
      attachmentsDirectory: config.attachments.directory,
      ...(options.label && { label: options.label }),
      ...(options.move && { move: options.move }),
      ...(options.force && { force: options.force }),
      ...(options.uuid && { idType: "uuid" as const }),
    };

    const result = await executeAttachAdd(addOptions, context);
    const output = formatAttachAddOutput(result);
    process.stderr.write(`${output}\n`);
    setExitCode(getAttachExitCode(result));
  } catch (error) {
    process.stderr.write(`Error: ${error instanceof Error ? error.message : String(error)}\n`);
    setExitCode(ExitCode.INTERNAL_ERROR);
  }
}

/**
 * Options for attach list action
 */
export interface AttachListActionOptions {
  role?: string;
  uuid?: boolean;
}

/**
 * Handle 'attach list' command action.
 */
export async function handleAttachListAction(
  identifierArg: string | undefined,
  options: AttachListActionOptions,
  globalOpts: Record<string, unknown>
): Promise<void> {
  try {
    const config = await loadConfigWithOverrides({ ...globalOpts, ...options });
    const context = await createExecutionContext(config, Library.load);

    const identifier = await resolveIdentifier(identifierArg, context, config);

    const listOptions: AttachListOptions = {
      identifier,
      attachmentsDirectory: config.attachments.directory,
      ...(options.role && { role: options.role }),
      ...(options.uuid && { idType: "uuid" as const }),
    };

    const result = await executeAttachList(listOptions, context);
    const output = formatAttachListOutput(result, identifier);
    process.stdout.write(`${output}\n`);
    setExitCode(getAttachExitCode(result));
  } catch (error) {
    process.stderr.write(`Error: ${error instanceof Error ? error.message : String(error)}\n`);
    setExitCode(ExitCode.INTERNAL_ERROR);
  }
}

/**
 * Options for attach get action
 */
export interface AttachGetActionOptions {
  role?: string;
  stdout?: boolean;
  uuid?: boolean;
}

/**
 * Handle 'attach get' command action.
 */
export async function handleAttachGetAction(
  identifierArg: string | undefined,
  filenameArg: string | undefined,
  options: AttachGetActionOptions,
  globalOpts: Record<string, unknown>
): Promise<void> {
  try {
    const config = await loadConfigWithOverrides({ ...globalOpts, ...options });
    const context = await createExecutionContext(config, Library.load);

    const identifier = await resolveIdentifier(identifierArg, context, config);

    const getOptions: AttachGetOptions = {
      identifier,
      attachmentsDirectory: config.attachments.directory,
      ...(filenameArg && { filename: filenameArg }),
      ...(options.role && { role: options.role }),
      ...(options.stdout && { stdout: options.stdout }),
      ...(options.uuid && { idType: "uuid" as const }),
    };

    const result = await executeAttachGet(getOptions, context);

    if (result.success && result.content && options.stdout) {
      process.stdout.write(result.content);
    } else if (result.success) {
      process.stdout.write(`${result.path}\n`);
    } else {
      process.stderr.write(`Error: ${result.error}\n`);
    }

    setExitCode(getAttachExitCode(result));
  } catch (error) {
    process.stderr.write(`Error: ${error instanceof Error ? error.message : String(error)}\n`);
    setExitCode(ExitCode.INTERNAL_ERROR);
  }
}

/**
 * Options for attach detach action
 */
export interface AttachDetachActionOptions {
  role?: string;
  all?: boolean;
  removeFiles?: boolean;
  uuid?: boolean;
}

/**
 * Handle 'attach detach' command action.
 */
export async function handleAttachDetachAction(
  identifierArg: string | undefined,
  filenameArg: string | undefined,
  options: AttachDetachActionOptions,
  globalOpts: Record<string, unknown>
): Promise<void> {
  try {
    const config = await loadConfigWithOverrides({ ...globalOpts, ...options });
    const context = await createExecutionContext(config, Library.load);

    const identifier = await resolveIdentifier(identifierArg, context, config);

    const detachOptions: AttachDetachOptions = {
      identifier,
      attachmentsDirectory: config.attachments.directory,
      ...(filenameArg && { filename: filenameArg }),
      ...(options.role && { role: options.role }),
      ...(options.all && { all: options.all }),
      ...(options.removeFiles && { removeFiles: options.removeFiles }),
      ...(options.uuid && { idType: "uuid" as const }),
    };

    const result = await executeAttachDetach(detachOptions, context);
    const output = formatAttachDetachOutput(result);
    process.stderr.write(`${output}\n`);
    setExitCode(getAttachExitCode(result));
  } catch (error) {
    process.stderr.write(`Error: ${error instanceof Error ? error.message : String(error)}\n`);
    setExitCode(ExitCode.INTERNAL_ERROR);
  }
}

/**
 * Options for attach sync action
 */
export interface AttachSyncActionOptions {
  yes?: boolean;
  fix?: boolean;
  uuid?: boolean;
  /** Skip file renaming (used in Step 6) */
  noRename?: boolean;
}

/**
 * Prompt for role assignment on files with role "other" (TTY only).
 * Returns a roleOverrides record for files the user chose to reclassify.
 */
async function promptForUnknownRoles(
  newFiles: InferredFile[]
): Promise<Record<string, { role: string; label?: string }>> {
  const overrides: Record<string, { role: string; label?: string }> = {};
  const unknownFiles = newFiles.filter((f) => f.role === "other");

  if (unknownFiles.length === 0) return overrides;

  process.stderr.write("\nSome files could not be classified by filename:\n");

  const roleChoices = [
    ...RESERVED_ROLES.map((r) => ({ label: r, value: r })),
    { label: "other (keep as-is)", value: "other" },
  ];

  for (const file of unknownFiles) {
    const suggested = suggestRoleFromContext(file.filename, newFiles);
    const defaultIndex = suggested
      ? roleChoices.findIndex((c) => c.value === suggested)
      : undefined;

    const selectedRole = await readChoice(
      `\nRole for "${file.filename}"?`,
      roleChoices,
      defaultIndex !== undefined && defaultIndex >= 0 ? defaultIndex : undefined
    );

    if (selectedRole !== "other") {
      overrides[file.filename] = { role: selectedRole };
    }
  }

  return overrides;
}

/**
 * Run interactive sync mode: dry-run, confirm, then apply.
 * Similar pattern to runInteractiveMode for attach open.
 */
async function runInteractiveSyncMode(
  identifier: string,
  attachmentsDirectory: string,
  idType: "uuid" | undefined,
  context: ExecutionContext
): Promise<void> {
  // Run dry-run first
  const dryRunOptions: AttachSyncOptions = {
    identifier,
    attachmentsDirectory,
    ...(idType && { idType }),
  };
  const dryRunResult = await executeAttachSync(dryRunOptions, context);

  // Check if there are any changes to apply
  const hasNewFiles = dryRunResult.newFiles.length > 0;
  const hasMissingFiles = dryRunResult.missingFiles.length > 0;

  if (!dryRunResult.success || (!hasNewFiles && !hasMissingFiles)) {
    process.stderr.write(`${formatAttachSyncOutput(dryRunResult)}\n`);
    return;
  }

  // Prompt for role assignment on unknown files (TTY)
  const roleOverrides = await promptForUnknownRoles(dryRunResult.newFiles);

  // Build preview with overrides applied
  const previewFiles = dryRunResult.newFiles.map((file) => {
    const override = roleOverrides[file.filename];
    if (override) {
      return { ...file, role: override.role, ...(override.label && { label: override.label }) };
    }
    return file;
  });
  const previewResult = { ...dryRunResult, newFiles: previewFiles };

  // Show preview
  process.stderr.write(`${formatSyncPreview(previewResult)}\n`);

  const shouldApplyNew = hasNewFiles && (await readConfirmation("Add new files to metadata?"));
  const shouldApplyFix =
    hasMissingFiles && (await readConfirmation("Remove missing files from metadata?"));

  if (!shouldApplyNew && !shouldApplyFix) {
    process.stderr.write("No changes applied.\n");
    return;
  }

  // Apply changes
  const applyOptions: AttachSyncOptions = {
    identifier,
    attachmentsDirectory,
    ...(shouldApplyNew && { yes: true }),
    ...(shouldApplyFix && { fix: true }),
    ...(idType && { idType }),
    ...(shouldApplyNew && Object.keys(roleOverrides).length > 0 && { roleOverrides }),
  };
  const result = await executeAttachSync(applyOptions, context);
  process.stderr.write(`${formatAttachSyncOutput(result)}\n`);
}

/**
 * Handle non-TTY sync with --yes: compute suggestions and apply.
 */
async function handleSyncApplyWithSuggestions(
  identifier: string,
  attachmentsDirectory: string,
  idType: "uuid" | undefined,
  context: ExecutionContext,
  fix?: boolean
): Promise<void> {
  const dryRunOptions: AttachSyncOptions = {
    identifier,
    attachmentsDirectory,
    ...(idType && { idType }),
  };
  const dryRunResult = await executeAttachSync(dryRunOptions, context);

  if (!dryRunResult.success) {
    process.stderr.write(`${formatAttachSyncOutput(dryRunResult)}\n`);
    setExitCode(getAttachExitCode(dryRunResult));
    return;
  }

  const suggestions = buildRoleOverridesFromSuggestions(dryRunResult.newFiles);

  const applyOptions: AttachSyncOptions = {
    identifier,
    attachmentsDirectory,
    yes: true,
    ...(fix && { fix: true }),
    ...(idType && { idType }),
    ...(Object.keys(suggestions).length > 0 && { roleOverrides: suggestions }),
  };
  const result = await executeAttachSync(applyOptions, context);
  process.stderr.write(`${formatAttachSyncOutput(result)}\n`);
  setExitCode(getAttachExitCode(result));
}

/**
 * Handle non-TTY dry-run: show preview with suggestions and rename previews.
 */
async function handleSyncDryRunPreview(
  identifier: string,
  attachmentsDirectory: string,
  idType: "uuid" | undefined,
  context: ExecutionContext
): Promise<void> {
  const dryRunOptions: AttachSyncOptions = {
    identifier,
    attachmentsDirectory,
    ...(idType && { idType }),
  };
  const dryRunResult = await executeAttachSync(dryRunOptions, context);

  if (!dryRunResult.success) {
    process.stderr.write(`${formatAttachSyncOutput(dryRunResult)}\n`);
    setExitCode(getAttachExitCode(dryRunResult));
    return;
  }

  const suggestions = buildRoleOverridesFromSuggestions(dryRunResult.newFiles);
  const renames = generateRenameMap(dryRunResult.newFiles, suggestions);

  process.stderr.write(
    `${formatSyncPreviewWithSuggestions(dryRunResult, suggestions, renames, identifier)}\n`
  );
  setExitCode(getAttachExitCode(dryRunResult));
}

/**
 * Handle 'attach sync' command action.
 */
export async function handleAttachSyncAction(
  identifierArg: string | undefined,
  options: AttachSyncActionOptions,
  globalOpts: Record<string, unknown>
): Promise<void> {
  try {
    const config = await loadConfigWithOverrides({ ...globalOpts, ...options });
    const context = await createExecutionContext(config, Library.load);
    const identifier = await resolveIdentifier(identifierArg, context, config);
    const attachmentsDirectory = config.attachments.directory;
    const idType = options.uuid ? ("uuid" as const) : undefined;

    // TTY interactive mode (no flags)
    if (isTTY() && !options.yes && !options.fix) {
      await runInteractiveSyncMode(identifier, attachmentsDirectory, idType, context);
      setExitCode(ExitCode.SUCCESS);
      return;
    }

    // --yes (with or without --fix): apply with suggestions
    if (options.yes) {
      await handleSyncApplyWithSuggestions(
        identifier,
        attachmentsDirectory,
        idType,
        context,
        options.fix
      );
      return;
    }

    // Non-TTY dry-run (no flags): show preview with suggestions
    if (!options.fix) {
      await handleSyncDryRunPreview(identifier, attachmentsDirectory, idType, context);
      return;
    }

    // Direct mode (--fix only): execute sync with provided flags
    const syncOptions: AttachSyncOptions = {
      identifier,
      attachmentsDirectory,
      fix: true,
      ...(idType && { idType }),
    };
    const result = await executeAttachSync(syncOptions, context);
    process.stderr.write(`${formatAttachSyncOutput(result)}\n`);
    setExitCode(getAttachExitCode(result));
  } catch (error) {
    process.stderr.write(`Error: ${error instanceof Error ? error.message : String(error)}\n`);
    setExitCode(ExitCode.INTERNAL_ERROR);
  }
}
