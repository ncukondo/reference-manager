import { describe, expect, it } from "vitest";
import { createProgram } from "./index.js";

describe("CLI Entry", () => {
  describe("createProgram", () => {
    it("should create Commander program with correct name", () => {
      const program = createProgram();
      expect(program.name()).toBe("reference-manager");
    });

    it("should have correct version", () => {
      const program = createProgram();
      // Version is read from package.json (0.1.0)
      expect(program.version()).toBe("0.1.0");
    });

    it("should have correct description", () => {
      const program = createProgram();
      expect(program.description()).toBe(
        "A local reference management tool using CSL-JSON as the single source of truth"
      );
    });

    it("should register 'list' command", () => {
      const program = createProgram();
      const listCmd = program.commands.find((cmd) => cmd.name() === "list");
      expect(listCmd).toBeDefined();
    });

    it("should register 'search' command", () => {
      const program = createProgram();
      const searchCmd = program.commands.find((cmd) => cmd.name() === "search");
      expect(searchCmd).toBeDefined();
    });

    it("should register 'add' command", () => {
      const program = createProgram();
      const addCmd = program.commands.find((cmd) => cmd.name() === "add");
      expect(addCmd).toBeDefined();
    });

    it("should register 'remove' command", () => {
      const program = createProgram();
      const removeCmd = program.commands.find((cmd) => cmd.name() === "remove");
      expect(removeCmd).toBeDefined();
    });

    it("should register 'update' command", () => {
      const program = createProgram();
      const updateCmd = program.commands.find((cmd) => cmd.name() === "update");
      expect(updateCmd).toBeDefined();
    });

    it("should register 'server' command", () => {
      const program = createProgram();
      const serverCmd = program.commands.find((cmd) => cmd.name() === "server");
      expect(serverCmd).toBeDefined();
    });

    it("should have global --library option", () => {
      const program = createProgram();
      const libraryOption = program.options.find((opt) => opt.long === "--library");
      expect(libraryOption).toBeDefined();
    });

    it("should have global --log-level option", () => {
      const program = createProgram();
      const logLevelOption = program.options.find((opt) => opt.long === "--log-level");
      expect(logLevelOption).toBeDefined();
    });
  });
});
