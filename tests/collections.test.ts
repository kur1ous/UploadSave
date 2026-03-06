import { describe, expect, it } from "vitest";
import { selectVisibleItems, toggleSort } from "../src/renderer/utils/collections";
import type { CollectionItem } from "../src/shared/types";

const items: CollectionItem[] = [
  {
    id: "1",
    collectionId: "c1",
    sourcePath: "C:/src/a.txt",
    relativePath: "folder/a.txt",
    storagePath: "C:/storage/1.txt",
    kind: "file",
    sizeBytes: 300,
    extension: ".txt",
    mediaType: "document",
    tagIds: ["tag-docs"],
    createdAt: "2026-01-01T00:00:00.000Z"
  },
  {
    id: "2",
    collectionId: "c1",
    sourcePath: "C:/src/b.mp3",
    relativePath: "folder/b.mp3",
    storagePath: "C:/storage/2.mp3",
    kind: "file",
    sizeBytes: 100,
    extension: ".mp3",
    mediaType: "audio",
    tagIds: ["tag-audio"],
    createdAt: "2026-02-01T00:00:00.000Z"
  }
];

describe("collection selectors", () => {
  it("filters by extension", () => {
    const visible = selectVisibleItems(items, "mp3", { field: "name", direction: "asc" });
    expect(visible).toHaveLength(1);
    expect(visible[0]?.id).toBe("2");
  });

  it("filters by media type", () => {
    const visible = selectVisibleItems(items, "", { field: "name", direction: "asc" }, "audio");
    expect(visible).toHaveLength(1);
    expect(visible[0]?.id).toBe("2");
  });

  it("sorts by size descending", () => {
    const visible = selectVisibleItems(items, "", { field: "size", direction: "desc" });
    expect(visible[0]?.id).toBe("1");
  });

  it("toggles sort direction for same field", () => {
    const next = toggleSort({ field: "name", direction: "asc" }, "name");
    expect(next.direction).toBe("desc");
  });
});
