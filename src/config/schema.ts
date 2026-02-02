/**
 * Configuration schema using Zod
 */

import { z } from "zod";
import { sortFieldSchema, sortOrderSchema } from "../features/pagination/types.js";

/**
 * Log level schema
 */
export const logLevelSchema = z.enum(["silent", "info", "debug"]);

/**
 * TUI (interactive) search configuration schema
 */
export const tuiConfigSchema = z.object({
  limit: z.number().int().nonnegative(),
  debounceMs: z.number().int().nonnegative(),
  clipboardAutoCopy: z.boolean(),
});

/**
 * Edit format schema
 */
export const editFormatSchema = z.enum(["yaml", "json"]);

/**
 * Edit command configuration schema
 */
export const editConfigSchema = z.object({
  defaultFormat: editFormatSchema,
});

/**
 * CLI configuration schema
 */
export const cliConfigSchema = z.object({
  defaultLimit: z.number().int().nonnegative(),
  defaultSort: sortFieldSchema,
  defaultOrder: sortOrderSchema,
  tui: tuiConfigSchema,
  edit: editConfigSchema,
});

/**
 * MCP configuration schema
 */
export const mcpConfigSchema = z.object({
  defaultLimit: z.number().int().nonnegative(),
});

/**
 * Backup configuration schema
 */
export const backupConfigSchema = z.object({
  maxGenerations: z.number().int().positive(),
  maxAgeDays: z.number().int().positive(),
  directory: z.string().min(1),
});

/**
 * File watching configuration schema
 * Note: File watching is always enabled in server mode (HTTP/MCP).
 * CLI mode does not use file watching.
 */
export const watchConfigSchema = z.object({
  debounceMs: z.number().int().nonnegative(),
  pollIntervalMs: z.number().int().positive(),
  retryIntervalMs: z.number().int().positive(),
  maxRetries: z.number().int().nonnegative(),
});

/**
 * Server configuration schema
 */
export const serverConfigSchema = z.object({
  autoStart: z.boolean(),
  autoStopMinutes: z.number().int().nonnegative(),
});

/**
 * Citation format schema
 */
export const citationFormatSchema = z.enum(["text", "html", "rtf"]);

/**
 * Citation key format schema
 */
export const citationKeyFormatSchema = z.enum(["pandoc", "latex"]);

/**
 * Citation configuration schema
 */
export const citationConfigSchema = z.object({
  defaultStyle: z.string(),
  cslDirectory: z.array(z.string()),
  defaultLocale: z.string(),
  defaultFormat: citationFormatSchema,
  defaultKeyFormat: citationKeyFormatSchema,
});

/**
 * PubMed API configuration schema
 */
export const pubmedConfigSchema = z.object({
  email: z.string().optional(),
  apiKey: z.string().optional(),
});

/**
 * Attachments storage configuration schema
 */
export const attachmentsConfigSchema = z.object({
  directory: z.string().min(1),
});

/**
 * Complete configuration schema
 */
export const configSchema = z.object({
  library: z.string().min(1),
  logLevel: logLevelSchema,
  backup: backupConfigSchema,
  watch: watchConfigSchema,
  server: serverConfigSchema,
  citation: citationConfigSchema,
  pubmed: pubmedConfigSchema,
  attachments: attachmentsConfigSchema,
  cli: cliConfigSchema,
  mcp: mcpConfigSchema,
});

/**
 * Partial configuration schema (for TOML files)
 * Supports both camelCase and snake_case field names
 */
