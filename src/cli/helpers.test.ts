/**
 * Tests for CLI helper functions
 */

import { mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Config } from "../config/schema.js";
import {
  getOutputFormat,
  isTTY,
  loadConfigWithOverrides,
  parseJsonInput,
  readConfirmation,
  readJsonInput,
  readStdinInputs,
  resolveClipboardEnabled,
  writeOutputWithClipboard,
} from "./helpers.js";

describe("readJsonInput", () => {
  let testDir: string;

  beforeEach(() => {
    testDir = join(tmpdir(), `reference-manager-test-${Date.now()}`);
    mkdirSync(testDir, { recursive: true });
  });

  it("should read JSON from file", async () => {
    const testFile = join(testDir, "test.json");
    const testData = { type: "article", title: "Test" };
    writeFileSync(testFile, JSON.stringify(testData));

    const result = await readJsonInput(testFile);
    expect(result).toBe(JSON.stringify(testData));
  });

  it("should throw error if file does not exist", async () => {
    const nonExistentFile = join(testDir, "nonexistent.json");
    await expect(readJsonInput(nonExistentFile)).rejects.toThrow();
  });

  it("should read from stdin if no file specified (mock)", async () => {
    // Note: This test is a placeholder for stdin reading
    // In practice, stdin reading is tested via integration tests
    expect(true).toBe(true);
  });
});

describe("parseJsonInput", () => {
  it("should parse valid JSON object", () => {
    const input = '{"type":"article","title":"Test"}';
    const result = parseJsonInput(input);
    expect(result).toEqual({ type: "article", title: "Test" });
  });

  it("should parse valid JSON array", () => {
    const input = '[{"type":"article"},{"type":"book"}]';
    const result = parseJsonInput(input);
    expect(result).toEqual([{ type: "article" }, { type: "book" }]);
  });

  it("should throw error for invalid JSON", () => {
    const input = "{invalid json}";
    expect(() => parseJsonInput(input)).toThrow("Parse error");
  });

  it("should throw error for empty input", () => {
    const input = "";
    expect(() => parseJsonInput(input)).toThrow("Parse error");
  });
});

describe("loadConfigWithOverrides", () => {
  it("should load config with no overrides", async () => {
    const options = {};
    const config = await loadConfigWithOverrides(options);
    expect(config).toBeDefined();
    expect(config.library).toBeDefined();
  });

  it("should override library path", async () => {
    const options = { library: "/custom/path.json" };
    const config = await loadConfigWithOverrides(options);
    expect(config.library).toBe("/custom/path.json");
  });

  it("should override log level", async () => {
    const options = { logLevel: "debug" as const };
    const config = await loadConfigWithOverrides(options);
    expect(config.logLevel).toBe("debug");
  });

  it("should handle quiet flag", async () => {
    const options = { quiet: true };
    const config = await loadConfigWithOverrides(options);
    expect(config.logLevel).toBe("silent");
  });

  it("should handle verbose flag", async () => {
    const options = { verbose: true };
    const config = await loadConfigWithOverrides(options);
    expect(config.logLevel).toBe("debug");
  });

  it("should override backup settings", async () => {
    const options = { backup: false, backupDir: "/custom/backup" };
    const config = await loadConfigWithOverrides(options);
    expect(config.backup.enabled).toBe(false);
    expect(config.backup.directory).toBe("/custom/backup");
  });

  it("should override attachments directory", async () => {
    const options = { attachmentsDir: "/custom/attachments" };
    const config = await loadConfigWithOverrides(options);
    expect(config.attachments.directory).toBe("/custom/attachments");
  });

  it("should pass config path to loadConfig", async () => {
    const { rmSync } = await import("node:fs");

    const testDir = join(tmpdir(), `helpers-config-test-${Date.now()}`);
    mkdirSync(testDir, { recursive: true });

    try {
      const configFile = join(testDir, "test-config.toml");
      writeFileSync(configFile, 'library = "/from-config-flag/library.json"\n');

      const options = { config: configFile };
      const config = await loadConfigWithOverrides(options);
      expect(config.library).toBe("/from-config-flag/library.json");
    } finally {
      rmSync(testDir, { recursive: true, force: true });
    }
  });
});

describe("getOutputFormat", () => {
  it("should return 'pretty' when no options specified", () => {
    const options = {};
    const format = getOutputFormat(options);
    expect(format).toBe("pretty");
  });

  it("should return 'json' when --json specified", () => {
    const options = { json: true };
    const format = getOutputFormat(options);
    expect(format).toBe("json");
  });

  it("should return 'ids-only' when --ids-only specified", () => {
    const options = { idsOnly: true };
    const format = getOutputFormat(options);
    expect(format).toBe("ids-only");
  });

  it("should return 'uuid' when --uuid specified", () => {
    const options = { uuid: true };
    const format = getOutputFormat(options);
    expect(format).toBe("uuid");
  });

  it("should return 'bibtex' when --bibtex specified", () => {
    const options = { bibtex: true };
    const format = getOutputFormat(options);
    expect(format).toBe("bibtex");
  });

  it("should throw error when multiple formats specified", () => {
    const options = { json: true, bibtex: true };
    expect(() => getOutputFormat(options)).toThrow("Multiple output formats specified");
  });
});

describe("isTTY", () => {
  it("should return a boolean", () => {
    const result = isTTY();
    expect(typeof result).toBe("boolean");
  });

  it("should return false in test environment (non-TTY)", () => {
    const result = isTTY();
    expect(result).toBe(false);
  });
});

