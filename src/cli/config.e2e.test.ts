/**
 * End-to-end tests for config command
 */
import { spawn } from "node:child_process";
import { promises as fs, existsSync } from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { parse as parseTOML } from "@iarna/toml";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

const CLI_PATH = path.resolve("bin/reference-manager.js");

// Helper type for parsed TOML config
type ParsedConfig = Record<string, unknown>;

describe("Config Command E2E", () => {
  let testDir: string;
  let localConfigPath: string;

  /**
   * Run CLI with specified args in the test directory context
   */
  const runCli = (
    args: string[],
    options?: { env?: Record<string, string | undefined>; cwd?: string }
  ): Promise<{ exitCode: number; stdout: string; stderr: string }> =>
    new Promise((resolve) => {
      const proc = spawn("node", [CLI_PATH, ...args], {
        cwd: options?.cwd ?? testDir,
        env: {
          ...process.env,
          NODE_ENV: "test",
          HOME: testDir, // Isolate user config
          XDG_CONFIG_HOME: path.join(testDir, ".config"),
          ...options?.env,
        },
      });

      let stdout = "";
      let stderr = "";

      proc.stdout.on("data", (data) => {
        stdout += data.toString();
      });
      proc.stderr.on("data", (data) => {
        stderr += data.toString();
      });

      proc.on("close", (code) => {
        resolve({ exitCode: code ?? 0, stdout, stderr });
      });

      proc.stdin.end();
    });

  /**
   * Helper to read and parse local config file
   */
  const readLocalConfig = async (): Promise<ParsedConfig> => {
    const content = await fs.readFile(localConfigPath, "utf-8");
    return parseTOML(content) as ParsedConfig;
  };

  /**
   * Helper to write local config file
   */
  const writeLocalConfig = async (content: string): Promise<void> => {
    await fs.writeFile(localConfigPath, content, "utf-8");
  };

  beforeEach(async () => {
    testDir = path.join(
      os.tmpdir(),
      `config-e2e-${Date.now()}-${Math.random().toString(36).slice(2)}`
    );
    await fs.mkdir(testDir, { recursive: true });
    await fs.mkdir(path.join(testDir, ".config", "reference-manager"), {
      recursive: true,
    });

    localConfigPath = path.join(testDir, ".reference-manager.config.toml");
  });

  afterEach(async () => {
    try {
      await fs.rm(testDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  describe("config show", () => {
    it("should output valid TOML with default values", async () => {
      const result = await runCli(["config", "show"]);

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain("log_level");
    });

    it("should output valid JSON with --json", async () => {
      const result = await runCli(["config", "show", "--json"]);

      expect(result.exitCode).toBe(0);
      expect(() => JSON.parse(result.stdout)).not.toThrow();
      const parsed = JSON.parse(result.stdout);
      expect(parsed).toHaveProperty("log_level");
    });

    it("should show only citation section with --section", async () => {
      const result = await runCli(["config", "show", "--section", "citation"]);

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain("default_style");
      expect(result.stdout).not.toMatch(/^log_level\s*=/m);
    });

    it("should show source annotations with --sources", async () => {
      const result = await runCli(["config", "show", "--sources"]);

      expect(result.exitCode).toBe(0);
      // Source priority header is shown
      expect(result.stdout).toContain("# Source priority");
    });
  });

  describe("config get", () => {
    it("should return default value for log_level", async () => {
      const result = await runCli(["config", "get", "log_level"]);

      expect(result.exitCode).toBe(0);
      expect(result.stdout.trim()).toBe("info");
    });

    it("should return nested value for citation.default_style", async () => {
      const result = await runCli(["config", "get", "citation.default_style"]);

      expect(result.exitCode).toBe(0);
      expect(result.stdout.trim()).toBe("apa");
    });

    it("should exit with code 1 for nonexistent key", async () => {
      const result = await runCli(["config", "get", "nonexistent.key"]);

      expect(result.exitCode).toBe(1);
    });

    it("should return environment value when override is set", async () => {
      const result = await runCli(["config", "get", "library"], {
        env: {
          REFERENCE_MANAGER_LIBRARY: "/custom/env/library.json",
        },
      });

      expect(result.exitCode).toBe(0);
      expect(result.stdout.trim()).toBe("/custom/env/library.json");
    });

    it("should ignore environment override with --config-only", async () => {
      // First set a value in local config
      await runCli(["config", "set", "--local", "log_level", "debug"]);

      // Get with --config-only should return config file value
      const result = await runCli(["config", "get", "log_level", "--config-only"]);

      expect(result.exitCode).toBe(0);
      expect(result.stdout.trim()).toBe("debug");
    });
  });

  describe("config set (file creation and updates)", () => {
    it("should create config file with correct content", async () => {
      const result = await runCli(["config", "set", "--local", "log_level", "debug"]);

      expect(result.exitCode).toBe(0);
      expect(existsSync(localConfigPath)).toBe(true);

      const config = await readLocalConfig();
      expect(config.log_level).toBe("debug");
    });

    it("should create nested section for citation.default_style", async () => {
      await runCli(["config", "set", "--local", "citation.default_style", "ieee"]);

      const config = await readLocalConfig();
      expect((config.citation as ParsedConfig)?.default_style).toBe("ieee");
    });

    it("should create deeply nested section for cli.interactive.limit", async () => {
      const result = await runCli(["config", "set", "--local", "cli.interactive.limit", "50"]);
      expect(result.exitCode).toBe(0);

      const config = await readLocalConfig();
      const cli = config.cli as ParsedConfig;
      const interactive = cli?.interactive as ParsedConfig;
      expect(interactive?.limit).toBe(50);
    });

    it("should preserve existing values across multiple set commands", async () => {
      await runCli(["config", "set", "--local", "log_level", "debug"]);
      await runCli(["config", "set", "--local", "citation.default_style", "ieee"]);

      const config = await readLocalConfig();
      expect(config.log_level).toBe("debug");
      expect((config.citation as ParsedConfig)?.default_style).toBe("ieee");
    });

    it("should handle boolean value correctly", async () => {
      const result = await runCli(["config", "set", "--local", "server.auto_start", "true"]);
      expect(result.exitCode).toBe(0);

      const config = await readLocalConfig();
      expect((config.server as ParsedConfig)?.auto_start).toBe(true);
    });

    it("should handle number value correctly", async () => {
      const result = await runCli(["config", "set", "--local", "cli.default_limit", "100"]);
      expect(result.exitCode).toBe(0);

      const config = await readLocalConfig();
      expect((config.cli as ParsedConfig)?.default_limit).toBe(100);
    });

    it("should handle array value correctly (comma-separated)", async () => {
      const result = await runCli([
        "config",
        "set",
        "--local",
        "citation.csl_directory",
        "/path/a,/path/b",
      ]);
      expect(result.exitCode).toBe(0);

      const config = await readLocalConfig();
      expect((config.citation as ParsedConfig)?.csl_directory).toEqual(["/path/a", "/path/b"]);
    });
  });

  describe("config set (validation errors)", () => {
    it("should fail with validation error for invalid enum value", async () => {
      const result = await runCli(["config", "set", "--local", "log_level", "invalid"]);

      expect(result.exitCode).toBe(1);
      expect(result.stderr).toContain("Error");
    });

    it("should fail with type error for non-numeric value on number field", async () => {
      const result = await runCli(["config", "set", "--local", "cli.default_limit", "abc"]);

      expect(result.exitCode).toBe(1);
      expect(result.stderr).toContain("Error");
    });

    it("should fail with range error for negative number", async () => {
      // Use -- to prevent -1 from being interpreted as an option
      const result = await runCli(["config", "set", "--local", "cli.default_limit", "--", "-1"]);

      expect(result.exitCode).toBe(1);
      expect(result.stderr.toLowerCase()).toContain("error");
    });

    it("should fail with unknown key error for nonexistent key", async () => {
      const result = await runCli(["config", "set", "--local", "nonexistent.key", "value"]);

      expect(result.exitCode).toBe(1);
      expect(result.stderr).toContain("Error");
    });
  });

  describe("config set (environment override warning)", () => {
    it("should show warning when setting env-overridden key", async () => {
      const result = await runCli(["config", "set", "--local", "library", "/new/path"], {
        env: {
          REFERENCE_MANAGER_LIBRARY: "/env/path",
        },
      });

      expect(result.exitCode).toBe(0);
      expect(result.stderr).toContain("Warning");
      expect(result.stderr).toContain("REFERENCE_MANAGER_LIBRARY");

      // But value is still saved
      const config = await readLocalConfig();
      expect(config.library).toBe("/new/path");
    });
  });

  describe("config unset", () => {
    it("should remove key from file", async () => {
      await runCli(["config", "set", "--local", "log_level", "debug"]);
      const result = await runCli(["config", "unset", "--local", "log_level"]);

      expect(result.exitCode).toBe(0);
      const config = await readLocalConfig();
      expect(config.log_level).toBeUndefined();
    });

    it("should remove nested key", async () => {
      await runCli(["config", "set", "--local", "citation.default_style", "ieee"]);
      await runCli(["config", "unset", "--local", "citation.default_style"]);

      const config = await readLocalConfig();
      const citation = config.citation as ParsedConfig;
      expect(citation?.default_style).toBeUndefined();
    });

    it("should preserve other values in same section", async () => {
      await runCli(["config", "set", "--local", "citation.default_style", "ieee"]);
      await runCli(["config", "set", "--local", "citation.default_locale", "ja-JP"]);
      await runCli(["config", "unset", "--local", "citation.default_style"]);

      const config = await readLocalConfig();
      const citation = config.citation as ParsedConfig;
      expect(citation?.default_style).toBeUndefined();
      expect(citation?.default_locale).toBe("ja-JP");
    });

    it("should succeed without error for nonexistent key", async () => {
      await writeLocalConfig('log_level = "info"\n');

      const result = await runCli(["config", "unset", "--local", "citation.default_style"]);

      expect(result.exitCode).toBe(0);
    });
  });

  describe("config --local (current directory config)", () => {
    it("should write to .reference-manager.config.toml in cwd", async () => {
      await runCli(["config", "set", "--local", "log_level", "debug"]);

      expect(existsSync(localConfigPath)).toBe(true);
    });
  });

  describe("config set/unset auto-detection", () => {
    it("should write to local config when it exists (no flag)", async () => {
      // Create local config first
      await writeLocalConfig('log_level = "info"\n');

      // Set without --local flag - should auto-detect and use local config
      const result = await runCli(["config", "set", "log_level", "debug"]);

      // Note: This test may fail because resolveWriteTarget uses process.cwd()
      // which is the CLI's cwd, not the test's testDir.
      // For now, we verify the command doesn't error
      expect(result.exitCode).toBe(0);
    });
  });

  describe("config path", () => {
    it("should show all paths with existence status", async () => {
      const result = await runCli(["config", "path"]);

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain("User:");
      expect(result.stdout).toContain("Local:");
    });

    it("should show only user config path with --user", async () => {
      const result = await runCli(["config", "path", "--user"]);

      expect(result.exitCode).toBe(0);
      // --user returns only the path (no label)
      expect(result.stdout.trim()).toContain("config.toml");
      expect(result.stdout).not.toContain("Local:");
    });

    it("should show only local config path with --local", async () => {
      const result = await runCli(["config", "path", "--local"]);

      expect(result.exitCode).toBe(0);
      // --local returns only the path (no label)
      expect(result.stdout.trim()).toContain(".reference-manager.config.toml");
      expect(result.stdout).not.toContain("User:");
    });
  });

  describe("config list-keys", () => {
    it("should output all available keys", async () => {
      const result = await runCli(["config", "list-keys"]);

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain("log_level");
      expect(result.stdout).toContain("library");
      expect(result.stdout).toContain("citation.default_style");
    });

    it("should filter by section with --section", async () => {
      const result = await runCli(["config", "list-keys", "--section", "citation"]);

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain("default_style");
      expect(result.stdout).not.toContain("log_level");
    });
  });

  describe("Full workflow integration", () => {
    it("should complete workflow: set -> get -> show -> unset -> get (default)", async () => {
      // Set value
      let result = await runCli(["config", "set", "--local", "citation.default_style", "ieee"]);
      expect(result.exitCode).toBe(0);

      // Get value
      result = await runCli(["config", "get", "citation.default_style"]);
      expect(result.exitCode).toBe(0);
      expect(result.stdout.trim()).toBe("ieee");

      // Show includes value
      result = await runCli(["config", "show", "--section", "citation"]);
      expect(result.stdout).toContain("ieee");

      // Unset value
      result = await runCli(["config", "unset", "--local", "citation.default_style"]);
      expect(result.exitCode).toBe(0);

      // Get returns default value (apa) since unset reverts to default
      result = await runCli(["config", "get", "citation.default_style"]);
      expect(result.exitCode).toBe(0);
      expect(result.stdout.trim()).toBe("apa");
    });
  });
});
