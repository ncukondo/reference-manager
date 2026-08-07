import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CslItem } from "../../core/csl-json/types.js";
import { applyFixAction, getFixActionsForFinding } from "./fix-actions.js";
import type { CheckFinding } from "./types.js";

// Mock fetcher for metadata update
vi.mock("../import/fetcher.js", () => ({
  fetchDoi: vi.fn(),
  fetchPmids: vi.fn(),
}));

describe("getFixActionsForFinding", () => {
  it("should return retraction actions for retracted finding", () => {
    const finding: CheckFinding = {
      type: "retracted",
      message: "This article was retracted on 2024-06-01",
      details: { retractionDoi: "10.1234/retraction", retractionDate: "2024-06-01" },
    };

    const actions = getFixActionsForFinding(finding);

    expect(actions).toHaveLength(4);
    expect(actions.map((a) => a.type)).toEqual([
      "add_retracted_tag",
      "add_retraction_note",
      "remove_from_library",
      "skip",
    ]);
  });

  it("should return version change actions for version_changed finding", () => {
    const finding: CheckFinding = {
      type: "version_changed",
      message: "Published version available: 10.5678/published",
      details: { newDoi: "10.5678/published" },
    };

    const actions = getFixActionsForFinding(finding);

    expect(actions).toHaveLength(4);
    // The additive option is listed first: overwriting in place changes what the preprint's
    // citation key resolves to (#108).
    expect(actions.map((a) => a.type)).toEqual([
      "add_published_and_supersede",
      "update_from_published",
      "add_version_tag",
      "skip",
    ]);
  });

  it("should return concern actions for expression of concern finding", () => {
    const finding: CheckFinding = {
      type: "concern",
      message: "Expression of concern issued",
    };

    const actions = getFixActionsForFinding(finding);

    expect(actions).toHaveLength(3);
    expect(actions.map((a) => a.type)).toEqual(["add_concern_tag", "add_concern_note", "skip"]);
  });

  it("should return empty actions for ok finding", () => {
    const finding: CheckFinding = {
      type: "ok",
      message: "No issues found",
    };

    const actions = getFixActionsForFinding(finding);

    expect(actions).toHaveLength(0);
  });

  it("should include a label for each action", () => {
    const finding: CheckFinding = {
      type: "retracted",
      message: "Retracted",
      details: { retractionDoi: "10.1234/retraction" },
    };

    const actions = getFixActionsForFinding(finding);
    for (const action of actions) {
      expect(action.label).toBeTruthy();
      expect(typeof action.label).toBe("string");
    }
  });
});