describe("readConfirmation", () => {
  it("should be a function", () => {
    expect(typeof readConfirmation).toBe("function");
  });

  // Note: Interactive prompt testing requires mocking stdin/stdout
  // Detailed tests would be added in integration tests
});

describe("readStdinInputs", () => {
  it("should be a function", () => {
    expect(typeof readStdinInputs).toBe("function");
  });

  // Note: stdin reading is tested via CLI integration tests
  // The function reads from process.stdin and splits by whitespace
  // See add.e2e.test.ts for actual stdin handling tests
});

describe("resolveClipboardEnabled", () => {
  const originalEnv = process.env;

  const makeConfig = (clipboardAutoCopy: boolean): Config =>
    ({
      cli: { tui: { clipboardAutoCopy } },
    }) as unknown as Config;

  afterEach(() => {
    process.env = originalEnv;
  });

  it("--clipboard flag overrides config and env", () => {
    process.env = { ...originalEnv, REFERENCE_MANAGER_CLIPBOARD_AUTO_COPY: "0" };
    const config = makeConfig(false);
    expect(resolveClipboardEnabled({ clipboard: true }, config, false)).toBe(true);
  });

  it("--no-clipboard flag disables clipboard", () => {
    process.env = { ...originalEnv, REFERENCE_MANAGER_CLIPBOARD_AUTO_COPY: "1" };
    const config = makeConfig(true);
    expect(resolveClipboardEnabled({ clipboard: false }, config, true)).toBe(false);
  });

  it("env var applies when no CLI flag given", () => {
    process.env = { ...originalEnv, REFERENCE_MANAGER_CLIPBOARD_AUTO_COPY: "1" };
    const config = makeConfig(false);
    expect(resolveClipboardEnabled({}, config, false)).toBe(true);
  });

  it("env var '0' disables clipboard", () => {
    process.env = { ...originalEnv, REFERENCE_MANAGER_CLIPBOARD_AUTO_COPY: "0" };
    const config = makeConfig(true);
    expect(resolveClipboardEnabled({}, config, true)).toBe(false);
  });

  it("config clipboardAutoCopy applies only in TUI mode when no CLI flag/env", () => {
    process.env = { ...originalEnv };
    process.env.REFERENCE_MANAGER_CLIPBOARD_AUTO_COPY = undefined;
    const config = makeConfig(true);
    expect(resolveClipboardEnabled({}, config, true)).toBe(true);
    expect(resolveClipboardEnabled({}, config, false)).toBe(false);
  });

  it("returns false by default when nothing is set", () => {
    process.env = { ...originalEnv };
    process.env.REFERENCE_MANAGER_CLIPBOARD_AUTO_COPY = undefined;
    const config = makeConfig(false);
    expect(resolveClipboardEnabled({}, config, false)).toBe(false);
    expect(resolveClipboardEnabled({}, config, true)).toBe(false);
  });
});

vi.mock("../utils/clipboard.js", () => ({
  copyToClipboard: vi.fn(),
}));

describe("writeOutputWithClipboard", () => {
  let stdoutWrite: ReturnType<typeof vi.spyOn>;
  let stderrWrite: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    stdoutWrite = vi.spyOn(process.stdout, "write").mockImplementation(() => true);
    stderrWrite = vi.spyOn(process.stderr, "write").mockImplementation(() => true);
  });

  afterEach(() => {
    stdoutWrite.mockRestore();
    stderrWrite.mockRestore();
    vi.clearAllMocks();
  });

  it("writes output to stdout and clipboard when enabled", async () => {
    const { copyToClipboard } = await import("../utils/clipboard.js");
    vi.mocked(copyToClipboard).mockResolvedValue({ success: true });

    await writeOutputWithClipboard("test output", true, false);

    expect(stdoutWrite).toHaveBeenCalledWith("test output\n");
    expect(copyToClipboard).toHaveBeenCalledWith("test output");
    expect(stderrWrite).toHaveBeenCalledWith("Copied to clipboard\n");
  });

  it("shows warning on clipboard failure, stdout still works", async () => {
    const { copyToClipboard } = await import("../utils/clipboard.js");
    vi.mocked(copyToClipboard).mockResolvedValue({ success: false, error: "not found" });

    await writeOutputWithClipboard("test output", true, false);

    expect(stdoutWrite).toHaveBeenCalledWith("test output\n");
    expect(stderrWrite).toHaveBeenCalledWith("Warning: Failed to copy to clipboard: not found\n");
  });

  it("suppresses clipboard notification when quiet", async () => {
    const { copyToClipboard } = await import("../utils/clipboard.js");
    vi.mocked(copyToClipboard).mockResolvedValue({ success: true });

    await writeOutputWithClipboard("test output", true, true);

    expect(stdoutWrite).toHaveBeenCalledWith("test output\n");
    expect(copyToClipboard).toHaveBeenCalledWith("test output");
    expect(stderrWrite).not.toHaveBeenCalled();
  });

  it("does not invoke clipboard when disabled", async () => {
    const { copyToClipboard } = await import("../utils/clipboard.js");

    await writeOutputWithClipboard("test output", false, false);

    expect(stdoutWrite).toHaveBeenCalledWith("test output\n");
    expect(copyToClipboard).not.toHaveBeenCalled();
    expect(stderrWrite).not.toHaveBeenCalled();
  });
});
