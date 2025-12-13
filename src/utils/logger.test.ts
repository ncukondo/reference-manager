import { beforeEach, describe, expect, it, vi } from "vitest";
import { type LogLevel, createLogger } from "./logger";

describe("Logger", () => {
  let _stdoutSpy: ReturnType<typeof vi.spyOn>;
  let stderrSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    _stdoutSpy = vi.spyOn(process.stdout, "write").mockImplementation(() => true);
    stderrSpy = vi.spyOn(process.stderr, "write").mockImplementation(() => true);
  });

  describe("createLogger", () => {
    it("should create logger with default log level (info)", () => {
      const logger = createLogger();
      expect(logger).toBeDefined();
      expect(logger.info).toBeDefined();
      expect(logger.debug).toBeDefined();
      expect(logger.error).toBeDefined();
    });

    it("should create logger with specified log level", () => {
      const logger = createLogger("debug");
      expect(logger).toBeDefined();
    });

    it("should accept valid log levels", () => {
      const levels: LogLevel[] = ["silent", "info", "debug"];
      for (const level of levels) {
        const logger = createLogger(level);
        expect(logger).toBeDefined();
      }
    });
  });

  describe("info level logging", () => {
    it("should log info messages to stderr when level is info", () => {
      const logger = createLogger("info");
      logger.info("test info message");

      expect(stderrSpy).toHaveBeenCalledWith(expect.stringContaining("test info message"));
      expect(stderrSpy).toHaveBeenCalledWith(expect.stringContaining("\n"));
    });

    it("should log error messages to stderr when level is info", () => {
      const logger = createLogger("info");
      logger.error("test error message");

      expect(stderrSpy).toHaveBeenCalledWith(expect.stringContaining("test error message"));
    });

    it("should NOT log debug messages when level is info", () => {
      const logger = createLogger("info");
      logger.debug("test debug message");

      expect(stderrSpy).not.toHaveBeenCalled();
    });
  });

  describe("debug level logging", () => {
    it("should log debug messages to stderr when level is debug", () => {
      const logger = createLogger("debug");
      logger.debug("test debug message");

      expect(stderrSpy).toHaveBeenCalledWith(expect.stringContaining("test debug message"));
    });

    it("should log info messages when level is debug", () => {
      const logger = createLogger("debug");
      logger.info("test info message");

      expect(stderrSpy).toHaveBeenCalledWith(expect.stringContaining("test info message"));
    });

    it("should log error messages when level is debug", () => {
      const logger = createLogger("debug");
      logger.error("test error message");

      expect(stderrSpy).toHaveBeenCalledWith(expect.stringContaining("test error message"));
    });
  });

  describe("silent level logging", () => {
    it("should NOT log info messages when level is silent", () => {
      const logger = createLogger("silent");
      logger.info("test info message");

      expect(stderrSpy).not.toHaveBeenCalled();
    });

    it("should NOT log debug messages when level is silent", () => {
      const logger = createLogger("silent");
      logger.debug("test debug message");

      expect(stderrSpy).not.toHaveBeenCalled();
    });

    it("should log error messages even when level is silent", () => {
      const logger = createLogger("silent");
      logger.error("test error message");

      expect(stderrSpy).toHaveBeenCalledWith(expect.stringContaining("test error message"));
    });
  });

  describe("formatting", () => {
    it("should add newline to messages", () => {
      const logger = createLogger("info");
      logger.info("test");

      expect(stderrSpy).toHaveBeenCalledWith("test\n");
    });

    it("should handle empty messages", () => {
      const logger = createLogger("info");
      logger.info("");

      expect(stderrSpy).toHaveBeenCalledWith("\n");
    });

    it("should handle multiple arguments", () => {
      const logger = createLogger("info");
      logger.info("test", "multiple", "args");

      expect(stderrSpy).toHaveBeenCalledWith("test multiple args\n");
    });
  });

  describe("error handling", () => {
    it("should always log errors regardless of log level", () => {
      const levels: LogLevel[] = ["silent", "info", "debug"];

      for (const level of levels) {
        stderrSpy.mockClear();
        const logger = createLogger(level);
        logger.error("error message");

        expect(stderrSpy).toHaveBeenCalledWith(expect.stringContaining("error message"));
      }
    });
  });
});
