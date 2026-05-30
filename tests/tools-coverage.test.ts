/**
 * Representative coverage for the entity-listing / get / search tools. Goal is
 * to catch the regressions that would change *what* the tool sends to OM:
 * URL path, FQN/name URL-encoding, query parameter rename (search), and the
 * default-field behavior on individual entity reads. One or two cases per
 * category is enough — the read paths are mechanically similar.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

const mockGet = vi.fn();
const mockPost = vi.fn();
const mockPut = vi.fn();
const mockPatch = vi.fn();
const mockDelete = vi.fn();
vi.mock("../src/client.js", () => ({
  omClient: {
    get: mockGet,
    post: mockPost,
    put: mockPut,
    patch: mockPatch,
    delete: mockDelete,
  },
}));
vi.mock("../src/config.js", () => ({
  config: { allowWrite: true, host: "https://om.example.com", token: "test" },
}));

// Import after the mock is registered. Each module's top-level imports resolve
// against the mocked client.
const tables = await import("../src/tools/tables.js");
const glossary = await import("../src/tools/glossary.js");
const domains = await import("../src/tools/domains.js");
const databases = await import("../src/tools/databases.js");
const schemas = await import("../src/tools/schemas.js");
const teams = await import("../src/tools/teams.js");
const users = await import("../src/tools/users.js");
const tags = await import("../src/tools/tags.js");
const dashboards = await import("../src/tools/dashboards.js");
const pipelines = await import("../src/tools/pipelines.js");
const mlmodels = await import("../src/tools/mlmodels.js");
const topics = await import("../src/tools/topics.js");
const containers = await import("../src/tools/containers.js");
const search = await import("../src/tools/search.js");
const dataQuality = await import("../src/tools/data-quality.js");

beforeEach(() => {
  mockGet.mockReset();
  mockPost.mockReset();
  mockPut.mockReset();
  mockPatch.mockReset();
  mockDelete.mockReset();
});

describe("tables", () => {
  it("list-tables passes pagination + filter params through to /tables", async () => {
    mockGet.mockResolvedValueOnce({ data: [], paging: {} });
    await tables.listTables({
      limit: 25,
      database: "service.db",
      fields: "owners",
      include: "non-deleted",
    });
    expect(mockGet).toHaveBeenCalledWith("/tables", {
      limit: 25,
      database: "service.db",
      fields: "owners",
      include: "non-deleted",
    });
  });

  it("get-table applies a default fields projection when caller omits one", async () => {
    mockGet.mockResolvedValueOnce({ id: "abc" });
    await tables.getTable({ id: "abc" });
    // Default sent as the `fields` query arg, not as extractFields — the caller
    // gets the full payload from OM and only the client-side extractFields runs.
    const [path, query] = mockGet.mock.calls[0]!;
    expect(path).toBe("/tables/abc");
    expect(query).toEqual({});
  });

  it("get-table-by-name URL-encodes the FQN (preserves dots)", async () => {
    mockGet.mockResolvedValueOnce({});
    await tables.getTableByName({ fqn: "svc.db.schema.order items" });
    const [path] = mockGet.mock.calls[0]!;
    expect(path).toBe("/tables/name/svc.db.schema.order%20items");
  });
});

describe("glossary", () => {
  it("list-glossaries hits /glossaries", async () => {
    mockGet.mockResolvedValueOnce({ data: [] });
    await glossary.listGlossaries({ limit: 10, include: "non-deleted" });
    expect(mockGet).toHaveBeenCalledWith("/glossaries", expect.objectContaining({ limit: 10 }));
  });
});

describe("domains", () => {
  it("list-domains hits /domains with default include=non-deleted", async () => {
    mockGet.mockResolvedValueOnce({ data: [] });
    await domains.listDomains({ limit: 5, include: "non-deleted" });
    const [path, query] = mockGet.mock.calls[0]!;
    expect(path).toBe("/domains");
    expect(query).toMatchObject({ limit: 5, include: "non-deleted" });
  });

  it("get-domain-by-name URL-encodes the name", async () => {
    mockGet.mockResolvedValueOnce({});
    await domains.getDomainByName({ name: "Sales & Marketing" });
    const [path] = mockGet.mock.calls[0]!;
    expect(path).toBe("/domains/name/Sales%20%26%20Marketing");
  });
});

describe("databases / schemas", () => {
  it("list-databases hits /databases", async () => {
    mockGet.mockResolvedValueOnce({ data: [] });
    await databases.listDatabases({ limit: 10, include: "non-deleted" });
    expect(mockGet.mock.calls[0]![0]).toBe("/databases");
  });

  it("list-schemas hits /databaseSchemas", async () => {
    mockGet.mockResolvedValueOnce({ data: [] });
    await schemas.listSchemas({ limit: 10, include: "non-deleted" });
    expect(mockGet.mock.calls[0]![0]).toBe("/databaseSchemas");
  });
});

describe("teams / users", () => {
  it("list-teams hits /teams", async () => {
    mockGet.mockResolvedValueOnce({ data: [] });
    await teams.listTeams({ limit: 10, include: "non-deleted" });
    expect(mockGet.mock.calls[0]![0]).toBe("/teams");
  });

  it("list-users hits /users", async () => {
    mockGet.mockResolvedValueOnce({ data: [] });
    await users.listUsers({ limit: 10, include: "non-deleted" });
    expect(mockGet.mock.calls[0]![0]).toBe("/users");
  });

  it("get-user-by-name URL-encodes the username", async () => {
    mockGet.mockResolvedValueOnce({});
    await users.getUserByName({ name: "alice+test@example.com" });
    const [path] = mockGet.mock.calls[0]!;
    expect(path).toBe("/users/name/alice%2Btest%40example.com");
  });
});

describe("tags", () => {
  it("list-tags hits /tags", async () => {
    mockGet.mockResolvedValueOnce({ data: [] });
    await tags.listTags({ limit: 10, include: "non-deleted" });
    expect(mockGet.mock.calls[0]![0]).toBe("/tags");
  });
});

describe("entity catalogs (dashboards / pipelines / mlmodels / topics)", () => {
  it("list-dashboards hits /dashboards", async () => {
    mockGet.mockResolvedValueOnce({ data: [] });
    await dashboards.listDashboards({ limit: 10, include: "non-deleted" });
    expect(mockGet.mock.calls[0]![0]).toBe("/dashboards");
  });

  it("list-pipelines hits /pipelines", async () => {
    mockGet.mockResolvedValueOnce({ data: [] });
    await pipelines.listPipelines({ limit: 10, include: "non-deleted" });
    expect(mockGet.mock.calls[0]![0]).toBe("/pipelines");
  });

  it("list-ml-models hits /mlmodels", async () => {
    mockGet.mockResolvedValueOnce({ data: [] });
    await mlmodels.listMlModels({ limit: 10, include: "non-deleted" });
    expect(mockGet.mock.calls[0]![0]).toBe("/mlmodels");
  });

  it("list-topics hits /topics", async () => {
    mockGet.mockResolvedValueOnce({ data: [] });
    await topics.listTopics({ limit: 10, include: "non-deleted" });
    expect(mockGet.mock.calls[0]![0]).toBe("/topics");
  });
});

describe("containers", () => {
  it("list-containers hits /containers", async () => {
    mockGet.mockResolvedValueOnce({ data: [] });
    await containers.listContainers({ limit: 10, include: "non-deleted" });
    expect(mockGet.mock.calls[0]![0]).toBe("/containers");
  });

  it("get-container-by-name URL-encodes the FQN", async () => {
    mockGet.mockResolvedValueOnce({});
    await containers.getContainerByName({ fqn: "s3://bucket/path with space" });
    const [path] = mockGet.mock.calls[0]!;
    expect(path).toBe("/containers/name/s3%3A%2F%2Fbucket%2Fpath%20with%20space");
  });
});

describe("search", () => {
  it("search-metadata renames camelCase params to snake_case for OM", async () => {
    mockGet.mockResolvedValueOnce({ hits: [] });
    await search.searchMetadata({
      q: "orders",
      index: "table_search_index",
      from: 0,
      size: 25,
      deleted: false,
      trackTotalHits: true,
      queryFilter: '{"term":{"x":1}}',
      sortField: "updatedAt",
      sortOrder: "desc",
    });
    expect(mockGet).toHaveBeenCalledWith(
      "/search/query",
      expect.objectContaining({
        q: "orders",
        index: "table_search_index",
        track_total_hits: true,
        query_filter: '{"term":{"x":1}}',
        sort_field: "updatedAt",
        sort_order: "desc",
      }),
    );
  });

  it("search-metadata caps page size at 100", async () => {
    mockGet.mockResolvedValueOnce({ hits: [] });
    await search.searchMetadata({
      q: "x",
      from: 0,
      size: 500,
      deleted: false,
      trackTotalHits: false,
    });
    const [, query] = mockGet.mock.calls[0]!;
    expect(query!.size).toBe(100);
  });
});

describe("data-quality (read-only)", () => {
  it("list-test-cases hits /dataQuality/testCases", async () => {
    mockGet.mockResolvedValueOnce({ data: [] });
    await dataQuality.listTestCases({ limit: 10 });
    expect(mockGet.mock.calls[0]![0]).toBe("/dataQuality/testCases");
  });
});
