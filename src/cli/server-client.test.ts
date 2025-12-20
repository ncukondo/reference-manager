import { beforeEach, describe, expect, test, vi } from "vitest";
import type { CslItem } from "../core/csl-json/types.js";
import { ServerClient } from "./server-client.js";

// Mock fetch
global.fetch = vi.fn();

describe("ServerClient", () => {
  let client: ServerClient;
  const baseUrl = "http://localhost:3000";

  beforeEach(() => {
    client = new ServerClient(baseUrl);
    vi.clearAllMocks();
  });

  describe("constructor", () => {
    test("should create client with base URL", () => {
      expect(client).toBeInstanceOf(ServerClient);
    });
  });

  describe("getAll", () => {
    test("should fetch all references", async () => {
      const mockReferences: CslItem[] = [
        {
          type: "article-journal",
          title: "Test Article",
          custom: { uuid: "uuid-1", timestamp: "2025-01-01T00:00:00Z" },
        },
      ];

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => mockReferences,
      } as Response);

      const result = await client.getAll();

      expect(fetch).toHaveBeenCalledWith(`${baseUrl}/api/references`);
      expect(result).toEqual(mockReferences);
    });

    test("should throw error on fetch failure", async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: false,
        text: async () => "Server error",
      } as Response);

      await expect(client.getAll()).rejects.toThrow("Server error");
    });
  });

  describe("findByUuid", () => {
    test("should fetch reference by UUID", async () => {
      const mockReference: CslItem = {
        type: "article-journal",
        title: "Test Article",
        custom: { uuid: "uuid-1", timestamp: "2025-01-01T00:00:00Z" },
      };

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => mockReference,
      } as Response);

      const result = await client.findByUuid("uuid-1");

      expect(fetch).toHaveBeenCalledWith(`${baseUrl}/api/references/uuid-1`);
      expect(result).toEqual(mockReference);
    });

    test("should return null on 404", async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: false,
        status: 404,
      } as Response);

      const result = await client.findByUuid("uuid-not-found");

      expect(result).toBeNull();
    });

    test("should throw error on other fetch failures", async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: false,
        status: 500,
        text: async () => "Internal server error",
      } as Response);

      await expect(client.findByUuid("uuid-1")).rejects.toThrow("Internal server error");
    });
  });

  describe("add", () => {
    test("should add new reference", async () => {
      const newItem: CslItem = {
        type: "article-journal",
        title: "New Article",
      };

      const createdItem: CslItem = {
        ...newItem,
        custom: { uuid: "uuid-new", timestamp: "2025-01-01T00:00:00Z" },
      };

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: async () => createdItem,
      } as Response);

      const result = await client.add(newItem);

      expect(fetch).toHaveBeenCalledWith(`${baseUrl}/api/references`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newItem),
      });
      expect(result).toEqual(createdItem);
    });

    test("should throw error on add failure", async () => {
      const newItem: CslItem = {
        type: "article-journal",
        title: "New Article",
      };

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: false,
        text: async () => "Invalid item",
      } as Response);

      await expect(client.add(newItem)).rejects.toThrow("Invalid item");
    });
  });

  describe("update", () => {
    test("should update reference", async () => {
      const updatedItem: CslItem = {
        type: "article-journal",
        title: "Updated Article",
        custom: { uuid: "uuid-1", timestamp: "2025-01-02T00:00:00Z" },
      };

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => updatedItem,
      } as Response);

      const result = await client.update("uuid-1", updatedItem);

      expect(fetch).toHaveBeenCalledWith(`${baseUrl}/api/references/uuid-1`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedItem),
      });
      expect(result).toEqual(updatedItem);
    });

    test("should throw error on update failure", async () => {
      const updatedItem: CslItem = {
        type: "article-journal",
        title: "Updated Article",
      };

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: false,
        text: async () => "Reference not found",
      } as Response);

      await expect(client.update("uuid-1", updatedItem)).rejects.toThrow("Reference not found");
    });
  });

  describe("remove", () => {
    test("should remove reference", async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        status: 204,
      } as Response);

      await client.remove("uuid-1");

      expect(fetch).toHaveBeenCalledWith(`${baseUrl}/api/references/uuid-1`, {
        method: "DELETE",
      });
    });

    test("should throw error on remove failure", async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: false,
        text: async () => "Reference not found",
      } as Response);

      await expect(client.remove("uuid-1")).rejects.toThrow("Reference not found");
    });
  });

  describe("addFromInputs", () => {
    test("should add references from inputs", async () => {
      const mockResult = {
        added: [{ id: "Smith-2024", title: "Test Paper" }],
        failed: [],
        skipped: [],
      };

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResult,
      } as Response);

      const result = await client.addFromInputs(["10.1234/test"], { force: false });

      expect(fetch).toHaveBeenCalledWith(`${baseUrl}/api/add`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inputs: ["10.1234/test"], options: { force: false } }),
      });
      expect(result).toEqual(mockResult);
    });

    test("should pass format option", async () => {
      const mockResult = {
        added: [],
        failed: [],
        skipped: [],
      };

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResult,
      } as Response);

      await client.addFromInputs(["test.bib"], { force: true, format: "bibtex" });

      expect(fetch).toHaveBeenCalledWith(`${baseUrl}/api/add`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inputs: ["test.bib"], options: { force: true, format: "bibtex" } }),
      });
    });

    test("should throw error on failure", async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: false,
        text: async () => "Server error",
      } as Response);

      await expect(client.addFromInputs(["invalid"])).rejects.toThrow("Server error");
    });
  });
});
