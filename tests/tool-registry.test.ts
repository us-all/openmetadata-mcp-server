import { describe, it, expect, beforeEach } from "vitest";
import { ToolRegistry } from "../src/tool-registry.js";

describe("ToolRegistry", () => {
  let r: ToolRegistry;

  beforeEach(() => {
    r = new ToolRegistry();
    r.register("list-tables", "List tables with pagination", "core");
    r.register("get-table", "Get table details by UUID", "core");
    r.register("create-table", "Create a new table", "core");
    r.register("list-glossaries", "List glossaries", "governance");
    r.register("create-tag", "Create a new tag", "governance");
    r.register("list-bots", "List bots", "admin");
    r.register("search-metadata", "Search OpenMetadata entities", "search");
  });

  describe("search", () => {
    it("matches by tool name token", () => {
      const matches = r.search("table");
      const names = matches.map((m) => m.name);
      expect(names).toContain("list-tables");
      expect(names).toContain("get-table");
      expect(names).toContain("create-table");
      expect(names).not.toContain("list-bots");
    });

    it("ranks name matches higher than description matches", () => {
      const matches = r.search("table");
      // tools with 'table' in name should come before those with it only in description
      expect(matches[0].name).toMatch(/table/);
    });

    it("matches multiple tokens", () => {
      const matches = r.search("create tag");
      expect(matches[0].name).toBe("create-tag");
    });

    it("respects category filter", () => {
      const matches = r.search("list", "admin");
      expect(matches.map((m) => m.name)).toEqual(["list-bots"]);
    });

    it("returns empty when no match", () => {
      const matches = r.search("nonexistent");
      expect(matches).toEqual([]);
    });

    it("respects limit", () => {
      const matches = r.search("table", undefined, 2);
      expect(matches.length).toBe(2);
    });
  });

  describe("summary", () => {
    it("returns correct totals and breakdown", () => {
      const s = r.summary();
      expect(s.total).toBe(7);
      expect(s.categoryBreakdown).toEqual({
        core: 3,
        governance: 2,
        admin: 1,
        search: 1,
      });
    });
  });
});
