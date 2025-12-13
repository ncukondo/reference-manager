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
    const backup: Partial<BackupConfig> = {};

    const maxGenerations = partial.backup.maxGenerations ?? partial.backup.max_generations;
    if (maxGenerations !== undefined) {
      backup.maxGenerations = maxGenerations;
    }

    const maxAgeDays = partial.backup.maxAgeDays ?? partial.backup.max_age_days;
    if (maxAgeDays !== undefined) {
      backup.maxAgeDays = maxAgeDays;
    }

    if (partial.backup.directory !== undefined) {
      backup.directory = partial.backup.directory;
    }

    // Only set backup if there are fields
    if (Object.keys(backup).length > 0) {
      normalized.backup = backup as Partial<BackupConfig>;
    }
  }

  // Watch
  if (partial.watch !== undefined) {
    const watch: Partial<WatchConfig> = {};

    if (partial.watch.enabled !== undefined) {
      watch.enabled = partial.watch.enabled;
    }

    const debounceMs = partial.watch.debounceMs ?? partial.watch.debounce_ms;
    if (debounceMs !== undefined) {
      watch.debounceMs = debounceMs;
    }

    const pollIntervalMs = partial.watch.pollIntervalMs ?? partial.watch.poll_interval_ms;
    if (pollIntervalMs !== undefined) {
      watch.pollIntervalMs = pollIntervalMs;
    }

    const retryIntervalMs = partial.watch.retryIntervalMs ?? partial.watch.retry_interval_ms;
    if (retryIntervalMs !== undefined) {
      watch.retryIntervalMs = retryIntervalMs;
    }

    const maxRetries = partial.watch.maxRetries ?? partial.watch.max_retries;
    if (maxRetries !== undefined) {
      watch.maxRetries = maxRetries;
    }

    // Only set watch if there are fields
    if (Object.keys(watch).length > 0) {
      normalized.watch = watch as Partial<WatchConfig>;
    }
  }

  return normalized;
}
