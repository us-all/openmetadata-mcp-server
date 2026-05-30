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
const charts = await import("../src/tools/charts.js");
const queries = await import("../src/tools/queries.js");
const services = await import("../src/tools/services.js");
const sampleData = await import("../src/tools/sample-data.js");
const storedProcedures = await import("../src/tools/stored-procedures.js");
const semanticSearch = await import("../src/tools/semantic-search.js");
const bots = await import("../src/tools/bots.js");
const events = await import("../src/tools/events.js");
const access = await import("../src/tools/access.js");
const lineage = await import("../src/tools/lineage.js");
const governanceEntities = await import("../src/tools/governance-entities.js");

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

describe("charts / queries / stored-procedures", () => {
  it("list-charts hits /charts", async () => {
    mockGet.mockResolvedValueOnce({ data: [] });
    await charts.listCharts({ limit: 10, include: "non-deleted" });
    expect(mockGet.mock.calls[0]![0]).toBe("/charts");
  });

  it("list-queries hits /queries", async () => {
    mockGet.mockResolvedValueOnce({ data: [] });
    await queries.listQueries({ limit: 10, include: "non-deleted" });
    expect(mockGet.mock.calls[0]![0]).toBe("/queries");
  });

  it("get-stored-procedure-by-name URL-encodes the FQN", async () => {
    mockGet.mockResolvedValueOnce({});
    await storedProcedures.getStoredProcedureByName({ fqn: "svc.db.schema.my proc" });
    expect(mockGet.mock.calls[0]![0]).toBe("/storedProcedures/name/svc.db.schema.my%20proc");
  });
});

describe("services (database + dashboard)", () => {
  it("list-database-services hits /services/databaseServices", async () => {
    mockGet.mockResolvedValueOnce({ data: [] });
    await services.listDatabaseServices({ limit: 10, include: "non-deleted" });
    expect(mockGet.mock.calls[0]![0]).toBe("/services/databaseServices");
  });

  it("list-dashboard-services hits /services/dashboardServices", async () => {
    mockGet.mockResolvedValueOnce({ data: [] });
    await services.listDashboardServices({ limit: 10, include: "non-deleted" });
    expect(mockGet.mock.calls[0]![0]).toBe("/services/dashboardServices");
  });

  it("get-database-service-by-name URL-encodes the FQN", async () => {
    mockGet.mockResolvedValueOnce({});
    await services.getDatabaseServiceByName({ fqn: "prod postgres" });
    expect(mockGet.mock.calls[0]![0]).toBe("/services/databaseServices/name/prod%20postgres");
  });
});

describe("sample-data", () => {
  it("get-table-sample-data hits /tables/{id}/sampleData (id in path, no query)", async () => {
    mockGet.mockResolvedValueOnce({ sampleData: {} });
    await sampleData.getTableSampleData({ id: "abc-123" });
    expect(mockGet.mock.calls[0]![0]).toBe("/tables/abc-123/sampleData");
  });
});

describe("semantic-search (POST + size/k clamps)", () => {
  it("posts to /search/vector/query with size capped at 100 and k capped at 10_000", async () => {
    mockPost.mockResolvedValueOnce({ hits: [] });
    await semanticSearch.semanticSearch({
      query: "customer demographics",
      size: 999,
      k: 50000,
      threshold: 0.5,
    });
    expect(mockPost).toHaveBeenCalled();
    const [path, body] = mockPost.mock.calls[0]!;
    expect(path).toBe("/search/vector/query");
    expect((body as { size: number }).size).toBe(100);
    expect((body as { k: number }).k).toBe(10000);
    expect((body as { threshold: number }).threshold).toBe(0.5);
  });

  it("only sends filters that the caller actually supplied", async () => {
    mockPost.mockResolvedValueOnce({ hits: [] });
    await semanticSearch.semanticSearch({
      query: "x",
      size: 10,
      k: 500,
      threshold: 0,
      entityType: ["table"],
    });
    const [, body] = mockPost.mock.calls[0]!;
    const filters = (body as { filters?: Record<string, unknown> }).filters;
    expect(filters).toEqual({ entityType: ["table"] });
  });
});

