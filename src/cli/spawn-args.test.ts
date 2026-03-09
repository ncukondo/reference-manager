import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { getCliSpawnArgs } from "./spawn-args.js";

describe("getCliSpawnArgs", () => {
  let originalArgv: string[];
  let originalExecPath: string;

  beforeEach(() => {
    originalArgv = process.argv;
    originalExecPath = process.execPath;
  });

  afterEach(() => {
    process.argv = originalArgv;
    process.execPath = originalExecPath;
  });

  test("runtime mode: returns runtime as command with script path prepended", () => {
    process.execPath = "/usr/bin/node";
    process.argv = ["/usr/bin/node", "/path/to/ref.js", "list"];

    const result = getCliSpawnArgs(["server", "start", "--library", "/lib.json"]);

    expect(result).toEqual({
      command: "/usr/bin/node",
      args: ["/path/to/ref.js", "server", "start", "--library", "/lib.json"],
    });
  });

  test("compiled binary mode: returns binary as command without script path", () => {
    process.execPath = "/usr/local/bin/ref";
    process.argv = ["/usr/local/bin/ref", "/usr/local/bin/ref", "list"];

    const result = getCliSpawnArgs(["server", "start", "--library", "/lib.json"]);

    expect(result).toEqual({
      command: "/usr/local/bin/ref",
      args: ["server", "start", "--library", "/lib.json"],
    });
  });

  test("bun runtime mode: returns bun as command with script path prepended", () => {
    process.execPath = "/usr/local/bin/bun";
    process.argv = ["/usr/local/bin/bun", "/path/to/entry-bun.ts", "list"];

    const result = getCliSpawnArgs(["server", "start"]);

    expect(result).toEqual({
      command: "/usr/local/bin/bun",
      args: ["/path/to/entry-bun.ts", "server", "start"],
    });
  });

  test("compiled binary: handles empty cliArgs", () => {
    process.execPath = "/usr/local/bin/ref";
    process.argv = ["/usr/local/bin/ref", "/usr/local/bin/ref"];

    const result = getCliSpawnArgs([]);

    expect(result).toEqual({
      command: "/usr/local/bin/ref",
      args: [],
    });
  });

  test("runtime mode: falls back to execPath when argv[1] is missing", () => {
    process.execPath = "/usr/bin/node";
    process.argv = ["/usr/bin/node"];

    const result = getCliSpawnArgs(["server", "start"]);

    expect(result).toEqual({
      command: "/usr/bin/node",
      args: ["/usr/bin/node", "server", "start"],
    });
  });
});