export const partialConfigSchema = z
  .object({
    library: z.string().min(1).optional(),
    logLevel: logLevelSchema.optional(),
    log_level: logLevelSchema.optional(), // snake_case support
    backup: z
      .object({
        maxGenerations: z.number().int().positive().optional(),
        max_generations: z.number().int().positive().optional(),
        maxAgeDays: z.number().int().positive().optional(),
        max_age_days: z.number().int().positive().optional(),
        directory: z.string().min(1).optional(),
      })
      .optional(),
    watch: z
      .object({
        debounceMs: z.number().int().nonnegative().optional(),
        debounce_ms: z.number().int().nonnegative().optional(),
        pollIntervalMs: z.number().int().positive().optional(),
        poll_interval_ms: z.number().int().positive().optional(),
        retryIntervalMs: z.number().int().positive().optional(),
        retry_interval_ms: z.number().int().positive().optional(),
        maxRetries: z.number().int().nonnegative().optional(),
        max_retries: z.number().int().nonnegative().optional(),
      })
      .optional(),
    server: z
      .object({
        autoStart: z.boolean().optional(),
        auto_start: z.boolean().optional(),
        autoStopMinutes: z.number().int().nonnegative().optional(),
        auto_stop_minutes: z.number().int().nonnegative().optional(),
      })
      .optional(),
    citation: z
      .object({
        defaultStyle: z.string().optional(),
        default_style: z.string().optional(),
        cslDirectory: z.union([z.string(), z.array(z.string())]).optional(),
        csl_directory: z.union([z.string(), z.array(z.string())]).optional(),
        defaultLocale: z.string().optional(),
        default_locale: z.string().optional(),
        defaultFormat: citationFormatSchema.optional(),
        default_format: citationFormatSchema.optional(),
        defaultKeyFormat: citationKeyFormatSchema.optional(),
        default_key_format: citationKeyFormatSchema.optional(),
      })
      .optional(),
    pubmed: z
      .object({
        email: z.string().optional(),
        apiKey: z.string().optional(),
        api_key: z.string().optional(),
      })
      .optional(),
    attachments: z
      .object({
        directory: z.string().min(1).optional(),
      })
      .optional(),
    cli: z
      .object({
        defaultLimit: z.number().int().nonnegative().optional(),
        default_limit: z.number().int().nonnegative().optional(),
        defaultSort: sortFieldSchema.optional(),
        default_sort: sortFieldSchema.optional(),
        defaultOrder: sortOrderSchema.optional(),
        default_order: sortOrderSchema.optional(),
        tui: z
          .object({
            limit: z.number().int().nonnegative().optional(),
            debounceMs: z.number().int().nonnegative().optional(),
            debounce_ms: z.number().int().nonnegative().optional(),
          })
          .optional(),
        edit: z
          .object({
            defaultFormat: editFormatSchema.optional(),
            default_format: editFormatSchema.optional(),
          })
          .optional(),
      })
      .optional(),
    mcp: z
      .object({
        defaultLimit: z.number().int().nonnegative().optional(),
        default_limit: z.number().int().nonnegative().optional(),
      })
      .optional(),
  })
  .passthrough(); // Allow unknown fields in TOML files

/**
 * Inferred types from schemas
 */
export type LogLevel = z.infer<typeof logLevelSchema>;
export type BackupConfig = z.infer<typeof backupConfigSchema>;
export type WatchConfig = z.infer<typeof watchConfigSchema>;
export type ServerConfig = z.infer<typeof serverConfigSchema>;
export type CitationFormat = z.infer<typeof citationFormatSchema>;
export type CitationKeyFormat = z.infer<typeof citationKeyFormatSchema>;
export type CitationConfig = z.infer<typeof citationConfigSchema>;
export type PubmedConfig = z.infer<typeof pubmedConfigSchema>;
export type AttachmentsConfig = z.infer<typeof attachmentsConfigSchema>;
export type TuiConfig = z.infer<typeof tuiConfigSchema>;
export type EditConfigFormat = z.infer<typeof editFormatSchema>;
export type EditConfig = z.infer<typeof editConfigSchema>;
export type CliConfig = z.infer<typeof cliConfigSchema>;
export type McpConfig = z.infer<typeof mcpConfigSchema>;
export type Config = z.infer<typeof configSchema>;
export type PartialConfig = z.infer<typeof partialConfigSchema>;

/**
 * Deep partial type for Config
 */
