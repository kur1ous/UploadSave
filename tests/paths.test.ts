import { describe, expect, it } from "vitest";
import { normalizeRelativePath, safeJoin } from "../src/main/services/paths";

describe("paths", () => {
  it("normalizes separators and strips leading slash", () => {
    expect(normalizeRelativePath("\\a\\b\\file.txt")).toBe("a/b/file.txt");
  });

  it("throws on traversal segments", () => {
    expect(() => normalizeRelativePath("a/../b.txt")).toThrowError();
  });

  it("safeJoin blocks escaping base directory", () => {
    expect(() => safeJoin("C:/safe/root", "../evil.txt")).toThrowError();
  });
});
