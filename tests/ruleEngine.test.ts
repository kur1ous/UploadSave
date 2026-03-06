import { describe, expect, it } from "vitest";
import { evaluateSmartRule } from "../src/main/services/ruleEngine";
import type { CollectionItem, SmartRule } from "../src/shared/types";

const baseItems: CollectionItem[] = [
  {
    id: "i1",
    collectionId: "c1",
    sourcePath: "C:/src/design/logo.png",
    relativePath: "design/logo.png",
    storagePath: "C:/storage/i1.png",
    kind: "file",
    sizeBytes: 2048,
    extension: ".png",
    mediaType: "image",
    tagIds: ["brand"],
    createdAt: "2026-01-10T00:00:00.000Z"
  },
  {
    id: "i2",
    collectionId: "c1",
    sourcePath: "C:/src/audio/theme.mp3",
    relativePath: "audio/theme.mp3",
    storagePath: "C:/storage/i2.mp3",
    kind: "file",
    sizeBytes: 8192,
    extension: ".mp3",
    mediaType: "audio",
    tagIds: ["music", "brand"],
    createdAt: "2026-02-15T00:00:00.000Z"
  }
];

describe("evaluateSmartRule", () => {
  it("filters by media type", () => {
    const rule: SmartRule = {
      conditions: [{ id: "1", type: "mediaType", mediaType: "image" }]
    };

    const result = evaluateSmartRule(baseItems, rule);
    expect(result.map((item) => item.id)).toEqual(["i1"]);
  });

  it("filters by tag includes/excludes", () => {
    const includeRule: SmartRule = {
      conditions: [{ id: "1", type: "tagIncludes", tagId: "music" }]
    };
    const excludeRule: SmartRule = {
      conditions: [{ id: "1", type: "tagExcludes", tagId: "music" }]
    };

    expect(evaluateSmartRule(baseItems, includeRule).map((item) => item.id)).toEqual(["i2"]);
    expect(evaluateSmartRule(baseItems, excludeRule).map((item) => item.id)).toEqual(["i1"]);
  });

  it("filters by mixed conditions (AND)", () => {
    const rule: SmartRule = {
      conditions: [
        { id: "1", type: "pathContains", textValue: "audio" },
        { id: "2", type: "extensionIs", textValue: "mp3" },
        { id: "3", type: "sizeRange", minBytes: 1000, maxBytes: 10000 },
        { id: "4", type: "importedDateRange", fromDate: "2026-02-01", toDate: "2026-03-01" }
      ]
    };

    const result = evaluateSmartRule(baseItems, rule);
    expect(result.map((item) => item.id)).toEqual(["i2"]);
  });
});