export type DeepPartialConfig = {
  library?: string;
  logLevel?: LogLevel;
  backup?: Partial<BackupConfig>;
  watch?: Partial<WatchConfig>;
  server?: Partial<ServerConfig>;
  citation?: Partial<CitationConfig>;
  pubmed?: Partial<PubmedConfig>;
  attachments?: Partial<AttachmentsConfig>;
  cli?: Partial<Omit<CliConfig, "tui" | "edit">> & {
    tui?: Partial<TuiConfig>;
    edit?: Partial<EditConfig>;
  };
  mcp?: Partial<McpConfig>;
};

/**
 * Normalize backup configuration from snake_case to camelCase
 */
function normalizeBackupConfig(
  backup: Partial<{
    maxGenerations?: number;
    max_generations?: number;
    maxAgeDays?: number;
    max_age_days?: number;
    directory?: string;
  }>
): Partial<BackupConfig> | undefined {
  const normalized: Partial<BackupConfig> = {};

  const maxGenerations = backup.maxGenerations ?? backup.max_generations;
  if (maxGenerations !== undefined) {
    normalized.maxGenerations = maxGenerations;
  }

  const maxAgeDays = backup.maxAgeDays ?? backup.max_age_days;
  if (maxAgeDays !== undefined) {
    normalized.maxAgeDays = maxAgeDays;
  }

  if (backup.directory !== undefined) {
    normalized.directory = backup.directory;
  }

  return Object.keys(normalized).length > 0 ? normalized : undefined;
}

/**
 * Normalize watch configuration from snake_case to camelCase
 */
function normalizeWatchConfig(
  watch: Partial<{
    debounceMs?: number;
    debounce_ms?: number;
    pollIntervalMs?: number;
    poll_interval_ms?: number;
    retryIntervalMs?: number;
    retry_interval_ms?: number;
    maxRetries?: number;
    max_retries?: number;
  }>
): Partial<WatchConfig> | undefined {
  const normalized: Partial<WatchConfig> = {};

  const debounceMs = watch.debounceMs ?? watch.debounce_ms;
  if (debounceMs !== undefined) {
    normalized.debounceMs = debounceMs;
  }

  const pollIntervalMs = watch.pollIntervalMs ?? watch.poll_interval_ms;
  if (pollIntervalMs !== undefined) {
    normalized.pollIntervalMs = pollIntervalMs;
  }

  const retryIntervalMs = watch.retryIntervalMs ?? watch.retry_interval_ms;
  if (retryIntervalMs !== undefined) {
    normalized.retryIntervalMs = retryIntervalMs;
  }

  const maxRetries = watch.maxRetries ?? watch.max_retries;
  if (maxRetries !== undefined) {
    normalized.maxRetries = maxRetries;
  }

  return Object.keys(normalized).length > 0 ? normalized : undefined;
}

/**
 * Normalize server configuration from snake_case to camelCase
 */
function normalizeServerConfig(
  server: Partial<{
    autoStart?: boolean;
    auto_start?: boolean;
    autoStopMinutes?: number;
    auto_stop_minutes?: number;
  }>
): Partial<ServerConfig> | undefined {
  const normalized: Partial<ServerConfig> = {};

  const autoStart = server.autoStart ?? server.auto_start;
  if (autoStart !== undefined) {
    normalized.autoStart = autoStart;
  }

  const autoStopMinutes = server.autoStopMinutes ?? server.auto_stop_minutes;
  if (autoStopMinutes !== undefined) {
    normalized.autoStopMinutes = autoStopMinutes;
  }

  return Object.keys(normalized).length > 0 ? normalized : undefined;
}

/**
 * Normalize citation configuration from snake_case to camelCase
 */
