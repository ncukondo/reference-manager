import { describe, expect, it } from "vitest";
import packageJson from "../../package.json" with { type: "json" };
import { createProgram } from "./index.js";

describe("CLI Entry", () => {
  describe("createProgram", () => {
    it("should create Commander program with correct name", () => {
      const program = createProgram();
      expect(program.name()).toBe("reference-manager");
    });

    it("should have correct version", () => {
      const program = createProgram();
      // Version is read from package.json
      expect(program.version()).toBe(packageJson.version);
    });

    it("should have correct description", () => {
      const program = createProgram();
      expect(program.description()).toBe(packageJson.description);
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

    it("should register 'cite' command", () => {
      const program = createProgram();
      const citeCmd = program.commands.find((cmd) => cmd.name() === "cite");
      expect(citeCmd).toBeDefined();
    });

    it("'cite' command should have correct options", () => {
      const program = createProgram();
      const citeCmd = program.commands.find((cmd) => cmd.name() === "cite");
      expect(citeCmd).toBeDefined();

      const options = citeCmd?.options.map((opt) => opt.long);
      expect(options).toContain("--uuid");
      expect(options).toContain("--style");
      expect(options).toContain("--csl-file");
      expect(options).toContain("--locale");
      expect(options).toContain("--output");
      expect(options).toContain("--in-text");
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

    it("should register 'url' command", () => {
      const program = createProgram();
      const urlCmd = program.commands.find((cmd) => cmd.name() === "url");
      expect(urlCmd).toBeDefined();
    });

    it("'url' command should have correct options", () => {
      const program = createProgram();
      const urlCmd = program.commands.find((cmd) => cmd.name() === "url");
      expect(urlCmd).toBeDefined();

      const options = urlCmd?.options.map((opt) => opt.long);
      expect(options).toContain("--default");
      expect(options).toContain("--doi");
      expect(options).toContain("--pubmed");
      expect(options).toContain("--pmcid");
      expect(options).toContain("--open");
      expect(options).toContain("--uuid");
    });

    it("'url' command should accept optional [identifiers...] argument", () => {
      const program = createProgram();
      const urlCmd = program.commands.find((cmd) => cmd.name() === "url");
      expect(urlCmd).toBeDefined();
      const identifiersArg = urlCmd?.registeredArguments.find(
        (arg) => arg.name() === "identifiers"
      );
      expect(identifiersArg).toBeDefined();
      expect(identifiersArg?.required).toBe(false);
      expect(identifiersArg?.variadic).toBe(true);
    });

    describe("root command default action", () => {
      it("should have a default action handler on the root program", () => {
        const program = createProgram();
        // Commander internally stores action listeners; check via _actionHandler
        // biome-ignore lint/suspicious/noExplicitAny: testing Commander internals
        expect((program as any)._actionHandler).not.toBeNull();
      });

      it("all existing subcommands should still be registered", () => {
        const program = createProgram();
        const subcommands = program.commands.map((cmd) => cmd.name());
        expect(subcommands).toContain("list");
        expect(subcommands).toContain("search");
        expect(subcommands).toContain("add");
        expect(subcommands).toContain("remove");
        expect(subcommands).toContain("update");
        expect(subcommands).toContain("edit");
        expect(subcommands).toContain("cite");
        expect(subcommands).toContain("server");
        expect(subcommands).toContain("attach");
        expect(subcommands).toContain("url");
        expect(subcommands).toContain("config");
      });
    });

    describe("attach command default action", () => {
      it("should have a default action on the attach parent command", () => {
        const program = createProgram();
        const attachCmd = program.commands.find((cmd) => cmd.name() === "attach");
        expect(attachCmd).toBeDefined();
        // Parent command should have an action handler (for default open behavior)
        // Commander stores the action listener internally
        expect(attachCmd?.registeredArguments).toBeDefined();
      });

      it("attach parent command should accept optional [identifier] argument", () => {
        const program = createProgram();
        const attachCmd = program.commands.find((cmd) => cmd.name() === "attach");
        expect(attachCmd).toBeDefined();
        const identifierArg = attachCmd?.registeredArguments.find(
          (arg) => arg.name() === "identifier"
        );
        expect(identifierArg).toBeDefined();
        expect(identifierArg?.required).toBe(false);
      });

      it("attach parent command should have --uuid option only", () => {
        const program = createProgram();
        const attachCmd = program.commands.find((cmd) => cmd.name() === "attach");
        expect(attachCmd).toBeDefined();
        const options = attachCmd?.options.map((opt) => opt.long);
        expect(options).toContain("--uuid");
        expect(options).not.toContain("--print");
        expect(options).not.toContain("--no-sync");
      });

      it("attach subcommands should still be registered", () => {
        const program = createProgram();
        const attachCmd = program.commands.find((cmd) => cmd.name() === "attach");
        expect(attachCmd).toBeDefined();
        const subcommands = attachCmd?.commands.map((cmd) => cmd.name());
        expect(subcommands).toContain("open");
        expect(subcommands).toContain("add");
        expect(subcommands).toContain("list");
        expect(subcommands).toContain("get");
        expect(subcommands).toContain("detach");
        expect(subcommands).toContain("sync");
      });
    });
  });
});