describe("bots / events / access", () => {
  it("list-bots hits /bots", async () => {
    mockGet.mockResolvedValueOnce({ data: [] });
    await bots.listBots({ limit: 10, include: "non-deleted" });
    expect(mockGet.mock.calls[0]![0]).toBe("/bots");
  });

  it("list-events (subscriptions) hits /events/subscriptions", async () => {
    mockGet.mockResolvedValueOnce({ data: [] });
    await events.listEvents({ limit: 10, include: "non-deleted" });
    expect(mockGet.mock.calls[0]![0]).toBe("/events/subscriptions");
  });

  it("list-roles + list-policies hit /roles and /policies respectively", async () => {
    mockGet.mockResolvedValueOnce({ data: [] });
    await access.listRoles({ limit: 10, include: "non-deleted" });
    expect(mockGet.mock.calls[0]![0]).toBe("/roles");

    mockGet.mockResolvedValueOnce({ data: [] });
    await access.listPolicies({ limit: 10, include: "non-deleted" });
    expect(mockGet.mock.calls[1]![0]).toBe("/policies");
  });
});

describe("lineage", () => {
  it("get-lineage hits /lineage/{entity}/{id} with depth params", async () => {
    mockGet.mockResolvedValueOnce({ nodes: [] });
    await lineage.getLineage({
      entity: "table",
      id: "abc-123",
      upstreamDepth: 2,
      downstreamDepth: 4,
    });
    const [path, query] = mockGet.mock.calls[0]!;
    expect(path).toBe("/lineage/table/abc-123");
    expect(query).toMatchObject({ upstreamDepth: 2, downstreamDepth: 4 });
  });

  it("get-lineage-by-name URL-encodes the FQN", async () => {
    mockGet.mockResolvedValueOnce({ nodes: [] });
    await lineage.getLineageByName({
      entity: "table",
      fqn: "svc.db.schema.order items",
      upstreamDepth: 1,
      downstreamDepth: 1,
    });
    expect(mockGet.mock.calls[0]![0]).toBe("/lineage/table/name/svc.db.schema.order%20items");
  });
});

describe("governance-entities (OM 1.12+ new entity types — list paths)", () => {
  it("list-data-contracts hits /dataContracts", async () => {
    mockGet.mockResolvedValueOnce({ data: [] });
    await governanceEntities.listDataContracts({ limit: 10, include: "non-deleted" });
    expect(mockGet.mock.calls[0]![0]).toBe("/dataContracts");
  });

  it("list-metrics hits /metrics", async () => {
    mockGet.mockResolvedValueOnce({ data: [] });
    await governanceEntities.listMetrics({ limit: 10, include: "non-deleted" });
    expect(mockGet.mock.calls[0]![0]).toBe("/metrics");
  });

  it("list-search-indexes hits /searchIndexes", async () => {
    mockGet.mockResolvedValueOnce({ data: [] });
    await governanceEntities.listSearchIndexes({ limit: 10, include: "non-deleted" });
    expect(mockGet.mock.calls[0]![0]).toBe("/searchIndexes");
  });

  it("list-api-collections hits /apiCollections", async () => {
    mockGet.mockResolvedValueOnce({ data: [] });
    await governanceEntities.listApiCollections({ limit: 10, include: "non-deleted" });
    expect(mockGet.mock.calls[0]![0]).toBe("/apiCollections");
  });

  it("list-api-endpoints hits /apiEndpoints", async () => {
    mockGet.mockResolvedValueOnce({ data: [] });
    await governanceEntities.listApiEndpoints({ limit: 10, include: "non-deleted" });
    expect(mockGet.mock.calls[0]![0]).toBe("/apiEndpoints");
  });
});