describe("applyFixAction", () => {
  let mockLibrary: {
    find: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    remove: ReturnType<typeof vi.fn>;
    save: ReturnType<typeof vi.fn>;
  };

  const baseItem: CslItem = {
    id: "test-2024",
    type: "article-journal",
    title: "Test Article",
    DOI: "10.1234/test",
    custom: { uuid: "uuid-1", tags: ["existing-tag"] },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockLibrary = {
      find: vi.fn(),
      update: vi.fn().mockResolvedValue({ updated: true }),
      remove: vi.fn().mockResolvedValue({ removed: true, removedItem: baseItem }),
      save: vi.fn().mockResolvedValue(undefined),
    };
  });

  describe("add_retracted_tag", () => {
    it("should add 'retracted' tag to reference", async () => {
      const finding: CheckFinding = {
        type: "retracted",
        message: "Retracted",
        details: { retractionDoi: "10.1234/retraction" },
      };

      const result = await applyFixAction(
        mockLibrary as never,
        baseItem,
        finding,
        "add_retracted_tag"
      );

      expect(result.applied).toBe(true);
      expect(mockLibrary.update).toHaveBeenCalledWith(
        "test-2024",
        expect.objectContaining({
          custom: expect.objectContaining({
            tags: expect.arrayContaining(["existing-tag", "retracted"]),
          }),
        }),
        { idType: "id" }
      );
      expect(mockLibrary.save).toHaveBeenCalled();
    });

    it("should not duplicate tag if already present", async () => {
      const itemWithTag: CslItem = {
        ...baseItem,
        custom: { uuid: "uuid-1", tags: ["retracted"] },
      };

      const finding: CheckFinding = {
        type: "retracted",
        message: "Retracted",
      };

      const result = await applyFixAction(
        mockLibrary as never,
        itemWithTag,
        finding,
        "add_retracted_tag"
      );

      expect(result.applied).toBe(true);
      expect(mockLibrary.update).toHaveBeenCalledWith(
        "test-2024",
        expect.objectContaining({
          custom: expect.objectContaining({
            tags: ["retracted"],
          }),
        }),
        { idType: "id" }
      );
    });

    it("should create tags array if custom has no tags", async () => {
      const itemNoTags: CslItem = {
        ...baseItem,
        custom: { uuid: "uuid-1" },
      };

      const finding: CheckFinding = {
        type: "retracted",
        message: "Retracted",
      };

      const result = await applyFixAction(
        mockLibrary as never,
        itemNoTags,
        finding,
        "add_retracted_tag"
      );

      expect(result.applied).toBe(true);
      expect(mockLibrary.update).toHaveBeenCalledWith(
        "test-2024",
        expect.objectContaining({
          custom: expect.objectContaining({
            tags: ["retracted"],
          }),
        }),
        { idType: "id" }
      );
    });
  });

  describe("add_retraction_note", () => {
    it("should add retraction details to note field", async () => {
      const finding: CheckFinding = {
        type: "retracted",
        message: "This article was retracted on 2024-06-01",
        details: { retractionDoi: "10.1234/retraction", retractionDate: "2024-06-01" },
      };

      const result = await applyFixAction(
        mockLibrary as never,
        baseItem,
        finding,
        "add_retraction_note"
      );

      expect(result.applied).toBe(true);
      expect(mockLibrary.update).toHaveBeenCalledWith(
        "test-2024",
        expect.objectContaining({
          note: expect.stringContaining("RETRACTED"),
        }),
        { idType: "id" }
      );
      expect(mockLibrary.save).toHaveBeenCalled();
    });

    it("should append to existing note", async () => {
      const itemWithNote: CslItem = {
        ...baseItem,
        note: "Existing note content",
      };

      const finding: CheckFinding = {
        type: "retracted",
        message: "Retracted",
        details: { retractionDoi: "10.1234/retraction" },
      };

      const result = await applyFixAction(
        mockLibrary as never,
        itemWithNote,
        finding,
        "add_retraction_note"
      );

      expect(result.applied).toBe(true);
      const updateCall = mockLibrary.update.mock.calls[0];
      const noteValue = updateCall[1].note as string;
      expect(noteValue).toContain("Existing note content");
      expect(noteValue).toContain("RETRACTED");
    });
  });

  describe("remove_from_library", () => {
    it("should remove reference from library", async () => {
      const finding: CheckFinding = {
        type: "retracted",
        message: "Retracted",
      };

      const result = await applyFixAction(
        mockLibrary as never,
        baseItem,
        finding,
        "remove_from_library"
      );

      expect(result.applied).toBe(true);
      expect(result.removed).toBe(true);
      expect(mockLibrary.remove).toHaveBeenCalledWith("test-2024", { idType: "id" });
      expect(mockLibrary.save).toHaveBeenCalled();
    });

    it("should report failure if removal fails", async () => {
      mockLibrary.remove.mockResolvedValueOnce({ removed: false });

      const finding: CheckFinding = {
        type: "retracted",
        message: "Retracted",
      };

      const result = await applyFixAction(
        mockLibrary as never,
        baseItem,
        finding,
        "remove_from_library"
      );

      expect(result.applied).toBe(false);
      expect(mockLibrary.save).not.toHaveBeenCalled();
    });
  });

  describe("update_from_published", () => {
    it("should fetch and update metadata from published DOI", async () => {
      const { fetchDoi } = await import("../import/fetcher.js");
      const mockFetch = vi.mocked(fetchDoi);
      mockFetch.mockResolvedValueOnce({
        success: true,
        item: {
          id: "published-2024",
          type: "article-journal",
          title: "Published Title",
          DOI: "10.5678/published",
          "container-title": "Nature",
          volume: "100",
          page: "1-10",
        },
      });

      const finding: CheckFinding = {
        type: "version_changed",
        message: "Published version available",
        details: { newDoi: "10.5678/published" },
      };

      const result = await applyFixAction(
        mockLibrary as never,
        baseItem,
        finding,
        "update_from_published"
      );

      expect(result.applied).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith("10.5678/published");
      expect(mockLibrary.update).toHaveBeenCalledWith(
        "test-2024",
        expect.objectContaining({
          DOI: "10.5678/published",
          title: "Published Title",
          "container-title": "Nature",
        }),
        { idType: "id" }
      );
      expect(mockLibrary.save).toHaveBeenCalled();
    });

    it("should fail if no newDoi in finding details", async () => {
      const finding: CheckFinding = {
        type: "version_changed",
        message: "Published version available",
      };

      const result = await applyFixAction(
        mockLibrary as never,
        baseItem,
        finding,
        "update_from_published"
      );

      expect(result.applied).toBe(false);
      expect(result.message).toContain("No published DOI");
    });

    it("should fail if DOI fetch fails", async () => {
      const { fetchDoi } = await import("../import/fetcher.js");
      const mockFetch = vi.mocked(fetchDoi);
      mockFetch.mockResolvedValueOnce({
        success: false,
        error: "Not found",
        reason: "not_found",
      });

      const finding: CheckFinding = {
        type: "version_changed",
        message: "Published version available",
        details: { newDoi: "10.5678/published" },
      };

      const result = await applyFixAction(
        mockLibrary as never,
        baseItem,
        finding,
        "update_from_published"
      );

      expect(result.applied).toBe(false);
      expect(result.message).toContain("Failed to fetch");
    });
  });

  describe("add_version_tag", () => {
    it("should add 'has-published-version' tag", async () => {
      const finding: CheckFinding = {
        type: "version_changed",
        message: "Published version available",
        details: { newDoi: "10.5678/published" },
      };

      const result = await applyFixAction(
        mockLibrary as never,
        baseItem,
        finding,
        "add_version_tag"
      );

      expect(result.applied).toBe(true);
      expect(mockLibrary.update).toHaveBeenCalledWith(
        "test-2024",
        expect.objectContaining({
          custom: expect.objectContaining({
            tags: expect.arrayContaining(["has-published-version"]),
          }),
        }),
        { idType: "id" }
      );
    });
  });

  describe("add_concern_tag", () => {
    it("should add 'expression-of-concern' tag", async () => {
      const finding: CheckFinding = {
        type: "concern",
        message: "Expression of concern",
      };

      const result = await applyFixAction(
        mockLibrary as never,
        baseItem,
        finding,
        "add_concern_tag"
      );

      expect(result.applied).toBe(true);
      expect(mockLibrary.update).toHaveBeenCalledWith(
        "test-2024",
        expect.objectContaining({
          custom: expect.objectContaining({
            tags: expect.arrayContaining(["expression-of-concern"]),
          }),
        }),
        { idType: "id" }
      );
    });
  });

  describe("add_concern_note", () => {
    it("should add concern details to note field", async () => {
      const finding: CheckFinding = {
        type: "concern",
        message: "Expression of concern issued on 2024-03-01",
      };

      const result = await applyFixAction(
        mockLibrary as never,
        baseItem,
        finding,
        "add_concern_note"
      );

      expect(result.applied).toBe(true);
      expect(mockLibrary.update).toHaveBeenCalledWith(
        "test-2024",
        expect.objectContaining({
          note: expect.stringContaining("EXPRESSION OF CONCERN"),
        }),
        { idType: "id" }
      );
    });
  });

  describe("metadata findings", () => {
    it("should return metadata actions for metadata_mismatch finding", () => {
      const finding: CheckFinding = {
        type: "metadata_mismatch",
        message: "Local metadata significantly differs from the remote record",
        details: {
          updatedFields: ["title", "author"],
          fieldDiffs: [
            { field: "title", local: "Wrong Title", remote: "Correct Title" },
            { field: "author", local: "Smith", remote: "Brown" },
          ],
        },
      };

      const actions = getFixActionsForFinding(finding);

      expect(actions).toHaveLength(2);
      expect(actions.map((a) => a.type)).toEqual(["update_all_fields", "skip"]);
    });

    it("should return metadata actions for metadata_outdated finding", () => {
      const finding: CheckFinding = {
        type: "metadata_outdated",
        message: "Remote metadata has been updated since import",
        details: {
          updatedFields: ["page", "volume"],
          fieldDiffs: [
            { field: "page", local: null, remote: "123-145" },
            { field: "volume", local: null, remote: "42" },
          ],
        },
      };

      const actions = getFixActionsForFinding(finding);

      expect(actions).toHaveLength(2);
      expect(actions.map((a) => a.type)).toEqual(["update_all_fields", "skip"]);
    });
  });

  describe("update_all_fields", () => {
    it("should fetch DOI and update changed fields", async () => {
      const { fetchDoi } = await import("../import/fetcher.js");
      const mockFetch = vi.mocked(fetchDoi);
      mockFetch.mockResolvedValueOnce({
        success: true,
        item: {
          id: "fetched-2024",
          type: "article-journal",
          title: "Correct Title",
          page: "123-145",
          volume: "42",
          DOI: "10.1234/test",
        },
      });

      const finding: CheckFinding = {
        type: "metadata_outdated",
        message: "Remote metadata has been updated since import",
        details: {
          updatedFields: ["page", "volume"],
          fieldDiffs: [
            { field: "page", local: null, remote: "123-145" },
            { field: "volume", local: null, remote: "42" },
          ],
        },
      };

      const result = await applyFixAction(
        mockLibrary as never,
        baseItem,
        finding,
        "update_all_fields"
      );

      expect(result.applied).toBe(true);
      expect(result.message).toContain("page");
      expect(result.message).toContain("volume");
      expect(mockLibrary.update).toHaveBeenCalledWith(
        "test-2024",
        expect.objectContaining({
          page: "123-145",
          volume: "42",
        }),
        { idType: "id" }
      );
      expect(mockLibrary.save).toHaveBeenCalled();
    });

    it("should fail if item has no DOI or PMID", async () => {
      const itemNoId: CslItem = {
        id: "no-id-2024",
        type: "article-journal",
        title: "Test",
        custom: { uuid: "uuid-no-id" },
      };

      const finding: CheckFinding = {
        type: "metadata_outdated",
        message: "Outdated",
        details: { updatedFields: ["page"] },
      };

      const result = await applyFixAction(
        mockLibrary as never,
        itemNoId,
        finding,
        "update_all_fields"
      );

      expect(result.applied).toBe(false);
      expect(result.message).toContain("No DOI or PMID");
    });

    it("should fetch via PubMed for PMID-only items", async () => {
      const { fetchPmids } = await import("../import/fetcher.js");
      const mockFetchPmids = vi.mocked(fetchPmids);
      mockFetchPmids.mockResolvedValueOnce([
        {
          pmid: "12345678",
          success: true,
          item: {
            id: "fetched-pmid",
            type: "article-journal",
            title: "Updated Title",
            page: "100-110",
            volume: "5",
          },
        },
      ]);

      const pmidItem: CslItem = {
        id: "pmid-2024",
        type: "article-journal",
        title: "Old Title",
        PMID: "12345678",
        custom: { uuid: "uuid-pmid" },
      };

      const finding: CheckFinding = {
        type: "metadata_outdated",
        message: "Outdated",
        details: { updatedFields: ["page", "volume"] },
      };

      const result = await applyFixAction(
        mockLibrary as never,
        pmidItem,
        finding,
        "update_all_fields"
      );

      expect(result.applied).toBe(true);
      expect(result.message).toContain("page");
      expect(result.message).toContain("volume");
      expect(mockLibrary.update).toHaveBeenCalledWith(
        "pmid-2024",
        expect.objectContaining({ page: "100-110", volume: "5" }),
        { idType: "id" }
      );
    });

    it("should fail if PubMed fetch fails for PMID-only items", async () => {
      const { fetchPmids } = await import("../import/fetcher.js");
      const mockFetchPmids = vi.mocked(fetchPmids);
      mockFetchPmids.mockResolvedValueOnce([
        {
          pmid: "12345678",
          success: false,
          error: "Not found",
          reason: "not_found",
        },
      ]);

      const pmidItem: CslItem = {
        id: "pmid-fail-2024",
        type: "article-journal",
        title: "Title",
        PMID: "12345678",
        custom: { uuid: "uuid-pmid-fail" },
      };

      const finding: CheckFinding = {
        type: "metadata_outdated",
        message: "Outdated",
        details: { updatedFields: ["page"] },
      };

      const result = await applyFixAction(
        mockLibrary as never,
        pmidItem,
        finding,
        "update_all_fields"
      );

      expect(result.applied).toBe(false);
      expect(result.message).toContain("Failed to fetch metadata for PMID");
    });

    it("should fail if DOI fetch fails", async () => {
      const { fetchDoi } = await import("../import/fetcher.js");
      const mockFetch = vi.mocked(fetchDoi);
      mockFetch.mockResolvedValueOnce({
        success: false,
        error: "Not found",
        reason: "not_found",
      });

      const finding: CheckFinding = {
        type: "metadata_mismatch",
        message: "Mismatch",
        details: { updatedFields: ["title"] },
      };

      const result = await applyFixAction(
        mockLibrary as never,
        baseItem,
        finding,
        "update_all_fields"
      );

      expect(result.applied).toBe(false);
      expect(result.message).toContain("Failed to fetch");
    });
  });

  describe("skip", () => {
    it("should do nothing and return applied=true", async () => {
      const finding: CheckFinding = {
        type: "retracted",
        message: "Retracted",
      };

      const result = await applyFixAction(mockLibrary as never, baseItem, finding, "skip");

      expect(result.applied).toBe(true);
      expect(result.message).toContain("Skipped");
      expect(mockLibrary.update).not.toHaveBeenCalled();
      expect(mockLibrary.remove).not.toHaveBeenCalled();
      expect(mockLibrary.save).not.toHaveBeenCalled();
    });
  });
});

