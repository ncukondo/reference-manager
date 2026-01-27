import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CslItem } from "../../core/csl-json/types.js";
import type {
  ILibrary,
  RemoveResult,
  UpdateOptions,
  UpdateResult,
} from "../../core/library-interface.js";

// Mock the operation functions
vi.mock("./search.js", () => ({
  searchReferences: vi.fn(),
}));

vi.mock("./list.js", () => ({
  listReferences: vi.fn(),
}));

vi.mock("./cite.js", () => ({
  citeReferences: vi.fn(),
}));

vi.mock("./add.js", () => ({
  addReferences: vi.fn(),
}));

vi.mock("./attachments/index.js", () => ({
  addAttachment: vi.fn(),
  listAttachments: vi.fn(),
  getAttachment: vi.fn(),
  detachAttachment: vi.fn(),
  syncAttachments: vi.fn(),
  openAttachment: vi.fn(),
}));

describe("OperationsLibrary", () => {
  const mockItem: CslItem = {
    id: "smith2023",
    type: "article-journal",
    title: "Test Article",
    author: [{ family: "Smith", given: "John" }],
  };

  const createMockLibrary = (): ILibrary => ({
    find: vi.fn(),
    getAll: vi.fn(),
    add: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
    save: vi.fn(),
  });

  describe("ILibrary delegation", () => {
    it("should delegate find() to underlying library", async () => {
      const { OperationsLibrary } = await import("./operations-library.js");
      const mockLibrary = createMockLibrary();
      vi.mocked(mockLibrary.find).mockResolvedValue(mockItem);

      const ops = new OperationsLibrary(mockLibrary);
      const result = await ops.find("smith2023");

      expect(mockLibrary.find).toHaveBeenCalledWith("smith2023", undefined);
      expect(result).toBe(mockItem);
    });

    it("should delegate find() with idType option", async () => {
      const { OperationsLibrary } = await import("./operations-library.js");
      const mockLibrary = createMockLibrary();
      vi.mocked(mockLibrary.find).mockResolvedValue(mockItem);

      const ops = new OperationsLibrary(mockLibrary);
      const result = await ops.find("some-uuid", { idType: "uuid" });

      expect(mockLibrary.find).toHaveBeenCalledWith("some-uuid", { idType: "uuid" });
      expect(result).toBe(mockItem);
    });

    it("should delegate getAll() to underlying library", async () => {
      const { OperationsLibrary } = await import("./operations-library.js");
      const mockLibrary = createMockLibrary();
      vi.mocked(mockLibrary.getAll).mockResolvedValue([mockItem]);

      const ops = new OperationsLibrary(mockLibrary);
      const result = await ops.getAll();

      expect(mockLibrary.getAll).toHaveBeenCalled();
      expect(result).toEqual([mockItem]);
    });

    it("should delegate add() to underlying library", async () => {
      const { OperationsLibrary } = await import("./operations-library.js");
      const mockLibrary = createMockLibrary();
      vi.mocked(mockLibrary.add).mockResolvedValue(mockItem);

      const ops = new OperationsLibrary(mockLibrary);
      const result = await ops.add(mockItem);

      expect(mockLibrary.add).toHaveBeenCalledWith(mockItem);
      expect(result).toBe(mockItem);
    });

    it("should delegate update() to underlying library", async () => {
      const { OperationsLibrary } = await import("./operations-library.js");
      const mockLibrary = createMockLibrary();
      const updateResult: UpdateResult = {
        updated: true,
        idChanged: false,
        item: mockItem,
      };
      vi.mocked(mockLibrary.update).mockResolvedValue(updateResult);

      const ops = new OperationsLibrary(mockLibrary);
      const options: UpdateOptions = { onIdCollision: "error" };
      const result = await ops.update("smith2023", { title: "New Title" }, options);

      expect(mockLibrary.update).toHaveBeenCalledWith("smith2023", { title: "New Title" }, options);
      expect(result).toBe(updateResult);
    });

    it("should delegate remove() to underlying library", async () => {
      const { OperationsLibrary } = await import("./operations-library.js");
      const mockLibrary = createMockLibrary();
      const removeResult: RemoveResult = { removed: true, removedItem: mockItem };
      vi.mocked(mockLibrary.remove).mockResolvedValue(removeResult);

      const ops = new OperationsLibrary(mockLibrary);
      const result = await ops.remove("smith2023");

      expect(mockLibrary.remove).toHaveBeenCalledWith("smith2023", undefined);
      expect(result).toBe(removeResult);
    });

    it("should delegate save() to underlying library", async () => {
      const { OperationsLibrary } = await import("./operations-library.js");
      const mockLibrary = createMockLibrary();
      vi.mocked(mockLibrary.save).mockResolvedValue(undefined);

      const ops = new OperationsLibrary(mockLibrary);
      await ops.save();

      expect(mockLibrary.save).toHaveBeenCalled();
    });
  });

  describe("high-level operations", () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it("should call searchReferences for search()", async () => {
      const { OperationsLibrary } = await import("./operations-library.js");
      const { searchReferences } = await import("./search.js");
      const mockLibrary = createMockLibrary();
      const searchResult = { items: ["Smith (2023)"] };
      vi.mocked(searchReferences).mockResolvedValue(searchResult);

      const ops = new OperationsLibrary(mockLibrary);
      const result = await ops.search({ query: "Smith" });

      expect(searchReferences).toHaveBeenCalledWith(mockLibrary, { query: "Smith" });
      expect(result).toBe(searchResult);
    });

    it("should call searchReferences with format option", async () => {
      const { OperationsLibrary } = await import("./operations-library.js");
      const { searchReferences } = await import("./search.js");
      const mockLibrary = createMockLibrary();
      const searchResult = { items: ["smith2023"] };
      vi.mocked(searchReferences).mockResolvedValue(searchResult);

      const ops = new OperationsLibrary(mockLibrary);
      const result = await ops.search({ query: "Smith", format: "ids-only" });

      expect(searchReferences).toHaveBeenCalledWith(mockLibrary, {
        query: "Smith",
        format: "ids-only",
      });
      expect(result).toBe(searchResult);
    });

    it("should call listReferences for list()", async () => {
      const { OperationsLibrary } = await import("./operations-library.js");
      const { listReferences } = await import("./list.js");
      const mockLibrary = createMockLibrary();
      const listResult = { items: ["Smith (2023)"] };
      vi.mocked(listReferences).mockResolvedValue(listResult);

      const ops = new OperationsLibrary(mockLibrary);
      const result = await ops.list();

      expect(listReferences).toHaveBeenCalledWith(mockLibrary, {});
      expect(result).toBe(listResult);
    });

    it("should call listReferences with format option", async () => {
      const { OperationsLibrary } = await import("./operations-library.js");
      const { listReferences } = await import("./list.js");
      const mockLibrary = createMockLibrary();
      const listResult = { items: [JSON.stringify(mockItem)] };
      vi.mocked(listReferences).mockResolvedValue(listResult);

      const ops = new OperationsLibrary(mockLibrary);
      const result = await ops.list({ format: "json" });

      expect(listReferences).toHaveBeenCalledWith(mockLibrary, { format: "json" });
      expect(result).toBe(listResult);
    });

    it("should call citeReferences for cite()", async () => {
      const { OperationsLibrary } = await import("./operations-library.js");
      const { citeReferences } = await import("./cite.js");
      const mockLibrary = createMockLibrary();
      const citeResult = {
        results: [{ identifier: "smith2023", found: true, citation: "Smith (2023)" }],
      };
      vi.mocked(citeReferences).mockResolvedValue(citeResult);

      // Without citationConfig, defaultStyle and cslDirectory should not be included
      const ops = new OperationsLibrary(mockLibrary);
      const result = await ops.cite({ identifiers: ["smith2023"] });

      expect(citeReferences).toHaveBeenCalledWith(mockLibrary, {
        identifiers: ["smith2023"],
      });
      expect(result).toBe(citeResult);
    });

    it("should call citeReferences with all options", async () => {
      const { OperationsLibrary } = await import("./operations-library.js");
      const { citeReferences } = await import("./cite.js");
      const mockLibrary = createMockLibrary();
      const citeResult = {
        results: [{ identifier: "smith2023", found: true, citation: "Smith (2023)" }],
      };
      vi.mocked(citeReferences).mockResolvedValue(citeResult);

      // Without citationConfig, defaultStyle and cslDirectory should not be included
      const ops = new OperationsLibrary(mockLibrary);
      const options = {
        identifiers: ["smith2023"],
        style: "apa",
        format: "html" as const,
        inText: true,
      };
      const result = await ops.cite(options);

      expect(citeReferences).toHaveBeenCalledWith(mockLibrary, options);
      expect(result).toBe(citeResult);
    });

    it("should merge citationConfig defaults into cite options", async () => {
      const { OperationsLibrary } = await import("./operations-library.js");
      const { citeReferences } = await import("./cite.js");
      const mockLibrary = createMockLibrary();
      const citeResult = {
        results: [{ identifier: "smith2023", found: true, citation: "Smith (2023)" }],
      };
      vi.mocked(citeReferences).mockResolvedValue(citeResult);

      const citationConfig = {
        defaultStyle: "vancouver",
        cslDirectory: ["/custom/csl"],
        defaultLocale: "en-US",
        defaultFormat: "text" as const,
      };
      const ops = new OperationsLibrary(mockLibrary, citationConfig);
      const result = await ops.cite({ identifiers: ["smith2023"] });

      expect(citeReferences).toHaveBeenCalledWith(mockLibrary, {
        identifiers: ["smith2023"],
        defaultStyle: "vancouver",
        cslDirectory: ["/custom/csl"],
      });
      expect(result).toBe(citeResult);
    });

    it("should allow explicit options to override citationConfig defaults", async () => {
      const { OperationsLibrary } = await import("./operations-library.js");
      const { citeReferences } = await import("./cite.js");
      const mockLibrary = createMockLibrary();
      const citeResult = {
        results: [{ identifier: "smith2023", found: true, citation: "Smith (2023)" }],
      };
      vi.mocked(citeReferences).mockResolvedValue(citeResult);

      const citationConfig = {
        defaultStyle: "vancouver",
        cslDirectory: ["/custom/csl"],
        defaultLocale: "en-US",
        defaultFormat: "text" as const,
      };
      const ops = new OperationsLibrary(mockLibrary, citationConfig);
      const result = await ops.cite({
        identifiers: ["smith2023"],
        defaultStyle: "apa",
        cslDirectory: ["/other/csl"],
      });

      // Explicit options should take precedence
      expect(citeReferences).toHaveBeenCalledWith(mockLibrary, {
        identifiers: ["smith2023"],
        defaultStyle: "apa",
        cslDirectory: ["/other/csl"],
      });
      expect(result).toBe(citeResult);
    });

    it("should call addReferences for import()", async () => {
      const { OperationsLibrary } = await import("./operations-library.js");
      const { addReferences } = await import("./add.js");
      const mockLibrary = createMockLibrary();
      const addResult = {
        added: [{ id: "smith2023", title: "Test Article" }],
        failed: [],
        skipped: [],
      };
      vi.mocked(addReferences).mockResolvedValue(addResult);

      const ops = new OperationsLibrary(mockLibrary);
      const result = await ops.import(["10.1234/test"]);

      expect(addReferences).toHaveBeenCalledWith(["10.1234/test"], mockLibrary, {});
      expect(result).toBe(addResult);
    });

    it("should call addReferences with options", async () => {
      const { OperationsLibrary } = await import("./operations-library.js");
      const { addReferences } = await import("./add.js");
      const mockLibrary = createMockLibrary();
      const addResult = {
        added: [{ id: "smith2023", title: "Test Article" }],
        failed: [],
        skipped: [],
      };
      vi.mocked(addReferences).mockResolvedValue(addResult);

      const ops = new OperationsLibrary(mockLibrary);
      const result = await ops.import(["10.1234/test"], { force: true, format: "bibtex" });

      expect(addReferences).toHaveBeenCalledWith(["10.1234/test"], mockLibrary, {
        force: true,
        format: "bibtex",
      });
      expect(result).toBe(addResult);
    });
  });

  describe("attachment operations", () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it("should call addAttachment for attachAdd()", async () => {
      const { OperationsLibrary } = await import("./operations-library.js");
      const { addAttachment } = await import("./attachments/index.js");
      const mockLibrary = createMockLibrary();
      const addResult = { success: true, filename: "test.pdf", directory: "smith2023-abc12345" };
      vi.mocked(addAttachment).mockResolvedValue(addResult);

      const ops = new OperationsLibrary(mockLibrary);
      const options = {
        identifier: "smith2023",
        filePath: "/path/to/file.pdf",
        role: "supplement",
        attachmentsDirectory: "/attachments",
      };
      const result = await ops.attachAdd(options);

      expect(addAttachment).toHaveBeenCalledWith(mockLibrary, options);
      expect(result).toBe(addResult);
    });

    it("should call listAttachments for attachList()", async () => {
      const { OperationsLibrary } = await import("./operations-library.js");
      const { listAttachments } = await import("./attachments/index.js");
      const mockLibrary = createMockLibrary();
      const listResult = {
        success: true,
        files: [{ filename: "test.pdf", role: "supplement" }],
        directory: "smith2023-abc12345",
      };
      vi.mocked(listAttachments).mockResolvedValue(listResult);

      const ops = new OperationsLibrary(mockLibrary);
      const options = { identifier: "smith2023", attachmentsDirectory: "/attachments" };
      const result = await ops.attachList(options);

      expect(listAttachments).toHaveBeenCalledWith(mockLibrary, options);
      expect(result).toBe(listResult);
    });

    it("should call getAttachment for attachGet()", async () => {
      const { OperationsLibrary } = await import("./operations-library.js");
      const { getAttachment } = await import("./attachments/index.js");
      const mockLibrary = createMockLibrary();
      const getResult = { success: true, path: "/attachments/smith2023/test.pdf" };
      vi.mocked(getAttachment).mockResolvedValue(getResult);

      const ops = new OperationsLibrary(mockLibrary);
      const options = {
        identifier: "smith2023",
        filename: "test.pdf",
        attachmentsDirectory: "/attachments",
      };
      const result = await ops.attachGet(options);

      expect(getAttachment).toHaveBeenCalledWith(mockLibrary, options);
      expect(result).toBe(getResult);
    });

    it("should call detachAttachment for attachDetach()", async () => {
      const { OperationsLibrary } = await import("./operations-library.js");
      const { detachAttachment } = await import("./attachments/index.js");
      const mockLibrary = createMockLibrary();
      const detachResult = { success: true, detached: ["test.pdf"], deleted: [] };
      vi.mocked(detachAttachment).mockResolvedValue(detachResult);

      const ops = new OperationsLibrary(mockLibrary);
      const options = {
        identifier: "smith2023",
        filename: "test.pdf",
        attachmentsDirectory: "/attachments",
      };
      const result = await ops.attachDetach(options);

      expect(detachAttachment).toHaveBeenCalledWith(mockLibrary, options);
      expect(result).toBe(detachResult);
    });

    it("should call syncAttachments for attachSync()", async () => {
      const { OperationsLibrary } = await import("./operations-library.js");
      const { syncAttachments } = await import("./attachments/index.js");
      const mockLibrary = createMockLibrary();
      const syncResult = { success: true, added: [], removed: [], newFiles: [], missingFiles: [] };
      vi.mocked(syncAttachments).mockResolvedValue(syncResult);

      const ops = new OperationsLibrary(mockLibrary);
      const options = { identifier: "smith2023", attachmentsDirectory: "/attachments" };
      const result = await ops.attachSync(options);

      expect(syncAttachments).toHaveBeenCalledWith(mockLibrary, options);
      expect(result).toBe(syncResult);
    });

    it("should call openAttachment for attachOpen()", async () => {
      const { OperationsLibrary } = await import("./operations-library.js");
      const { openAttachment } = await import("./attachments/index.js");
      const mockLibrary = createMockLibrary();
      const openResult = { success: true, path: "/attachments/smith2023" };
      vi.mocked(openAttachment).mockResolvedValue(openResult);

      const ops = new OperationsLibrary(mockLibrary);
      const options = { identifier: "smith2023", attachmentsDirectory: "/attachments" };
      const result = await ops.attachOpen(options);

      expect(openAttachment).toHaveBeenCalledWith(mockLibrary, options);
      expect(result).toBe(openResult);
    });
  });
});
