import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { resolveEditor } from "./editor-resolver.js";

describe("resolveEditor", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
    process.env.VISUAL = undefined;
    process.env.EDITOR = undefined;
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe("environment variable resolution", () => {
    it("uses $VISUAL when set", () => {
      process.env.VISUAL = "code --wait";
      const editor = resolveEditor();
      expect(editor).toBe("code --wait");
    });

    it("uses $EDITOR when $VISUAL is not set", () => {
      process.env.EDITOR = "vim";
      const editor = resolveEditor();
      expect(editor).toBe("vim");
    });

    it("prefers $VISUAL over $EDITOR", () => {
      process.env.VISUAL = "code --wait";
      process.env.EDITOR = "vim";
      const editor = resolveEditor();
      expect(editor).toBe("code --wait");
    });

    it("ignores empty $VISUAL and uses $EDITOR", () => {
      process.env.VISUAL = "";
      process.env.EDITOR = "vim";
      const editor = resolveEditor();
      expect(editor).toBe("vim");
    });
  });

  describe("platform fallback", () => {
    it("falls back to vi on Linux/macOS when no editor is set", () => {
      const editor = resolveEditor("linux");
      expect(editor).toBe("vi");
    });

    it("falls back to vi on darwin (macOS)", () => {
      const editor = resolveEditor("darwin");
      expect(editor).toBe("vi");
    });

    it("falls back to notepad on Windows", () => {
      const editor = resolveEditor("win32");
      expect(editor).toBe("notepad");
    });
  });
});
