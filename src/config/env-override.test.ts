import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { ENV_OVERRIDE_MAP, getEnvOverride, getEnvOverrideInfo } from "./env-override.js";

describe("env-override", () => {
  // Store original env values
  const originalEnv: Record<string, string | undefined> = {};

  beforeEach(() => {
    // Save current env values
    for (const envVar of Object.keys(ENV_OVERRIDE_MAP)) {
      originalEnv[envVar] = process.env[envVar];
      delete process.env[envVar];
    }
  });

  afterEach(() => {
    // Restore original env values
    for (const [envVar, value] of Object.entries(originalEnv)) {
      if (value === undefined) {
        delete process.env[envVar];
      } else {
        process.env[envVar] = value;
      }
    }
  });

  describe("getEnvOverride", () => {
    it("returns value when REFERENCE_MANAGER_LIBRARY is set", () => {
      process.env.REFERENCE_MANAGER_LIBRARY = "/env/library.json";
      expect(getEnvOverride("library")).toBe("/env/library.json");
    });

    it("returns value when PUBMED_EMAIL is set", () => {
      process.env.PUBMED_EMAIL = "test@example.com";
      expect(getEnvOverride("pubmed.email")).toBe("test@example.com");
    });

    it("returns value when PUBMED_API_KEY is set", () => {
      process.env.PUBMED_API_KEY = "my-api-key";
      expect(getEnvOverride("pubmed.api_key")).toBe("my-api-key");
    });

    it("returns value when REFERENCE_MANAGER_ATTACHMENTS_DIR is set", () => {
      process.env.REFERENCE_MANAGER_ATTACHMENTS_DIR = "/env/attachments";
      expect(getEnvOverride("attachments.directory")).toBe("/env/attachments");
    });

    it("returns value when REFERENCE_MANAGER_CLI_DEFAULT_LIMIT is set", () => {
      process.env.REFERENCE_MANAGER_CLI_DEFAULT_LIMIT = "100";
      expect(getEnvOverride("cli.default_limit")).toBe("100");
    });

    it("returns value when REFERENCE_MANAGER_MCP_DEFAULT_LIMIT is set", () => {
      process.env.REFERENCE_MANAGER_MCP_DEFAULT_LIMIT = "50";
      expect(getEnvOverride("mcp.default_limit")).toBe("50");
    });

    it("returns null when no override is set", () => {
      expect(getEnvOverride("library")).toBeNull();
      expect(getEnvOverride("pubmed.email")).toBeNull();
    });

    it("returns null for keys without env override support", () => {
      expect(getEnvOverride("citation.default_style")).toBeNull();
      expect(getEnvOverride("log_level")).toBeNull();
    });
  });

  describe("getEnvOverrideInfo", () => {
    it("returns info when REFERENCE_MANAGER_LIBRARY is set", () => {
      process.env.REFERENCE_MANAGER_LIBRARY = "/env/library.json";
      const info = getEnvOverrideInfo("library");

      expect(info).not.toBeNull();
      expect(info?.envVar).toBe("REFERENCE_MANAGER_LIBRARY");
      expect(info?.value).toBe("/env/library.json");
    });

    it("returns info with env var name even when not set", () => {
      const info = getEnvOverrideInfo("library");

      expect(info).not.toBeNull();
      expect(info?.envVar).toBe("REFERENCE_MANAGER_LIBRARY");
      expect(info?.value).toBeNull();
    });

    it("returns null for keys without env override support", () => {
      expect(getEnvOverrideInfo("citation.default_style")).toBeNull();
    });
  });
});
