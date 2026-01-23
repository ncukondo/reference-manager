/**
 * Config CLI command - manage configuration settings
 */

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import type { Command } from "commander";
import { getDefaultUserConfigPath } from "../../config/defaults.js";
import { getEnvOverrideInfo } from "../../config/env-override.js";
import { loadConfig } from "../../config/loader.js";
import { parseValueForKey } from "../../config/value-validator.js";
import { createConfigTemplate, getConfigEditTarget } from "../../features/config/edit.js";
import { getConfigValue } from "../../features/config/get.js";
import { listConfigKeys } from "../../features/config/list-keys.js";
import { showConfigPaths } from "../../features/config/path.js";
import { setConfigValue } from "../../features/config/set.js";
import { showConfig } from "../../features/config/show.js";
import { unsetConfigValue } from "../../features/config/unset.js";
import { resolveWriteTarget } from "../../features/config/write-target.js";
import { openEditor } from "../../features/edit/edit-session.js";
import { resolveEditor } from "../../features/edit/editor-resolver.js";

/**
 * Register 'config' command with all subcommands
 */
export function registerConfigCommand(program: Command): void {
  const configCmd = program.command("config").description("Manage configuration settings");

  // config show
  configCmd
    .command("show")
    .description("Display effective configuration")
    .option("-o, --output <format>", "Output format: text|json")
    .option("--section <name>", "Show only a specific section")
    .option("--sources", "Include source information for each value")
    .action(async (options) => {
      try {
        const config = loadConfig();
        const output = showConfig(config, {
          json: options.output === "json",
          section: options.section,
          sources: options.sources,
        });
        process.stdout.write(`${output}\n`);
        process.exit(0);
      } catch (error) {
        process.stderr.write(`Error: ${error instanceof Error ? error.message : String(error)}\n`);
        process.exit(1);
      }
    });

  // config get <key>
  configCmd
    .command("get <key>")
    .description("Get a specific configuration value")
    .option("--config-only", "Return only the config file value (ignore env vars)")
    .action(async (key: string, options) => {
      try {
        const config = loadConfig();
        const envOverrideValue = options.configOnly
          ? null
          : (getEnvOverrideInfo(key)?.value ?? null);
        const getOptions: Parameters<typeof getConfigValue>[2] = {
          configOnly: options.configOnly,
        };
        if (envOverrideValue !== null) {
          getOptions.envOverride = envOverrideValue;
        }
        const result = getConfigValue(config, key, getOptions);

        if (result.found) {
          const { formatValue } = await import("../../features/config/get.js");
          process.stdout.write(`${formatValue(result.value)}\n`);
          process.exit(0);
        } else {
          process.exit(1);
        }
      } catch (error) {
        process.stderr.write(`Error: ${error instanceof Error ? error.message : String(error)}\n`);
        process.exit(1);
      }
    });

  // config set <key> <value>
  configCmd
    .command("set <key> <value>")
    .description("Set a configuration value")
    .option("--local", "Write to current directory config (create if not exists)")
    .option("--user", "Write to user config (ignore local config even if exists)")
    .action(async (key: string, value: string, options) => {
      try {
        // Determine config path using consistent write target resolution
        const configPath = resolveWriteTarget({
          local: options.local,
          user: options.user,
          cwd: process.cwd(),
          userConfigPath: getDefaultUserConfigPath(),
        });

        // Parse value to appropriate type
        const parsedValue = parseValueForKey(key, value);

        // Check for environment override
        const envOverrideInfo = getEnvOverrideInfo(key);

        const setOptions = envOverrideInfo ? { envOverrideInfo } : {};
        const result = await setConfigValue(configPath, key, parsedValue, setOptions);

        if (!result.success) {
          process.stderr.write(`Error: ${result.error}\n`);
          process.exit(1);
        }

        if (result.warning) {
          process.stderr.write(`${result.warning}\n`);
        }

        process.exit(0);
      } catch (error) {
        process.stderr.write(`Error: ${error instanceof Error ? error.message : String(error)}\n`);
        process.exit(1);
      }
    });

  // config unset <key>
  configCmd
    .command("unset <key>")
    .description("Remove a configuration value (revert to default)")
    .option("--local", "Remove from current directory config")
    .option("--user", "Remove from user config (ignore local config even if exists)")
    .action(async (key: string, options) => {
      try {
        // Determine config path using consistent write target resolution
        const configPath = resolveWriteTarget({
          local: options.local,
          user: options.user,
          cwd: process.cwd(),
          userConfigPath: getDefaultUserConfigPath(),
        });

        const result = await unsetConfigValue(configPath, key);

        if (!result.success) {
          process.stderr.write(`Error: ${result.error}\n`);
          process.exit(1);
        }

        process.exit(0);
      } catch (error) {
        process.stderr.write(`Error: ${error instanceof Error ? error.message : String(error)}\n`);
        process.exit(1);
      }
    });

  // config keys
  configCmd
    .command("keys")
    .description("List all available configuration keys")
    .option("--section <name>", "List keys only in a specific section")
    .action(async (options) => {
      try {
        const output = listConfigKeys({ section: options.section });
        if (output) {
          process.stdout.write(`${output}\n`);
        }
        process.exit(0);
      } catch (error) {
        process.stderr.write(`Error: ${error instanceof Error ? error.message : String(error)}\n`);
        process.exit(1);
      }
    });

  // config path
  configCmd
    .command("path")
    .description("Show configuration file paths")
    .option("--user", "Show only user config path")
    .option("--local", "Show only local config path")
    .action(async (options) => {
      try {
        const output = showConfigPaths({ user: options.user, local: options.local });
        process.stdout.write(`${output}\n`);
        process.exit(0);
      } catch (error) {
        process.stderr.write(`Error: ${error instanceof Error ? error.message : String(error)}\n`);
        process.exit(1);
      }
    });

  // config edit
  configCmd
    .command("edit")
    .description("Open configuration file in editor")
    .option("--local", "Edit current directory config")
    .action(async (options) => {
      try {
        // Check if TTY
        if (!process.stdin.isTTY) {
          process.stderr.write("Error: config edit requires a terminal (TTY)\n");
          process.exit(1);
        }

        const target = getConfigEditTarget({ local: options.local });

        // Create file with template if not exists
        if (!target.exists) {
          const template = createConfigTemplate();
          mkdirSync(dirname(target.path), { recursive: true });
          writeFileSync(target.path, template, "utf-8");
        }

        // Open editor
        const editor = resolveEditor();
        const exitCode = openEditor(editor, target.path);
        process.exit(exitCode);
      } catch (error) {
        process.stderr.write(`Error: ${error instanceof Error ? error.message : String(error)}\n`);
        process.exit(1);
      }
    });
}
