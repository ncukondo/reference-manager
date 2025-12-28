import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CslItem } from "../../core/csl-json/types.js";
import type { Library } from "../../core/library.js";
import { type CiteOperationOptions, citeReferences } from "./cite.js";

// Mock Library
vi.mock("../../core/library.js");

describe("citeReferences", () => {
  let mockLibrary: Library;
  const mockItems: CslItem[] = [
    {
      id: "smith-2023",
      type: "article-journal",
      title: "Machine Learning in Medical Diagnosis",
      author: [{ family: "Smith", given: "John" }],
      issued: { "date-parts": [[2023]] },
      custom: { uuid: "uuid-1", created_at: "", timestamp: "" },
    },
    {
      id: "doe-2024",
      type: "article-journal",
      title: "Deep Learning Applications",
      author: [{ family: "Doe", given: "Jane" }],
      issued: { "date-parts": [[2024]] },
      custom: { uuid: "uuid-2", created_at: "", timestamp: "" },
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    mockLibrary = {
      find: vi.fn((id: string, options?: { idType?: string }) => {
        if (options?.idType === "uuid") {
          return Promise.resolve(mockItems.find((i) => i.custom?.uuid === id));
        }
        return Promise.resolve(mockItems.find((i) => i.id === id));
      }),
      findById: vi.fn((id: string) => mockItems.find((i) => i.id === id)),
      findByUuid: vi.fn((uuid: string) => mockItems.find((i) => i.custom?.uuid === uuid)),
    } as unknown as Library;
  });

  describe("cite by ID", () => {
    it("should generate citation for single reference", async () => {
      const options: CiteOperationOptions = {
        identifiers: ["smith-2023"],
        idType: "id",
      };
      const result = await citeReferences(mockLibrary, options);

      expect(result.results).toHaveLength(1);
      expect(result.results[0].success).toBe(true);
      expect(result.results[0].citation).toContain("Smith");
      expect(result.results[0].citation).toContain("2023");
    });

    it("should generate citation for multiple references", async () => {
      const options: CiteOperationOptions = {
        identifiers: ["smith-2023", "doe-2024"],
        idType: "id",
      };
      const result = await citeReferences(mockLibrary, options);

      expect(result.results).toHaveLength(2);
      expect(result.results[0].success).toBe(true);
      expect(result.results[0].citation).toContain("Smith");
      expect(result.results[1].success).toBe(true);
      expect(result.results[1].citation).toContain("Doe");
    });

    it("should return error result when reference not found", async () => {
      const options: CiteOperationOptions = {
        identifiers: ["nonexistent"],
        idType: "id",
      };
      const result = await citeReferences(mockLibrary, options);

      expect(result.results).toHaveLength(1);
      expect(result.results[0].success).toBe(false);
      expect(result.results[0].error).toContain("nonexistent");
      expect(result.results[0].identifier).toBe("nonexistent");
    });
  });

  describe("mixed found and not found", () => {
    it("should return results for each identifier independently", async () => {
      const options: CiteOperationOptions = {
        identifiers: ["smith-2023", "nonexistent", "doe-2024"],
        idType: "id",
      };
      const result = await citeReferences(mockLibrary, options);

      expect(result.results).toHaveLength(3);
      expect(result.results[0].success).toBe(true);
      expect(result.results[0].citation).toContain("Smith");
      expect(result.results[1].success).toBe(false);
      expect(result.results[1].error).toContain("nonexistent");
      expect(result.results[2].success).toBe(true);
      expect(result.results[2].citation).toContain("Doe");
    });
  });

  describe("cite by UUID", () => {
    it("should generate citation using UUID", async () => {
      const options: CiteOperationOptions = {
        identifiers: ["uuid-1"],
        idType: "uuid",
      };
      const result = await citeReferences(mockLibrary, options);

      expect(result.results).toHaveLength(1);
      expect(result.results[0].success).toBe(true);
      expect(result.results[0].citation).toContain("Smith");
    });

    it("should return error when UUID not found", async () => {
      const options: CiteOperationOptions = {
        identifiers: ["nonexistent-uuid"],
        idType: "uuid",
      };
      const result = await citeReferences(mockLibrary, options);

      expect(result.results).toHaveLength(1);
      expect(result.results[0].success).toBe(false);
      expect(result.results[0].error).toContain("nonexistent-uuid");
    });
  });

  describe("citation styles", () => {
    it("should generate bibliography by default", async () => {
      const options: CiteOperationOptions = {
        identifiers: ["smith-2023"],
      };
      const result = await citeReferences(mockLibrary, options);

      expect(result.results[0].success).toBe(true);
      expect(result.results[0].citation).toBeDefined();
    });

    it("should generate in-text citation when inText is true", async () => {
      const options: CiteOperationOptions = {
        identifiers: ["smith-2023"],
        inText: true,
      };
      const result = await citeReferences(mockLibrary, options);

      expect(result.results[0].success).toBe(true);
      expect(result.results[0].citation).toBeDefined();
    });
  });

  describe("idType default", () => {
    it("should use idType='id' by default", async () => {
      const options: CiteOperationOptions = {
        identifiers: ["smith-2023"],
      };
      await citeReferences(mockLibrary, options);

      expect(mockLibrary.find).toHaveBeenCalledWith("smith-2023", { idType: "id" });
    });
  });
});
