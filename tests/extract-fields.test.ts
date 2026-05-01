import { describe, it, expect } from "vitest";
import { applyExtractFields } from "../src/tools/extract-fields.js";

describe("applyExtractFields", () => {
  it("returns data unchanged when expr is empty or undefined", () => {
    const data = { a: 1, b: 2 };
    expect(applyExtractFields(data, undefined)).toEqual(data);
    expect(applyExtractFields(data, "")).toEqual(data);
    expect(applyExtractFields(data, "   ")).toEqual(data);
  });

  it("returns primitives unchanged", () => {
    expect(applyExtractFields(42 as unknown, "anything")).toBe(42);
    expect(applyExtractFields("hello" as unknown, "x")).toBe("hello");
    expect(applyExtractFields(null as unknown, "x")).toBeNull();
  });

  it("projects flat top-level fields", () => {
    const data = { id: "1", name: "users", description: "long text", deleted: false };
    expect(applyExtractFields(data, "id,name")).toEqual({ id: "1", name: "users" });
  });

  it("projects nested dotted paths", () => {
    const data = {
      id: "1",
      owner: { id: "u1", name: "alice", email: "alice@example.com" },
      service: { name: "bigquery", type: "Database" },
    };
    expect(applyExtractFields(data, "id,owner.name,service.type")).toEqual({
      id: "1",
      owner: { name: "alice" },
      service: { type: "Database" },
    });
  });

  it("projects array-of-objects with wildcard", () => {
    const data = {
      name: "orders",
      columns: [
        { name: "id", dataType: "BIGINT", description: "primary key" },
        { name: "user_id", dataType: "BIGINT", description: "FK" },
      ],
    };
    expect(applyExtractFields(data, "name,columns.*.name")).toEqual({
      name: "orders",
      columns: [{ name: "id" }, { name: "user_id" }],
    });
  });

  it("supports backtick-quoted field names containing dots", () => {
    const data = { tags: { "PII.Sensitive": true, "Tier.Tier1": false } };
    expect(applyExtractFields(data, "tags.`PII.Sensitive`")).toEqual({
      tags: { "PII.Sensitive": true },
    });
  });

  it("includes whole subtree when leaf path is given", () => {
    const data = {
      id: "1",
      owner: { id: "u1", name: "alice", email: "alice@example.com" },
    };
    expect(applyExtractFields(data, "owner")).toEqual({
      owner: { id: "u1", name: "alice", email: "alice@example.com" },
    });
  });

  it("ignores missing keys silently", () => {
    const data = { id: "1", name: "x" };
    expect(applyExtractFields(data, "id,nonexistent.field")).toEqual({ id: "1" });
  });

  it("handles arrays at top level", () => {
    const data = [
      { id: "1", name: "a", extra: 1 },
      { id: "2", name: "b", extra: 2 },
    ];
    expect(applyExtractFields(data, "id,name")).toEqual([
      { id: "1", name: "a" },
      { id: "2", name: "b" },
    ]);
  });
});
