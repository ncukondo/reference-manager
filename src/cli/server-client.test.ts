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

  describe("find", () => {
    test("should fetch reference by UUID when byUuid is true", async () => {
      const mockReference: CslItem = {
        type: "article-journal",
        title: "Test Article",
        custom: { uuid: "uuid-1", timestamp: "2025-01-01T00:00:00Z" },
      };

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => mockReference,
      } as Response);

      const result = await client.find("uuid-1", { byUuid: true });

      expect(fetch).toHaveBeenCalledWith(`${baseUrl}/api/references/uuid/uuid-1`);
      expect(result).toEqual(mockReference);
    });

    test("should fetch reference by citation ID when byUuid is false", async () => {
      const mockReference: CslItem = {
        id: "Smith-2024",
        type: "article-journal",
        title: "Test Article",
        custom: { uuid: "uuid-1", timestamp: "2025-01-01T00:00:00Z" },
      };

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => mockReference,
      } as Response);

      const result = await client.find("Smith-2024", { byUuid: false });

      expect(fetch).toHaveBeenCalledWith(`${baseUrl}/api/references/id/Smith-2024`);
      expect(result).toEqual(mockReference);
    });

    test("should default to ID lookup when no options provided", async () => {
      const mockReference: CslItem = {
        id: "Smith-2024",
        type: "article-journal",
        title: "Test Article",
      };

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => mockReference,
      } as Response);

      const result = await client.find("Smith-2024");

      expect(fetch).toHaveBeenCalledWith(`${baseUrl}/api/references/id/Smith-2024`);
      expect(result).toEqual(mockReference);
    });

    test("should return null on 404", async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: false,
        status: 404,
      } as Response);

      const result = await client.find("uuid-not-found", { byUuid: true });

      expect(result).toBeNull();
    });

    test("should throw error on other fetch failures", async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: false,
        status: 500,
        text: async () => "Internal server error",
      } as Response);

      await expect(client.find("uuid-1", { byUuid: true })).rejects.toThrow(
        "Internal server error"
      );
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
    test("should update reference by UUID when byUuid is true", async () => {
      const updates = { title: "Updated Article" };
      const updateResult = {
        updated: true,
        item: {
          id: "test-1",
          type: "article-journal",
          title: "Updated Article",
          custom: { uuid: "uuid-1", timestamp: "2025-01-02T00:00:00Z" },
        },
      };

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => updateResult,
      } as Response);

      const result = await client.update("uuid-1", updates, { byUuid: true });

      expect(fetch).toHaveBeenCalledWith(`${baseUrl}/api/references/uuid/uuid-1`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      expect(result).toEqual(updateResult);
    });

    test("should update reference by citation ID when byUuid is false", async () => {
      const updates = { title: "Updated Article" };
      const updateResult = {
        updated: true,
        item: {
          id: "Smith-2024",
          type: "article-journal",
          title: "Updated Article",
        },
      };

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => updateResult,
      } as Response);

      const result = await client.update("Smith-2024", updates, { byUuid: false });

      expect(fetch).toHaveBeenCalledWith(`${baseUrl}/api/references/id/Smith-2024`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      expect(result).toEqual(updateResult);
    });

    test("should default to ID lookup when no options provided", async () => {
      const updates = { title: "Updated Article" };
      const updateResult = { updated: true };

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => updateResult,
      } as Response);

      await client.update("Smith-2024", updates);

      expect(fetch).toHaveBeenCalledWith(`${baseUrl}/api/references/id/Smith-2024`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
    });

    test("should return not found result for 404", async () => {
      const updates = { title: "Updated Article" };
      const updateResult = { updated: false };

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: async () => updateResult,
      } as Response);

      const result = await client.update("uuid-1", updates, { byUuid: true });

      expect(result).toEqual(updateResult);
    });

    test("should return ID collision result for 409", async () => {
      const updates = { id: "existing-id" };
      const updateResult = { updated: false, idCollision: true };

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: false,
        status: 409,
        json: async () => updateResult,
      } as Response);

      const result = await client.update("uuid-1", updates, { byUuid: true });

      expect(result).toEqual(updateResult);
    });

    test("should throw error on update failure", async () => {
      const updates = { title: "Updated Article" };

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: false,
        status: 500,
        text: async () => "Server error",
      } as Response);

      await expect(client.update("uuid-1", updates, { byUuid: true })).rejects.toThrow(
        "Server error"
      );
    });
  });

  describe("remove", () => {
    test("should remove reference by UUID when byUuid is true", async () => {
      const removeResult = { removed: true, item: { id: "test-1", type: "article" } };
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => removeResult,
      } as Response);

      const result = await client.remove("uuid-1", { byUuid: true });

      expect(result).toEqual(removeResult);
      expect(fetch).toHaveBeenCalledWith(`${baseUrl}/api/references/uuid/uuid-1`, {
        method: "DELETE",
      });
    });

    test("should remove reference by citation ID when byUuid is false", async () => {
      const removeResult = { removed: true, item: { id: "Smith-2024", type: "article" } };
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => removeResult,
      } as Response);

      const result = await client.remove("Smith-2024", { byUuid: false });

      expect(result).toEqual(removeResult);
      expect(fetch).toHaveBeenCalledWith(`${baseUrl}/api/references/id/Smith-2024`, {
        method: "DELETE",
      });
    });

    test("should default to ID lookup when no options provided", async () => {
      const removeResult = { removed: true };
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => removeResult,
      } as Response);

      await client.remove("Smith-2024");

      expect(fetch).toHaveBeenCalledWith(`${baseUrl}/api/references/id/Smith-2024`, {
        method: "DELETE",
      });
    });

    test("should return not found result for 404", async () => {
      const removeResult = { removed: false };
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: async () => removeResult,
      } as Response);

      const result = await client.remove("uuid-1", { byUuid: true });

      expect(result).toEqual(removeResult);
    });

    test("should throw error on remove failure", async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: false,
        status: 500,
        text: async () => "Server error",
      } as Response);

      await expect(client.remove("uuid-1", { byUuid: true })).rejects.toThrow("Server error");
    });
  });

  describe("list", () => {
    test("should list references without options", async () => {
      const mockResult = { items: ["Author1 (2024) Title 1", "Author2 (2023) Title 2"] };

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResult,
      } as Response);

      const result = await client.list();

      expect(fetch).toHaveBeenCalledWith(`${baseUrl}/api/list`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      expect(result).toEqual(mockResult);
    });

    test("should pass format option", async () => {
      const mockResult = { items: ["id1", "id2"] };

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResult,
      } as Response);

      const result = await client.list({ format: "ids-only" });

      expect(fetch).toHaveBeenCalledWith(`${baseUrl}/api/list`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ format: "ids-only" }),
      });
      expect(result).toEqual(mockResult);
    });

    test("should throw error on failure", async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: false,
        text: async () => "Server error",
      } as Response);

      await expect(client.list()).rejects.toThrow("Server error");
    });
  });

  describe("search", () => {
    test("should search references with query", async () => {
      const mockResult = { items: ["Author1 (2024) Title 1"] };

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResult,
      } as Response);

      const result = await client.search({ query: "test query" });

      expect(fetch).toHaveBeenCalledWith(`${baseUrl}/api/search`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: "test query" }),
      });
      expect(result).toEqual(mockResult);
    });

    test("should pass format option", async () => {
      const mockResult = { items: ["uuid-1", "uuid-2"] };

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResult,
      } as Response);

      const result = await client.search({ query: "author:Smith", format: "uuid" });

      expect(fetch).toHaveBeenCalledWith(`${baseUrl}/api/search`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: "author:Smith", format: "uuid" }),
      });
      expect(result).toEqual(mockResult);
    });

    test("should throw error on failure", async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: false,
        text: async () => "Search failed",
      } as Response);

      await expect(client.search({ query: "invalid" })).rejects.toThrow("Search failed");
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
