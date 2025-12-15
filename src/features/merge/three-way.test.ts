import { describe, expect, it } from "vitest";
import type { CslItem } from "../../core/csl-json/types.js";
import type { MergeOptions } from "./types.js";
import { threeWayMerge } from "./three-way.js";

describe("threeWayMerge", () => {
  // Sample references for testing
  const baseItem: CslItem = {
    id: "smith2023",
    type: "article-journal",
    title: "Original Title",
    author: [{ family: "Smith", given: "John" }],
    issued: { "date-parts": [[2023]] },
    custom: {
      uuid: "660e8400-e29b-41d4-a716-446655440001",
      created_at: "2024-01-01T00:00:00.000Z",
      timestamp: "2024-01-01T00:00:00.000Z",
    },
  };

  describe("No change scenarios", () => {
    it("should keep base when nothing changed", () => {
      const base = [baseItem];
      const local = [{ ...baseItem }];
      const remote = [{ ...baseItem }];

      const result = threeWayMerge(base, local, remote);

      expect(result.status).toBe("success");
      expect(result.merged).toHaveLength(1);
      expect(result.merged[0]).toEqual(baseItem);
      expect(result.conflicts).toHaveLength(0);
    });
  });

  describe("One side changed scenarios", () => {
    it("should use local version when only local changed", () => {
      const base = [baseItem];
      const localModified: CslItem = {
        ...baseItem,
        title: "Updated Title by Local",
        custom: {
          ...baseItem.custom!,
          timestamp: "2024-01-02T10:00:00.000Z",
        },
      };
      const local = [localModified];
      const remote = [{ ...baseItem }];

      const result = threeWayMerge(base, local, remote);

      expect(result.status).toBe("success");
      expect(result.merged).toHaveLength(1);
      expect(result.merged[0].title).toBe("Updated Title by Local");
      expect(result.conflicts).toHaveLength(0);
    });

    it("should use remote version when only remote changed", () => {
      const base = [baseItem];
      const local = [{ ...baseItem }];
      const remoteModified: CslItem = {
        ...baseItem,
        title: "Updated Title by Remote",
        custom: {
          ...baseItem.custom!,
          timestamp: "2024-01-02T15:00:00.000Z",
        },
      };
      const remote = [remoteModified];

      const result = threeWayMerge(base, local, remote);

      expect(result.status).toBe("success");
      expect(result.merged).toHaveLength(1);
      expect(result.merged[0].title).toBe("Updated Title by Remote");
      expect(result.conflicts).toHaveLength(0);
    });
  });

  describe("Both changed to same value", () => {
    it("should use the same value when both sides made identical changes", () => {
      const base = [baseItem];
      const localModified: CslItem = {
        ...baseItem,
        title: "Same Updated Title",
        custom: {
          ...baseItem.custom!,
          timestamp: "2024-01-02T10:00:00.000Z",
        },
      };
      const remoteModified: CslItem = {
        ...baseItem,
        title: "Same Updated Title",
        custom: {
          ...baseItem.custom!,
          timestamp: "2024-01-02T15:00:00.000Z",
        },
      };
      const local = [localModified];
      const remote = [remoteModified];

      const result = threeWayMerge(base, local, remote);

      expect(result.status).toBe("success");
      expect(result.merged).toHaveLength(1);
      expect(result.merged[0].title).toBe("Same Updated Title");
      expect(result.conflicts).toHaveLength(0);
    });
  });

  describe("LWW (Last-Write-Wins) conflict resolution", () => {
    it("should use local when local timestamp is newer", () => {
      const base = [baseItem];
      const localModified: CslItem = {
        ...baseItem,
        title: "Local Title",
        custom: {
          ...baseItem.custom!,
          timestamp: "2024-01-02T15:00:00.000Z", // Newer
        },
      };
      const remoteModified: CslItem = {
        ...baseItem,
        title: "Remote Title",
        custom: {
          ...baseItem.custom!,
          timestamp: "2024-01-02T10:00:00.000Z", // Older
        },
      };
      const local = [localModified];
      const remote = [remoteModified];

      const result = threeWayMerge(base, local, remote);

      expect(result.status).toBe("auto-resolved");
      expect(result.merged).toHaveLength(1);
      expect(result.merged[0].title).toBe("Local Title");
      expect(result.conflicts).toHaveLength(1);
      expect(result.conflicts[0].resolution).toBe("auto-lww");
    });

    it("should use remote when remote timestamp is newer", () => {
      const base = [baseItem];
      const localModified: CslItem = {
        ...baseItem,
        title: "Local Title",
        custom: {
          ...baseItem.custom!,
          timestamp: "2024-01-02T10:00:00.000Z", // Older
        },
      };
      const remoteModified: CslItem = {
        ...baseItem,
        title: "Remote Title",
        custom: {
          ...baseItem.custom!,
          timestamp: "2024-01-02T15:00:00.000Z", // Newer
        },
      };
      const local = [localModified];
      const remote = [remoteModified];

      const result = threeWayMerge(base, local, remote);

      expect(result.status).toBe("auto-resolved");
      expect(result.merged).toHaveLength(1);
      expect(result.merged[0].title).toBe("Remote Title");
      expect(result.conflicts).toHaveLength(1);
      expect(result.conflicts[0].resolution).toBe("auto-lww");
    });
  });

  describe("Same timestamp conflict resolution with --prefer", () => {
    it("should use local when timestamps equal and prefer=local", () => {
      const base = [baseItem];
      const sameTimestamp = "2024-01-02T12:00:00.000Z";
      const localModified: CslItem = {
        ...baseItem,
        title: "Local Title",
        custom: {
          ...baseItem.custom!,
          timestamp: sameTimestamp,
        },
      };
      const remoteModified: CslItem = {
        ...baseItem,
        title: "Remote Title",
        custom: {
          ...baseItem.custom!,
          timestamp: sameTimestamp,
        },
      };
      const local = [localModified];
      const remote = [remoteModified];
      const options: MergeOptions = { prefer: "local" };

      const result = threeWayMerge(base, local, remote, options);

      expect(result.status).toBe("auto-resolved");
      expect(result.merged).toHaveLength(1);
      expect(result.merged[0].title).toBe("Local Title");
      expect(result.conflicts).toHaveLength(1);
      expect(result.conflicts[0].resolution).toBe("prefer-local");
    });

    it("should use remote when timestamps equal and prefer=remote", () => {
      const base = [baseItem];
      const sameTimestamp = "2024-01-02T12:00:00.000Z";
      const localModified: CslItem = {
        ...baseItem,
        title: "Local Title",
        custom: {
          ...baseItem.custom!,
          timestamp: sameTimestamp,
        },
      };
      const remoteModified: CslItem = {
        ...baseItem,
        title: "Remote Title",
        custom: {
          ...baseItem.custom!,
          timestamp: sameTimestamp,
        },
      };
      const local = [localModified];
      const remote = [remoteModified];
      const options: MergeOptions = { prefer: "remote" };

      const result = threeWayMerge(base, local, remote, options);

      expect(result.status).toBe("auto-resolved");
      expect(result.merged).toHaveLength(1);
      expect(result.merged[0].title).toBe("Remote Title");
      expect(result.conflicts).toHaveLength(1);
      expect(result.conflicts[0].resolution).toBe("prefer-remote");
    });

    it("should report conflict when timestamps equal and no --prefer option", () => {
      const base = [baseItem];
      const sameTimestamp = "2024-01-02T12:00:00.000Z";
      const localModified: CslItem = {
        ...baseItem,
        title: "Local Title",
        custom: {
          ...baseItem.custom!,
          timestamp: sameTimestamp,
        },
      };
      const remoteModified: CslItem = {
        ...baseItem,
        title: "Remote Title",
        custom: {
          ...baseItem.custom!,
          timestamp: sameTimestamp,
        },
      };
      const local = [localModified];
      const remote = [remoteModified];

      const result = threeWayMerge(base, local, remote);

      expect(result.status).toBe("conflict");
      expect(result.conflicts).toHaveLength(1);
      expect(result.conflicts[0].resolution).toBe("unresolved");
      // When unresolved, both versions should be in merged result for conflict file generation
      expect(result.merged).toHaveLength(1);
    });
  });

  describe("Addition and deletion scenarios", () => {
    it("should include items added only in local", () => {
      const newLocalItem: CslItem = {
        id: "jones2024",
        type: "book",
        title: "New Book in Local",
        author: [{ family: "Jones", given: "Mary" }],
        issued: { "date-parts": [[2024]] },
        custom: {
          uuid: "660e8400-e29b-41d4-a716-446655440002",
          created_at: "2024-01-05T00:00:00.000Z",
          timestamp: "2024-01-05T00:00:00.000Z",
        },
      };
      const base = [baseItem];
      const local = [baseItem, newLocalItem];
      const remote = [baseItem];

      const result = threeWayMerge(base, local, remote);

      expect(result.status).toBe("success");
      expect(result.merged).toHaveLength(2);
      expect(result.localOnly).toHaveLength(1);
      expect(result.localOnly[0].id).toBe("jones2024");
      expect(result.conflicts).toHaveLength(0);
    });

    it("should include items added only in remote", () => {
      const newRemoteItem: CslItem = {
        id: "brown2024",
        type: "book",
        title: "New Book in Remote",
        author: [{ family: "Brown", given: "Alice" }],
        issued: { "date-parts": [[2024]] },
        custom: {
          uuid: "660e8400-e29b-41d4-a716-446655440003",
          created_at: "2024-01-06T00:00:00.000Z",
          timestamp: "2024-01-06T00:00:00.000Z",
        },
      };
      const base = [baseItem];
      const local = [baseItem];
      const remote = [baseItem, newRemoteItem];

      const result = threeWayMerge(base, local, remote);

      expect(result.status).toBe("success");
      expect(result.merged).toHaveLength(2);
      expect(result.remoteOnly).toHaveLength(1);
      expect(result.remoteOnly[0].id).toBe("brown2024");
      expect(result.conflicts).toHaveLength(0);
    });

    it("should handle items deleted in local", () => {
      const base = [baseItem];
      const local: CslItem[] = []; // Item deleted
      const remote = [baseItem];

      const result = threeWayMerge(base, local, remote);

      expect(result.status).toBe("success");
      expect(result.merged).toHaveLength(0); // Deleted in local, not in remote = delete wins
      expect(result.deletedInLocal).toHaveLength(1);
      expect(result.deletedInLocal[0].id).toBe("smith2023");
    });

    it("should handle items deleted in remote", () => {
      const base = [baseItem];
      const local = [baseItem];
      const remote: CslItem[] = []; // Item deleted

      const result = threeWayMerge(base, local, remote);

      expect(result.status).toBe("success");
      expect(result.merged).toHaveLength(0); // Deleted in remote, not in local = delete wins
      expect(result.deletedInRemote).toHaveLength(1);
      expect(result.deletedInRemote[0].id).toBe("smith2023");
    });

    it("should handle items deleted in both sides", () => {
      const base = [baseItem];
      const local: CslItem[] = [];
      const remote: CslItem[] = [];

      const result = threeWayMerge(base, local, remote);

      expect(result.status).toBe("success");
      expect(result.merged).toHaveLength(0);
      expect(result.deletedInLocal).toHaveLength(1);
      expect(result.deletedInRemote).toHaveLength(1);
    });
  });

  describe("Multiple items with mixed scenarios", () => {
    it("should handle multiple items with different conflict types", () => {
      const item1: CslItem = {
        id: "item1",
        type: "article-journal",
        title: "Item 1 Original",
        custom: {
          uuid: "uuid-1",
          created_at: "2024-01-01T00:00:00.000Z",
          timestamp: "2024-01-01T00:00:00.000Z",
        },
      };

      const item2: CslItem = {
        id: "item2",
        type: "book",
        title: "Item 2 Original",
        custom: {
          uuid: "uuid-2",
          created_at: "2024-01-01T00:00:00.000Z",
          timestamp: "2024-01-01T00:00:00.000Z",
        },
      };

      const item3LocalOnly: CslItem = {
        id: "item3",
        type: "book",
        title: "Item 3 Local Only",
        custom: {
          uuid: "uuid-3",
          created_at: "2024-01-05T00:00:00.000Z",
          timestamp: "2024-01-05T00:00:00.000Z",
        },
      };

      const base = [item1, item2];

      // Local: item1 modified (newer), item2 unchanged, item3 added
      const localItem1: CslItem = {
        ...item1,
        title: "Item 1 Modified Local",
        custom: {
          ...item1.custom!,
          timestamp: "2024-01-02T15:00:00.000Z",
        },
      };
      const local = [localItem1, item2, item3LocalOnly];

      // Remote: item1 modified (older), item2 deleted
      const remoteItem1: CslItem = {
        ...item1,
        title: "Item 1 Modified Remote",
        custom: {
          ...item1.custom!,
          timestamp: "2024-01-02T10:00:00.000Z",
        },
      };
      const remote = [remoteItem1];

      const result = threeWayMerge(base, local, remote);

      expect(result.status).toBe("auto-resolved");
      expect(result.merged).toHaveLength(2); // item1 (local wins), item3 (new)
      expect(result.conflicts).toHaveLength(1); // item1 conflict
      expect(result.conflicts[0].resolution).toBe("auto-lww");
      expect(result.localOnly).toHaveLength(1); // item3
      expect(result.deletedInRemote).toHaveLength(1); // item2
    });
  });

  describe("Field-level merge", () => {
    it("should merge different fields independently", () => {
      const base = [
        {
          ...baseItem,
          title: "Original Title",
          abstract: "Original Abstract",
        },
      ];

      const local = [
        {
          ...baseItem,
          title: "Updated Title", // Changed
          abstract: "Original Abstract", // Unchanged
          custom: {
            ...baseItem.custom!,
            timestamp: "2024-01-02T10:00:00.000Z",
          },
        },
      ];

      const remote = [
        {
          ...baseItem,
          title: "Original Title", // Unchanged
          abstract: "Updated Abstract", // Changed
          custom: {
            ...baseItem.custom!,
            timestamp: "2024-01-02T15:00:00.000Z",
          },
        },
      ];

      const result = threeWayMerge(base, local, remote);

      expect(result.status).toBe("success");
      expect(result.merged).toHaveLength(1);
      expect(result.merged[0].title).toBe("Updated Title");
      expect(result.merged[0].abstract).toBe("Updated Abstract");
      expect(result.conflicts).toHaveLength(0);
    });

    it("should report field-level conflicts", () => {
      const base = [baseItem];

      const sameTimestamp = "2024-01-02T12:00:00.000Z";
      const local = [
        {
          ...baseItem,
          title: "Local Title",
          abstract: "Local Abstract",
          custom: {
            ...baseItem.custom!,
            timestamp: sameTimestamp,
          },
        },
      ];

      const remote = [
        {
          ...baseItem,
          title: "Remote Title",
          abstract: "Remote Abstract",
          custom: {
            ...baseItem.custom!,
            timestamp: sameTimestamp,
          },
        },
      ];

      const result = threeWayMerge(base, local, remote);

      expect(result.status).toBe("conflict");
      expect(result.conflicts).toHaveLength(1);
      expect(result.conflicts[0].fields.length).toBeGreaterThanOrEqual(2); // title and abstract (and possibly timestamp)
      expect(result.conflicts[0].resolution).toBe("unresolved");
    });
  });

  describe("Edge cases", () => {
    it("should handle empty base, local, and remote", () => {
      const result = threeWayMerge([], [], []);

      expect(result.status).toBe("success");
      expect(result.merged).toHaveLength(0);
      expect(result.conflicts).toHaveLength(0);
    });

    it("should handle items with missing custom.timestamp (use created_at as fallback)", () => {
      const itemNoTimestamp: CslItem = {
        id: "no-timestamp",
        type: "book",
        title: "Base Title",
        custom: {
          uuid: "uuid-no-ts",
          created_at: "2024-01-01T00:00:00.000Z",
          // timestamp is missing
        },
      };

      const base = [itemNoTimestamp];
      const local = [
        {
          ...itemNoTimestamp,
          title: "Local Title",
          custom: {
            ...itemNoTimestamp.custom!,
            timestamp: "2024-01-02T10:00:00.000Z",
          },
        },
      ];
      const remote = [
        {
          ...itemNoTimestamp,
          title: "Remote Title",
          custom: {
            ...itemNoTimestamp.custom!,
            // Still no timestamp, should use created_at
          },
        },
      ];

      const result = threeWayMerge(base, local, remote);

      // Local has explicit timestamp, remote uses created_at (older)
      // Local should win
      expect(result.status).toBe("auto-resolved");
      expect(result.merged[0].title).toBe("Local Title");
    });

    it("should handle items without uuid gracefully", () => {
      // Items without uuid cannot be reliably matched across versions
      const itemNoUuid: CslItem = {
        id: "no-uuid-1",
        type: "book",
        title: "Title Without UUID",
      };

      const base = [itemNoUuid];
      const local = [{ ...itemNoUuid, title: "Local Modified" }];
      const remote = [{ ...itemNoUuid, title: "Remote Modified" }];

      // Should not crash - behavior depends on implementation
      // Could treat as separate items or use id as fallback
      const result = threeWayMerge(base, local, remote);

      // At minimum, should not crash
      expect(result).toBeDefined();
      expect(result.status).toBeDefined();
    });
  });

  describe("Complex nested field changes", () => {
    it("should handle author array changes", () => {
      const baseWithAuthors: CslItem = {
        ...baseItem,
        author: [{ family: "Smith", given: "John" }],
      };

      const localWithAuthors: CslItem = {
        ...baseWithAuthors,
        author: [
          { family: "Smith", given: "John" },
          { family: "Doe", given: "Jane" },
        ],
        custom: {
          ...baseWithAuthors.custom!,
          timestamp: "2024-01-02T10:00:00.000Z",
        },
      };

      const remoteWithAuthors: CslItem = {
        ...baseWithAuthors,
        custom: {
          ...baseWithAuthors.custom!,
          timestamp: "2024-01-01T00:00:00.000Z",
        },
      };

      const base = [baseWithAuthors];
      const local = [localWithAuthors];
      const remote = [remoteWithAuthors];

      const result = threeWayMerge(base, local, remote);

      expect(result.status).toBe("success");
      expect(result.merged[0].author).toHaveLength(2);
    });
  });
});