function normalizeCitationConfig(
  citation: Partial<{
    defaultStyle?: string;
    default_style?: string;
    cslDirectory?: string | string[];
    csl_directory?: string | string[];
    defaultLocale?: string;
    default_locale?: string;
    defaultFormat?: CitationFormat;
    default_format?: CitationFormat;
    defaultKeyFormat?: CitationKeyFormat;
    default_key_format?: CitationKeyFormat;
  }>
): Partial<CitationConfig> | undefined {
  const normalized: Partial<CitationConfig> = {};

  const defaultStyle = citation.defaultStyle ?? citation.default_style;
  if (defaultStyle !== undefined) {
    normalized.defaultStyle = defaultStyle;
  }

  const cslDirectory = citation.cslDirectory ?? citation.csl_directory;
  if (cslDirectory !== undefined) {
    // Normalize to array: string -> [string]
    normalized.cslDirectory = Array.isArray(cslDirectory) ? cslDirectory : [cslDirectory];
  }

  const defaultLocale = citation.defaultLocale ?? citation.default_locale;
  if (defaultLocale !== undefined) {
    normalized.defaultLocale = defaultLocale;
  }

  const defaultFormat = citation.defaultFormat ?? citation.default_format;
  if (defaultFormat !== undefined) {
    normalized.defaultFormat = defaultFormat;
  }

  const defaultKeyFormat =
    (citation as Record<string, unknown>).defaultKeyFormat ??
    (citation as Record<string, unknown>).default_key_format;
  if (defaultKeyFormat !== undefined) {
    normalized.defaultKeyFormat = defaultKeyFormat as CitationKeyFormat;
  }

  return Object.keys(normalized).length > 0 ? normalized : undefined;
}

/**
 * Normalize pubmed configuration from snake_case to camelCase
 */
function normalizePubmedConfig(
  pubmed: Partial<{
    email?: string;
    apiKey?: string;
    api_key?: string;
  }>
): Partial<PubmedConfig> | undefined {
  const normalized: Partial<PubmedConfig> = {};

  if (pubmed.email !== undefined) {
    normalized.email = pubmed.email;
  }

  const apiKey = pubmed.apiKey ?? pubmed.api_key;
  if (apiKey !== undefined) {
    normalized.apiKey = apiKey;
  }

  return Object.keys(normalized).length > 0 ? normalized : undefined;
}

/**
 * Section normalizers mapping
 */
const sectionNormalizers = {
  backup: normalizeBackupConfig,
  watch: normalizeWatchConfig,
  server: normalizeServerConfig,
  citation: normalizeCitationConfig,
  pubmed: normalizePubmedConfig,
  attachments: normalizeAttachmentsConfig,
  cli: normalizeCliConfig,
  mcp: normalizeMcpConfig,
} as const;

type SectionKey = keyof typeof sectionNormalizers;

/**
 * Helper to apply a normalizer function to a config section
 */
function applyNormalizer<K extends SectionKey>(
  normalized: DeepPartialConfig,
  partial: PartialConfig,
  key: K,
  normalizer: (typeof sectionNormalizers)[K]
): void {
  const value = partial[key];
  if (value !== undefined) {
    const result = (normalizer as (input: unknown) => DeepPartialConfig[K] | undefined)(value);
    if (result) {
      normalized[key] = result;
    }
  }
}

/**
 * Normalize snake_case fields to camelCase
 */
export function normalizePartialConfig(partial: PartialConfig): DeepPartialConfig {
  const normalized: DeepPartialConfig = {};

  // Simple fields
  if (partial.library !== undefined) {
    normalized.library = partial.library;
  }
  const logLevel = partial.logLevel ?? partial.log_level;
  if (logLevel !== undefined) {
    normalized.logLevel = logLevel;
  }

  // Section fields
  for (const key of Object.keys(sectionNormalizers) as SectionKey[]) {
    applyNormalizer(normalized, partial, key, sectionNormalizers[key]);
  }

  return normalized;
}

/**
 * Normalize attachments configuration
 */
