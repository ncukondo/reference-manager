import { promises as fs } from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  getPortfilePath,
  isProcessRunning,
  portfileExists,
  readPortfile,
  removePortfile,
  writePortfile,
} from "./portfile.js";

describe("Portfile Management", () => {
  let testPortfilePath: string;

  beforeEach(async () => {
    // Use a test-specific portfile path
    const tmpDir = os.tmpdir();
    testPortfilePath = path.join(tmpDir, `reference-manager-test-${Date.now()}.port`);
  });

  afterEach(async () => {
    // Clean up test portfile
    try {
      await fs.unlink(testPortfilePath);
    } catch {
      // Ignore if file doesn't exist
    }
  });

  describe("getPortfilePath", () => {
    it("should return path in tmpdir", () => {
      const portfilePath = getPortfilePath();
      expect(portfilePath).toContain(os.tmpdir());
      expect(portfilePath).toMatch(/reference-manager.*\.port$/);
    });
  });

  describe("writePortfile", () => {
    it("should write port and pid to file", async () => {
      await writePortfile(testPortfilePath, 3000, 12345);

      const content = await fs.readFile(testPortfilePath, "utf-8");
      const data = JSON.parse(content);

      expect(data.port).toBe(3000);
      expect(data.pid).toBe(12345);
    });

    it("should create parent directory if it doesn't exist", async () => {
      const nestedPath = path.join(os.tmpdir(), `test-nested-${Date.now()}`, "server.port");

      try {
        await writePortfile(nestedPath, 3001, 12346);

        const content = await fs.readFile(nestedPath, "utf-8");
        const data = JSON.parse(content);

        expect(data.port).toBe(3001);
        expect(data.pid).toBe(12346);

        // Clean up
        await fs.unlink(nestedPath);
        await fs.rmdir(path.dirname(nestedPath));
      } catch (error) {
        // Clean up on error
        try {
          await fs.unlink(nestedPath);
          await fs.rmdir(path.dirname(nestedPath));
        } catch {
          // Ignore cleanup errors
        }
        throw error;
      }
    });

    it("should overwrite existing portfile", async () => {
      await writePortfile(testPortfilePath, 3000, 12345);
      await writePortfile(testPortfilePath, 4000, 54321);

      const content = await fs.readFile(testPortfilePath, "utf-8");
      const data = JSON.parse(content);

      expect(data.port).toBe(4000);
      expect(data.pid).toBe(54321);
    });
  });

  describe("readPortfile", () => {
    it("should read port and pid from file", async () => {
      await writePortfile(testPortfilePath, 3000, 12345);

      const data = await readPortfile(testPortfilePath);

      expect(data).toEqual({ port: 3000, pid: 12345 });
    });

    it("should return null if file does not exist", async () => {
      const nonExistentPath = path.join(os.tmpdir(), `non-existent-${Date.now()}.port`);
      const data = await readPortfile(nonExistentPath);

      expect(data).toBeNull();
    });

    it("should return null if file contains invalid JSON", async () => {
      await fs.writeFile(testPortfilePath, "invalid json content");

      const data = await readPortfile(testPortfilePath);

      expect(data).toBeNull();
    });

    it("should return null if file is missing required fields", async () => {
      await fs.writeFile(testPortfilePath, JSON.stringify({ port: 3000 }));

      const data = await readPortfile(testPortfilePath);

      expect(data).toBeNull();
    });
  });

  describe("portfileExists", () => {
    it("should return true if portfile exists", async () => {
      await writePortfile(testPortfilePath, 3000, 12345);

      const exists = await portfileExists(testPortfilePath);

      expect(exists).toBe(true);
    });

    it("should return false if portfile does not exist", async () => {
      const nonExistentPath = path.join(os.tmpdir(), `non-existent-${Date.now()}.port`);

      const exists = await portfileExists(nonExistentPath);

      expect(exists).toBe(false);
    });
  });

  describe("removePortfile", () => {
    it("should remove portfile", async () => {
      await writePortfile(testPortfilePath, 3000, 12345);

      await removePortfile(testPortfilePath);

      const exists = await portfileExists(testPortfilePath);
      expect(exists).toBe(false);
    });

    it("should not throw if portfile does not exist", async () => {
      const nonExistentPath = path.join(os.tmpdir(), `non-existent-${Date.now()}.port`);

      await expect(removePortfile(nonExistentPath)).resolves.toBeUndefined();
    });
  });

  describe("isProcessRunning", () => {
    it("should return true for the current process", () => {
      const result = isProcessRunning(process.pid);

      expect(result).toBe(true);
    });

    it("should return false for non-existent process", () => {
      // Use a very high PID that is unlikely to exist
      const nonExistentPid = 999999;

      const result = isProcessRunning(nonExistentPid);

      expect(result).toBe(false);
    });

    it("should return false for PID 0", () => {
      const result = isProcessRunning(0);

      expect(result).toBe(false);
    });

    it("should return false for negative PID", () => {
      const result = isProcessRunning(-1);

      expect(result).toBe(false);
    });
  });
});
