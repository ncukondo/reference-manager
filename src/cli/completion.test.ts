import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import type { TabtabEnv } from "tabtab";
import {
  getCompletions,
  needsIdCompletion,
  installCompletion,
  uninstallCompletion,
  extractSubcommands,
  extractGlobalOptions,
  getIdCompletions,
  MAX_ID_COMPLETIONS,
  OPTION_VALUES,
} from "./completion.js";
import { createProgram } from "./index.js";
import { Library } from "../core/library.js";

// Mock tabtab module
vi.mock("tabtab", () => ({
  install: vi.fn().mockResolvedValue(undefined),
  uninstall: vi.fn().mockResolvedValue(undefined),
  parseEnv: vi.fn(),
  log: vi.fn(),
}));

function createEnv(partial: Partial<TabtabEnv>): TabtabEnv {
  return {
    complete: true,
    words: 1,
    point: 0,
    line: "",
    partial: "",
    last: "",
    lastPartial: "",
    prev: "",
    ...partial,
  };
}

describe("completion", () => {
  const program = createProgram();

  describe("extractSubcommands", () => {
    it("extracts all registered subcommands from program", () => {
      const subcommands = extractSubcommands(program);
      const names = subcommands.map((c) => c.name);

      // Verify structure rather than specific commands
      expect(subcommands.length).toBeGreaterThan(0);
      expect(subcommands.every((c) => typeof c.name === "string")).toBe(true);
      expect(subcommands.every((c) => typeof c.description === "string")).toBe(true);

      // Verify some core commands exist (stable across versions)
      expect(names).toContain("list");
      expect(names).toContain("completion");
    });
  });

  describe("extractGlobalOptions", () => {
    it("extracts global options including help and version", () => {
      const options = extractGlobalOptions(program);
      const names = options.map((c) => c.name);

      // Commander auto-adds these
      expect(names).toContain("--help");
      expect(names).toContain("--version");

      // Our global options from createProgram
      expect(names).toContain("--config");
      expect(names).toContain("--library");
    });
  });

  describe("OPTION_VALUES", () => {
    it("has values for --sort option", () => {
      expect(OPTION_VALUES["--sort"]).toBeDefined();
      expect(OPTION_VALUES["--sort"].length).toBeGreaterThan(0);
    });

    it("has values for --order option", () => {
      expect(OPTION_VALUES["--order"]).toBeDefined();
      expect(OPTION_VALUES["--order"]).toContain("asc");
      expect(OPTION_VALUES["--order"]).toContain("desc");
    });

    it("has values for --format option", () => {
      expect(OPTION_VALUES["--format"]).toBeDefined();
      expect(OPTION_VALUES["--format"]).toContain("text");
    });

    it("has values for --style option", () => {
      expect(OPTION_VALUES["--style"]).toBeDefined();
      expect(OPTION_VALUES["--style"].length).toBeGreaterThan(0);
    });

    it("has values for --log-level option", () => {
      expect(OPTION_VALUES["--log-level"]).toBeDefined();
      expect(OPTION_VALUES["--log-level"]).toContain("silent");
      expect(OPTION_VALUES["--log-level"]).toContain("info");
      expect(OPTION_VALUES["--log-level"]).toContain("debug");
    });
  });

  describe("getCompletions", () => {
    it("returns subcommands when no arguments", () => {
      const env = createEnv({ line: "ref ", last: "" });
      const completions = getCompletions(env, program);
      const names = completions.map((c) => c.name);

      // Should return all subcommands
      expect(completions.length).toEqual(extractSubcommands(program).length);
      expect(names).toContain("list");
      expect(names).toContain("completion");
    });

    it("returns filtered subcommands for partial match", () => {
      const env = createEnv({ line: "ref l", last: "l" });
      const completions = getCompletions(env, program);
      const names = completions.map((c) => c.name);

      // Should only return commands starting with 'l'
      expect(names).toContain("list");
      expect(completions.every((c) => c.name.startsWith("l"))).toBe(true);
    });

    it("returns options when option prefix is typed after command", () => {
      const env = createEnv({ line: "ref list --", last: "--" });
      const completions = getCompletions(env, program);
      const names = completions.map((c) => c.name);

      // Should include global options
      expect(names).toContain("--help");
      expect(names).toContain("--config");

      // Should include command-specific options
      expect(names.some((n) => n.startsWith("--"))).toBe(true);
    });

    it("returns option values for --sort", () => {
      const env = createEnv({ line: "ref list --sort ", prev: "--sort", last: "" });
      const completions = getCompletions(env, program);
      const names = completions.map((c) => c.name);

      // Should return sort field values
      expect(names).toEqual(expect.arrayContaining(OPTION_VALUES["--sort"] as string[]));
    });

    it("returns option values for --order", () => {
      const env = createEnv({ line: "ref list --order ", prev: "--order", last: "" });
      const completions = getCompletions(env, program);
      const names = completions.map((c) => c.name);

      expect(names).toContain("asc");
      expect(names).toContain("desc");
    });

    it("returns option values for --format", () => {
      const env = createEnv({ line: "ref cite --format ", prev: "--format", last: "" });
      const completions = getCompletions(env, program);
      const names = completions.map((c) => c.name);

      expect(names).toEqual(expect.arrayContaining(OPTION_VALUES["--format"] as string[]));
    });

    it("returns option values for --style", () => {
      const env = createEnv({ line: "ref cite --style ", prev: "--style", last: "" });
      const completions = getCompletions(env, program);
      const names = completions.map((c) => c.name);

      expect(names).toEqual(expect.arrayContaining(OPTION_VALUES["--style"] as string[]));
    });

    it("returns option values for --log-level", () => {
      const env = createEnv({ line: "ref list --log-level ", prev: "--log-level", last: "" });
      const completions = getCompletions(env, program);
      const names = completions.map((c) => c.name);

      expect(names).toContain("silent");
      expect(names).toContain("info");
      expect(names).toContain("debug");
    });

    it("returns nested subcommands for fulltext command", () => {
      const env = createEnv({ line: "ref fulltext ", last: "" });
      const completions = getCompletions(env, program);
      const names = completions.map((c) => c.name);

      // fulltext has subcommands: attach, get, detach
      expect(names).toContain("attach");
      expect(names).toContain("get");
      expect(names).toContain("detach");
    });

    it("returns nested subcommands for server command", () => {
      const env = createEnv({ line: "ref server ", last: "" });
      const completions = getCompletions(env, program);
      const names = completions.map((c) => c.name);

      // server has subcommands: start, stop, status
      expect(names).toContain("start");
      expect(names).toContain("stop");
      expect(names).toContain("status");
    });

    it("returns nested subcommands for completion command", () => {
      const env = createEnv({ line: "ref completion ", last: "" });
      const completions = getCompletions(env, program);

      // completion has no nested subcommands (uses argument instead)
      // So it returns main subcommands
      expect(completions.length).toBeGreaterThan(0);
    });
  });

  describe("needsIdCompletion", () => {
    it("returns false when no arguments", () => {
      const env = createEnv({ line: "ref ", prev: "", last: "" });
      const result = needsIdCompletion(env);

      expect(result.needs).toBe(false);
    });

    it("returns true for cite command", () => {
      const env = createEnv({ line: "ref cite ", prev: "cite", last: "" });
      const result = needsIdCompletion(env);

      expect(result.needs).toBe(true);
      expect(result.command).toBe("cite");
    });

    it("returns true for remove command", () => {
      const env = createEnv({ line: "ref remove ", prev: "remove", last: "" });
      const result = needsIdCompletion(env);

      expect(result.needs).toBe(true);
      expect(result.command).toBe("remove");
    });

    it("returns true for update command", () => {
      const env = createEnv({ line: "ref update ", prev: "update", last: "" });
      const result = needsIdCompletion(env);

      expect(result.needs).toBe(true);
      expect(result.command).toBe("update");
    });

    it("returns false for list command", () => {
      const env = createEnv({ line: "ref list ", prev: "list", last: "" });
      const result = needsIdCompletion(env);

      expect(result.needs).toBe(false);
    });

    it("returns true for fulltext get subcommand", () => {
      const env = createEnv({ line: "ref fulltext get ", prev: "get", last: "" });
      const result = needsIdCompletion(env);

      expect(result.needs).toBe(true);
      expect(result.command).toBe("fulltext");
      expect(result.subcommand).toBe("get");
    });

    it("returns true for fulltext attach subcommand", () => {
      const env = createEnv({ line: "ref fulltext attach ", prev: "attach", last: "" });
      const result = needsIdCompletion(env);

      expect(result.needs).toBe(true);
      expect(result.command).toBe("fulltext");
      expect(result.subcommand).toBe("attach");
    });

    it("returns true for fulltext detach subcommand", () => {
      const env = createEnv({ line: "ref fulltext detach ", prev: "detach", last: "" });
      const result = needsIdCompletion(env);

      expect(result.needs).toBe(true);
      expect(result.command).toBe("fulltext");
      expect(result.subcommand).toBe("detach");
    });

    it("returns false when completing option value", () => {
      const env = createEnv({ line: "ref cite --style ", prev: "--style", last: "" });
      const result = needsIdCompletion(env);

      expect(result.needs).toBe(false);
    });
  });

  describe("installCompletion", () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it("calls tabtab.install with correct options", async () => {
      const tabtab = await import("tabtab");

      await installCompletion();

      expect(tabtab.install).toHaveBeenCalledWith({
        name: "ref",
        completer: "ref",
      });
    });
  });

  describe("uninstallCompletion", () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it("calls tabtab.uninstall with correct options", async () => {
      const tabtab = await import("tabtab");

      await uninstallCompletion();

      expect(tabtab.uninstall).toHaveBeenCalledWith({
        name: "ref",
      });
    });
  });

  describe("getIdCompletions", () => {
    let tempDir: string;
    let libraryPath: string;

    beforeEach(async () => {
      tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "completion-test-"));
      libraryPath = path.join(tempDir, "references.json");
    });

    afterEach(async () => {
      await fs.rm(tempDir, { recursive: true, force: true });
    });

    it("returns empty array for empty library", async () => {
      await fs.writeFile(libraryPath, "[]", "utf-8");
      const library = await Library.load(libraryPath);

      const completions = await getIdCompletions(library, "");

      expect(completions).toEqual([]);
    });

    it("returns all IDs when no prefix", async () => {
      const items = [
        { id: "smith2023", type: "article-journal", title: "RNA interference study" },
        { id: "jones2024", type: "article-journal", title: "CRISPR applications" },
      ];
      await fs.writeFile(libraryPath, JSON.stringify(items), "utf-8");
      const library = await Library.load(libraryPath);

      const completions = await getIdCompletions(library, "");

      expect(completions).toHaveLength(2);
      expect(completions.map((c) => c.name)).toContain("smith2023");
      expect(completions.map((c) => c.name)).toContain("jones2024");
    });

    it("filters IDs by prefix (case-insensitive)", async () => {
      const items = [
        { id: "smith2023", type: "article-journal", title: "RNA study" },
        { id: "jones2024", type: "article-journal", title: "CRISPR" },
        { id: "Smith2024", type: "article-journal", title: "Another study" },
      ];
      await fs.writeFile(libraryPath, JSON.stringify(items), "utf-8");
      const library = await Library.load(libraryPath);

      const completions = await getIdCompletions(library, "smi");

      expect(completions).toHaveLength(2);
      expect(completions.map((c) => c.name)).toContain("smith2023");
      expect(completions.map((c) => c.name)).toContain("Smith2024");
    });

    it("includes truncated title as description", async () => {
      const longTitle =
        "A very long title that exceeds the maximum length for completion descriptions and needs truncation";
      const items = [{ id: "test2023", type: "article-journal", title: longTitle }];
      await fs.writeFile(libraryPath, JSON.stringify(items), "utf-8");
      const library = await Library.load(libraryPath);

      const completions = await getIdCompletions(library, "");

      expect(completions).toHaveLength(1);
      expect(completions[0]?.name).toBe("test2023");
      expect(completions[0]?.description).toContain("...");
      expect((completions[0]?.description ?? "").length).toBeLessThanOrEqual(40);
    });

    it("limits completions to MAX_ID_COMPLETIONS", async () => {
      // Create more items than MAX_ID_COMPLETIONS
      const itemCount = MAX_ID_COMPLETIONS + 50;
      const items = Array.from({ length: itemCount }, (_, i) => ({
        id: `ref${String(i).padStart(3, "0")}`,
        type: "article-journal",
        title: `Reference ${i}`,
      }));
      await fs.writeFile(libraryPath, JSON.stringify(items), "utf-8");
      const library = await Library.load(libraryPath);

      const completions = await getIdCompletions(library, "");

      expect(completions).toHaveLength(MAX_ID_COMPLETIONS);
    });

    it("handles items without title gracefully", async () => {
      const items = [
        { id: "valid2023", type: "article-journal", title: "Valid" },
        { id: "notitle2024", type: "article-journal" }, // No title field
        { id: "another2024", type: "article-journal", title: "Another" },
      ];
      await fs.writeFile(libraryPath, JSON.stringify(items), "utf-8");
      const library = await Library.load(libraryPath);

      const completions = await getIdCompletions(library, "");

      expect(completions).toHaveLength(3);
      const noTitleItem = completions.find((c) => c.name === "notitle2024");
      expect(noTitleItem?.description).toBe("");
    });
  });
});