function normalizeAttachmentsConfig(attachments: {
  directory?: string | undefined;
}): Partial<AttachmentsConfig> | undefined {
  const normalized: Partial<AttachmentsConfig> = {};

  if (attachments.directory !== undefined) {
    normalized.directory = attachments.directory;
  }

  return Object.keys(normalized).length > 0 ? normalized : undefined;
}

/**
 * Normalize TUI config subsection
 */
function normalizeTuiSection(
  tui: Partial<{
    limit?: number;
    debounceMs?: number;
    debounce_ms?: number;
    clipboardAutoCopy?: boolean;
    clipboard_auto_copy?: boolean;
  }>
): Partial<TuiConfig> | undefined {
  const normalized: Partial<TuiConfig> = {};
  if (tui.limit !== undefined) {
    normalized.limit = tui.limit;
  }
  const debounceMs = tui.debounceMs ?? tui.debounce_ms;
  if (debounceMs !== undefined) {
    normalized.debounceMs = debounceMs;
  }
  const clipboardAutoCopy = tui.clipboardAutoCopy ?? tui.clipboard_auto_copy;
  if (clipboardAutoCopy !== undefined) {
    normalized.clipboardAutoCopy = clipboardAutoCopy;
  }
  return Object.keys(normalized).length > 0 ? normalized : undefined;
}

/**
 * Normalize edit config subsection
 */
function normalizeEditSection(
  edit: Partial<{
    defaultFormat?: EditConfigFormat;
    default_format?: EditConfigFormat;
  }>
): Partial<EditConfig> | undefined {
  const normalized: Partial<EditConfig> = {};
  const defaultFormat = edit.defaultFormat ?? edit.default_format;
  if (defaultFormat !== undefined) {
    normalized.defaultFormat = defaultFormat;
  }
  return Object.keys(normalized).length > 0 ? normalized : undefined;
}

/**
 * Normalize CLI configuration from snake_case to camelCase
 */
function normalizeCliConfig(
  cli: Partial<{
    defaultLimit?: number;
    default_limit?: number;
    defaultSort?: CliConfig["defaultSort"];
    default_sort?: CliConfig["defaultSort"];
    defaultOrder?: CliConfig["defaultOrder"];
    default_order?: CliConfig["defaultOrder"];
    tui?: Partial<{
      limit?: number;
      debounceMs?: number;
      debounce_ms?: number;
    }>;
    edit?: Partial<{
      defaultFormat?: EditConfigFormat;
      default_format?: EditConfigFormat;
    }>;
  }>
): Partial<CliConfig> | undefined {
  const normalized: Partial<CliConfig> = {};

  const defaultLimit = cli.defaultLimit ?? cli.default_limit;
  if (defaultLimit !== undefined) {
    normalized.defaultLimit = defaultLimit;
  }

  const defaultSort = cli.defaultSort ?? cli.default_sort;
  if (defaultSort !== undefined) {
    normalized.defaultSort = defaultSort;
  }

  const defaultOrder = cli.defaultOrder ?? cli.default_order;
  if (defaultOrder !== undefined) {
    normalized.defaultOrder = defaultOrder;
  }

  if (cli.tui !== undefined) {
    const tui = normalizeTuiSection(cli.tui);
    if (tui) {
      normalized.tui = tui as TuiConfig;
    }
  }

  if (cli.edit !== undefined) {
    const edit = normalizeEditSection(cli.edit);
    if (edit) {
      normalized.edit = edit as EditConfig;
    }
  }

  return Object.keys(normalized).length > 0 ? normalized : undefined;
}

/**
 * Normalize MCP configuration from snake_case to camelCase
 */
function normalizeMcpConfig(
  mcp: Partial<{
    defaultLimit?: number;
    default_limit?: number;
  }>
): Partial<McpConfig> | undefined {
  const normalized: Partial<McpConfig> = {};

  const defaultLimit = mcp.defaultLimit ?? mcp.default_limit;
  if (defaultLimit !== undefined) {
    normalized.defaultLimit = defaultLimit;
  }

  return Object.keys(normalized).length > 0 ? normalized : undefined;
}
