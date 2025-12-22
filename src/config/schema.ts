/**
 * Configuration schema using Zod
 */

import { z } from "zod";

/**
 * Log level schema
 */
export const logLevelSchema = z.enum(["silent", "info", "debug"]);

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
 */
export const watchConfigSchema = z.object({
  enabled: z.boolean(),
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
 * Citation configuration schema
 */
export const citationConfigSchema = z.object({
  defaultStyle: z.string(),
  cslDirectory: z.array(z.string()),
  defaultLocale: z.string(),
  defaultFormat: citationFormatSchema,
});

/**
 * PubMed API configuration schema
 */
export const pubmedConfigSchema = z.object({
  email: z.string().optional(),
  apiKey: z.string().optional(),
});

/**
 * Fulltext storage configuration schema
 */
export const fulltextConfigSchema = z.object({
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
  fulltext: fulltextConfigSchema,
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
        enabled: z.boolean().optional(),
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
      })
      .optional(),
    pubmed: z
      .object({
        email: z.string().optional(),
        apiKey: z.string().optional(),
        api_key: z.string().optional(),
      })
      .optional(),
    fulltext: z
      .object({
        directory: z.string().min(1).optional(),
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
export type CitationConfig = z.infer<typeof citationConfigSchema>;
export type PubmedConfig = z.infer<typeof pubmedConfigSchema>;
export type FulltextConfig = z.infer<typeof fulltextConfigSchema>;
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
  fulltext?: Partial<FulltextConfig>;
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
    enabled?: boolean;
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

  if (watch.enabled !== undefined) {
    normalized.enabled = watch.enabled;
  }

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
 * Normalize snake_case fields to camelCase
 */
export function normalizePartialConfig(partial: PartialConfig): DeepPartialConfig {
  const normalized: DeepPartialConfig = {};

  // Library
  if (partial.library !== undefined) {
    normalized.library = partial.library;
  }

  // Log level (prefer camelCase, fallback to snake_case)
  const logLevel = partial.logLevel ?? partial.log_level;
  if (logLevel !== undefined) {
    normalized.logLevel = logLevel;
  }

  // Backup
  const backup =
    partial.backup !== undefined
      ? normalizeBackupConfig(partial.backup as Parameters<typeof normalizeBackupConfig>[0])
      : undefined;
  if (backup) {
    normalized.backup = backup;
  }

  // Watch
  const watch =
    partial.watch !== undefined
      ? normalizeWatchConfig(partial.watch as Parameters<typeof normalizeWatchConfig>[0])
      : undefined;
  if (watch) {
    normalized.watch = watch;
  }

  // Server
  const server =
    partial.server !== undefined
      ? normalizeServerConfig(partial.server as Parameters<typeof normalizeServerConfig>[0])
      : undefined;
  if (server) {
    normalized.server = server;
  }

  // Citation
  const citation =
    partial.citation !== undefined
      ? normalizeCitationConfig(partial.citation as Parameters<typeof normalizeCitationConfig>[0])
      : undefined;
  if (citation) {
    normalized.citation = citation;
  }

  // PubMed
  const pubmed =
    partial.pubmed !== undefined
      ? normalizePubmedConfig(partial.pubmed as Parameters<typeof normalizePubmedConfig>[0])
      : undefined;
  if (pubmed) {
    normalized.pubmed = pubmed;
  }

  // Fulltext
  const fulltext =
    partial.fulltext !== undefined ? normalizeFulltextConfig(partial.fulltext) : undefined;
  if (fulltext) {
    normalized.fulltext = fulltext;
  }

  return normalized;
}

/**
 * Normalize fulltext configuration
 */
function normalizeFulltextConfig(fulltext: {
  directory?: string | undefined;
}): Partial<FulltextConfig> | undefined {
  const normalized: Partial<FulltextConfig> = {};

  if (fulltext.directory !== undefined) {
    normalized.directory = fulltext.directory;
  }

  return Object.keys(normalized).length > 0 ? normalized : undefined;
}
