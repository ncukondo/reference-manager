/**
 * Tests for config CLI command
 */

import { Command } from "commander";
import { describe, expect, it } from "vitest";
import { registerConfigCommand } from "./config.js";

describe("config command", () => {
  function createProgram(): Command {
    const program = new Command();
    program.exitOverride();
    program.configureOutput({
      writeOut: () => {},
      writeErr: () => {},
    });
    registerConfigCommand(program);
    return program;
  }

  describe("subcommand routing", () => {
    it("should register show subcommand", () => {
      const program = createProgram();
      const configCmd = program.commands.find((cmd) => cmd.name() === "config");
      expect(configCmd).toBeDefined();

      const showCmd = configCmd?.commands.find((cmd) => cmd.name() === "show");
      expect(showCmd).toBeDefined();
    });

    it("should register get subcommand", () => {
      const program = createProgram();
      const configCmd = program.commands.find((cmd) => cmd.name() === "config");
      const getCmd = configCmd?.commands.find((cmd) => cmd.name() === "get");
      expect(getCmd).toBeDefined();
    });

    it("should register set subcommand", () => {
      const program = createProgram();
      const configCmd = program.commands.find((cmd) => cmd.name() === "config");
      const setCmd = configCmd?.commands.find((cmd) => cmd.name() === "set");
      expect(setCmd).toBeDefined();
    });

    it("should register unset subcommand", () => {
      const program = createProgram();
      const configCmd = program.commands.find((cmd) => cmd.name() === "config");
      const unsetCmd = configCmd?.commands.find((cmd) => cmd.name() === "unset");
      expect(unsetCmd).toBeDefined();
    });

    it("should register list-keys subcommand", () => {
      const program = createProgram();
      const configCmd = program.commands.find((cmd) => cmd.name() === "config");
      const listKeysCmd = configCmd?.commands.find((cmd) => cmd.name() === "list-keys");
      expect(listKeysCmd).toBeDefined();
    });

    it("should register path subcommand", () => {
      const program = createProgram();
      const configCmd = program.commands.find((cmd) => cmd.name() === "config");
      const pathCmd = configCmd?.commands.find((cmd) => cmd.name() === "path");
      expect(pathCmd).toBeDefined();
    });

    it("should register edit subcommand", () => {
      const program = createProgram();
      const configCmd = program.commands.find((cmd) => cmd.name() === "config");
      const editCmd = configCmd?.commands.find((cmd) => cmd.name() === "edit");
      expect(editCmd).toBeDefined();
    });
  });

  describe("option parsing", () => {
    it("should parse show --json option", async () => {
      const program = createProgram();
      const configCmd = program.commands.find((cmd) => cmd.name() === "config");
      const showCmd = configCmd?.commands.find((cmd) => cmd.name() === "show");

      expect(showCmd?.options.some((opt) => opt.long === "--json")).toBe(true);
    });

    it("should parse show --section option", async () => {
      const program = createProgram();
      const configCmd = program.commands.find((cmd) => cmd.name() === "config");
      const showCmd = configCmd?.commands.find((cmd) => cmd.name() === "show");

      expect(showCmd?.options.some((opt) => opt.long === "--section")).toBe(true);
    });

    it("should parse show --sources option", async () => {
      const program = createProgram();
      const configCmd = program.commands.find((cmd) => cmd.name() === "config");
      const showCmd = configCmd?.commands.find((cmd) => cmd.name() === "show");

      expect(showCmd?.options.some((opt) => opt.long === "--sources")).toBe(true);
    });

    it("should parse get --config-only option", async () => {
      const program = createProgram();
      const configCmd = program.commands.find((cmd) => cmd.name() === "config");
      const getCmd = configCmd?.commands.find((cmd) => cmd.name() === "get");

      expect(getCmd?.options.some((opt) => opt.long === "--config-only")).toBe(true);
    });

    it("should parse set --local option", async () => {
      const program = createProgram();
      const configCmd = program.commands.find((cmd) => cmd.name() === "config");
      const setCmd = configCmd?.commands.find((cmd) => cmd.name() === "set");

      expect(setCmd?.options.some((opt) => opt.long === "--local")).toBe(true);
    });

    it("should parse list-keys --section option", async () => {
      const program = createProgram();
      const configCmd = program.commands.find((cmd) => cmd.name() === "config");
      const listKeysCmd = configCmd?.commands.find((cmd) => cmd.name() === "list-keys");

      expect(listKeysCmd?.options.some((opt) => opt.long === "--section")).toBe(true);
    });

    it("should parse path --user and --local options", async () => {
      const program = createProgram();
      const configCmd = program.commands.find((cmd) => cmd.name() === "config");
      const pathCmd = configCmd?.commands.find((cmd) => cmd.name() === "path");

      expect(pathCmd?.options.some((opt) => opt.long === "--user")).toBe(true);
      expect(pathCmd?.options.some((opt) => opt.long === "--local")).toBe(true);
    });

    it("should parse edit --local option", async () => {
      const program = createProgram();
      const configCmd = program.commands.find((cmd) => cmd.name() === "config");
      const editCmd = configCmd?.commands.find((cmd) => cmd.name() === "edit");

      expect(editCmd?.options.some((opt) => opt.long === "--local")).toBe(true);
    });
  });

  describe("command descriptions", () => {
    it("should have description for config command", () => {
      const program = createProgram();
      const configCmd = program.commands.find((cmd) => cmd.name() === "config");

      expect(configCmd?.description()).toContain("config");
    });

    it("should have description for each subcommand", () => {
      const program = createProgram();
      const configCmd = program.commands.find((cmd) => cmd.name() === "config");

      for (const subCmd of configCmd?.commands ?? []) {
        expect(subCmd.description()).toBeTruthy();
      }
    });
  });
});
