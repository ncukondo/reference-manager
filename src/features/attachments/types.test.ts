import { describe, expect, it } from "vitest";
import {
  type AttachmentFile,
  type Attachments,
  RESERVED_ROLES,
  isReservedRole,
  isValidFulltextFiles,
} from "./types.js";

describe("AttachmentFile interface", () => {
  it("should allow valid attachment file with required fields", () => {
    const file: AttachmentFile = {
      filename: "fulltext.pdf",
      role: "fulltext",
    };
    expect(file.filename).toBe("fulltext.pdf");
    expect(file.role).toBe("fulltext");
    expect(file.label).toBeUndefined();
  });

  it("should allow attachment file with optional label", () => {
    const file: AttachmentFile = {
      filename: "supplement-table-s1.xlsx",
      role: "supplement",
      label: "Table S1",
    };
    expect(file.label).toBe("Table S1");
  });
});

describe("Attachments interface", () => {
  it("should allow valid attachments container", () => {
    const attachments: Attachments = {
      directory: "Smith-2024-PMID12345678-123e4567",
      files: [
        { filename: "fulltext.pdf", role: "fulltext" },
        { filename: "fulltext.md", role: "fulltext" },
      ],
    };
    expect(attachments.directory).toBe("Smith-2024-PMID12345678-123e4567");
    expect(attachments.files).toHaveLength(2);
  });

  it("should allow empty files array", () => {
    const attachments: Attachments = {
      directory: "Smith-2024-123e4567",
      files: [],
    };
    expect(attachments.files).toHaveLength(0);
  });
});

describe("RESERVED_ROLES", () => {
  it("should contain all reserved roles", () => {
    expect(RESERVED_ROLES).toContain("fulltext");
    expect(RESERVED_ROLES).toContain("supplement");
    expect(RESERVED_ROLES).toContain("notes");
    expect(RESERVED_ROLES).toContain("draft");
  });

  it("should have exactly 4 reserved roles", () => {
    expect(RESERVED_ROLES).toHaveLength(4);
  });
});

describe("isReservedRole", () => {
  it("should return true for reserved roles", () => {
    expect(isReservedRole("fulltext")).toBe(true);
    expect(isReservedRole("supplement")).toBe(true);
    expect(isReservedRole("notes")).toBe(true);
    expect(isReservedRole("draft")).toBe(true);
  });

  it("should return false for custom roles", () => {
    expect(isReservedRole("slides")).toBe(false);
    expect(isReservedRole("poster")).toBe(false);
    expect(isReservedRole("code")).toBe(false);
    expect(isReservedRole("data")).toBe(false);
  });

  it("should return false for empty string", () => {
    expect(isReservedRole("")).toBe(false);
  });
});

describe("isValidFulltextFiles", () => {
  it("should return true for empty files array", () => {
    expect(isValidFulltextFiles([])).toBe(true);
  });

  it("should return true for single PDF fulltext", () => {
    const files: AttachmentFile[] = [{ filename: "fulltext.pdf", role: "fulltext" }];
    expect(isValidFulltextFiles(files)).toBe(true);
  });

  it("should return true for single Markdown fulltext", () => {
    const files: AttachmentFile[] = [{ filename: "fulltext.md", role: "fulltext" }];
    expect(isValidFulltextFiles(files)).toBe(true);
  });

  it("should return true for one PDF and one Markdown fulltext", () => {
    const files: AttachmentFile[] = [
      { filename: "fulltext.pdf", role: "fulltext" },
      { filename: "fulltext.md", role: "fulltext" },
    ];
    expect(isValidFulltextFiles(files)).toBe(true);
  });

  it("should return false for two PDF fulltexts", () => {
    const files: AttachmentFile[] = [
      { filename: "fulltext.pdf", role: "fulltext" },
      { filename: "fulltext-alt.pdf", role: "fulltext" },
    ];
    expect(isValidFulltextFiles(files)).toBe(false);
  });

  it("should return false for two Markdown fulltexts", () => {
    const files: AttachmentFile[] = [
      { filename: "fulltext.md", role: "fulltext" },
      { filename: "fulltext-alt.md", role: "fulltext" },
    ];
    expect(isValidFulltextFiles(files)).toBe(false);
  });

  it("should return false for more than two fulltext files", () => {
    const files: AttachmentFile[] = [
      { filename: "fulltext.pdf", role: "fulltext" },
      { filename: "fulltext.md", role: "fulltext" },
      { filename: "fulltext-extra.pdf", role: "fulltext" },
    ];
    expect(isValidFulltextFiles(files)).toBe(false);
  });

  it("should ignore non-fulltext files", () => {
    const files: AttachmentFile[] = [
      { filename: "fulltext.pdf", role: "fulltext" },
      { filename: "fulltext.md", role: "fulltext" },
      { filename: "supplement.xlsx", role: "supplement" },
      { filename: "notes.md", role: "notes" },
    ];
    expect(isValidFulltextFiles(files)).toBe(true);
  });
});
