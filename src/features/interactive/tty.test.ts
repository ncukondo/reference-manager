/**
 * Tests for TTY detection
 */

import { afterEach, describe, expect, it } from "vitest";
import { TTYError, checkTTY } from "./tty.js";

describe("TTY detection", () => {
  const originalIsTTY = process.stdin.isTTY;
  const originalStdoutIsTTY = process.stdout.isTTY;

  afterEach(() => {
    // Restore original values
    Object.defineProperty(process.stdin, "isTTY", {
      value: originalIsTTY,
      writable: true,
    });
    Object.defineProperty(process.stdout, "isTTY", {
      value: originalStdoutIsTTY,
      writable: true,
    });
  });

  describe("checkTTY", () => {
    it("should not throw when stdin is TTY", () => {
      Object.defineProperty(process.stdin, "isTTY", {
        value: true,
        writable: true,
      });
      Object.defineProperty(process.stdout, "isTTY", {
        value: true,
        writable: true,
      });

      expect(() => checkTTY()).not.toThrow();
    });

    it("should throw TTYError when stdin is not TTY", () => {
      Object.defineProperty(process.stdin, "isTTY", {
        value: false,
        writable: true,
      });
      Object.defineProperty(process.stdout, "isTTY", {
        value: true,
        writable: true,
      });

      expect(() => checkTTY()).toThrow(TTYError);
      expect(() => checkTTY()).toThrow("Interactive mode requires a TTY");
    });

    it("should throw TTYError when stdin is undefined", () => {
      Object.defineProperty(process.stdin, "isTTY", {
        value: undefined,
        writable: true,
      });
      Object.defineProperty(process.stdout, "isTTY", {
        value: true,
        writable: true,
      });

      expect(() => checkTTY()).toThrow(TTYError);
    });

    it("should throw TTYError when stdout is not TTY", () => {
      Object.defineProperty(process.stdin, "isTTY", {
        value: true,
        writable: true,
      });
      Object.defineProperty(process.stdout, "isTTY", {
        value: false,
        writable: true,
      });

      expect(() => checkTTY()).toThrow(TTYError);
      expect(() => checkTTY()).toThrow("Interactive mode requires a TTY");
    });

    it("should throw TTYError when both stdin and stdout are not TTY", () => {
      Object.defineProperty(process.stdin, "isTTY", {
        value: false,
        writable: true,
      });
      Object.defineProperty(process.stdout, "isTTY", {
        value: false,
        writable: true,
      });

      expect(() => checkTTY()).toThrow(TTYError);
    });
  });

  describe("TTYError", () => {
    it("should have exit code 1", () => {
      const error = new TTYError("Test message");
      expect(error.exitCode).toBe(1);
    });

    it("should have correct name", () => {
      const error = new TTYError("Test message");
      expect(error.name).toBe("TTYError");
    });

    it("should be instance of Error", () => {
      const error = new TTYError("Test message");
      expect(error).toBeInstanceOf(Error);
    });
  });
});
