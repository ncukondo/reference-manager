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
 * Complete configuration schema
 */
export const configSchema = z.object({
  library: z.string().min(1),
  logLevel: logLevelSchema,
  backup: backupConfigSchema,
  watch: watchConfigSchema,
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
  })
  .passthrough(); // Allow unknown fields in TOML files

/**
 * Inferred types from schemas
 */
export type LogLevel = z.infer<typeof logLevelSchema>;
export type BackupConfig = z.infer<typeof backupConfigSchema>;
export type WatchConfig = z.infer<typeof watchConfigSchema>;
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
  if (partial.backup !== undefined) {
    const backup = normalizeBackupConfig(
      partial.backup as Parameters<typeof normalizeBackupConfig>[0]
    );
    if (backup) {
      normalized.backup = backup;
    }
  }

  // Watch
  if (partial.watch !== undefined) {
    const watch = normalizeWatchConfig(partial.watch as Parameters<typeof normalizeWatchConfig>[0]);
    if (watch) {
      normalized.watch = watch;
    }
  }

  return normalized;
}