describe("add_published_and_supersede", () => {
  const preprint: CslItem = {
    id: "preprint-2024",
    type: "article-journal",
    title: "Preprint Title",
    DOI: "10.1234/preprint",
    custom: { uuid: "uuid-preprint" },
  };

  const finding: CheckFinding = {
    type: "version_changed",
    message: "Published version available: 10.5678/published",
    details: { newDoi: "10.5678/published" },
  };

  let items: CslItem[];
  let library: {
    find: ReturnType<typeof vi.fn>;
    add: ReturnType<typeof vi.fn>;
    getAll: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    save: ReturnType<typeof vi.fn>;
  };

  function useLibrary(initial: CslItem[]): void {
    items = initial;
    library = {
      find: vi.fn(async (identifier: string, options?: { idType?: string }) =>
        options?.idType === "doi"
          ? items.find((i) => i.DOI === identifier)
          : items.find((i) => i.id === identifier)
      ),
      add: vi.fn(async (item: CslItem) => {
        const added = {
          ...item,
          id: "published-2025",
          custom: { ...item.custom, uuid: "uuid-published" },
        };
        items.push(added);
        return added;
      }),
      getAll: vi.fn(async () => items),
      update: vi.fn(async (id: string, updates: Partial<CslItem>) => {
        const index = items.findIndex((i) => i.id === id);
        if (index === -1) return { updated: false };
        const updated = {
          ...items[index],
          ...updates,
          custom: { ...items[index]?.custom, ...updates.custom },
        } as CslItem;
        items[index] = updated;
        return { updated: true, item: updated };
      }),
      save: vi.fn(async () => undefined),
    };
  }

  beforeEach(() => {
    vi.clearAllMocks();
    useLibrary([{ ...preprint }]);
  });

  it("adds the published version and points the preprint at it", async () => {
    const { fetchDoi } = await import("../import/fetcher.js");
    vi.mocked(fetchDoi).mockResolvedValueOnce({
      success: true,
      item: {
        id: "ignored-id",
        type: "article-journal",
        title: "Published Title",
        DOI: "10.5678/published",
        "container-title": "Nature",
        custom: { uuid: "ignored-uuid" },
      },
    });

    const result = await applyFixAction(
      library as never,
      items[0] as CslItem,
      finding,
      "add_published_and_supersede"
    );

    expect(result.applied).toBe(true);
    expect(result.message).toBe(
      "Added published-2025 and marked preprint-2024 as superseded by it"
    );
    expect(items).toHaveLength(2);
    expect(items[0]?.custom?.superseded_by).toBe("uuid-published");
    expect(items[0]?.custom?.superseded_reason).toBe("published_version");
  });

  // Library.add generates a colliding-safe citation key and a uuid the pointer can target;
  // carrying the fetched ones over would defeat both.
  it("drops the fetched id and custom block before adding", async () => {
    const { fetchDoi } = await import("../import/fetcher.js");
    vi.mocked(fetchDoi).mockResolvedValueOnce({
      success: true,
      item: {
        id: "ignored-id",
        type: "article-journal",
        title: "Published Title",
        DOI: "10.5678/published",
        custom: { uuid: "ignored-uuid" },
      },
    });

    await applyFixAction(
      library as never,
      items[0] as CslItem,
      finding,
      "add_published_and_supersede"
    );

    const added = library.add.mock.calls[0]?.[0] as CslItem;
    expect(added.id).toBeUndefined();
    expect(added.custom).toBeUndefined();
    expect(added.DOI).toBe("10.5678/published");
  });

  // Otherwise the fix would create exactly the duplicate this feature exists to resolve.
  it("reuses a published version that is already in the library", async () => {
    const existing: CslItem = {
      id: "already-here",
      type: "article-journal",
      title: "Published Title",
      DOI: "10.5678/published",
      custom: { uuid: "uuid-existing" },
    };
    useLibrary([{ ...preprint }, existing]);

    const { fetchDoi } = await import("../import/fetcher.js");

    const result = await applyFixAction(
      library as never,
      items[0] as CslItem,
      finding,
      "add_published_and_supersede"
    );

    expect(result.applied).toBe(true);
    expect(fetchDoi).not.toHaveBeenCalled();
    expect(library.add).not.toHaveBeenCalled();
    expect(items).toHaveLength(2);
    expect(items[0]?.custom?.superseded_by).toBe("uuid-existing");
  });

  it("reports a fetch failure without touching the library", async () => {
    const { fetchDoi } = await import("../import/fetcher.js");
    vi.mocked(fetchDoi).mockResolvedValueOnce({ success: false, error: "404 Not Found" } as never);

    const result = await applyFixAction(
      library as never,
      items[0] as CslItem,
      finding,
      "add_published_and_supersede"
    );

    expect(result.applied).toBe(false);
    expect(result.message).toContain("Failed to fetch metadata for 10.5678/published");
    expect(library.add).not.toHaveBeenCalled();
  });

  it("reports a finding with no published DOI", async () => {
    const result = await applyFixAction(
      library as never,
      items[0] as CslItem,
      { type: "version_changed", message: "Published version available" },
      "add_published_and_supersede"
    );

    expect(result.applied).toBe(false);
    expect(result.message).toBe("No published DOI available in finding details");
  });

  // The record was added even though the pointer could not be written; saying "nothing
  // happened" would leave the user unaware of a new entry in their library.
  it("says the record was added when the mark cannot be written", async () => {
    const { fetchDoi } = await import("../import/fetcher.js");
    vi.mocked(fetchDoi).mockResolvedValueOnce({
      success: true,
      item: { id: "x", type: "article-journal", title: "Published", DOI: "10.5678/published" },
    });
    // Make the preprint unreachable by id, so deprecateReference reports not_found
    library.find = vi.fn(async (identifier: string, options?: { idType?: string }) =>
      options?.idType === "doi" ? items.find((i) => i.DOI === identifier) : undefined
    );

    const result = await applyFixAction(
      library as never,
      items[0] as CslItem,
      finding,
      "add_published_and_supersede"
    );

    expect(result.applied).toBe(false);
    expect(result.message).toContain("Added published-2025");
    expect(result.message).toContain("could not mark preprint-2024 as superseded (not_found)");
    expect(library.save).toHaveBeenCalled();
  });
});
