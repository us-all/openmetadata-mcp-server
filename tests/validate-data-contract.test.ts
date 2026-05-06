import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the OM client at module level — the tool calls omClient.get(...)
const mockGet = vi.fn();
vi.mock("../src/client.js", () => ({
  omClient: { get: mockGet },
}));

// Import after the mock is registered.
const { validateDataContract } = await import("../src/tools/validate-data-contract.js");

const TABLE_FQN = "service.db.schema.orders";

const SAMPLE_CONTRACT = {
  name: "orders.contract.v1",
  fullyQualifiedName: "orders.contract.v1",
  status: "Active",
  entity: { fullyQualifiedName: TABLE_FQN, type: "table" },
  schema: [
    { columnName: "id", expectedType: "BIGINT", nullable: false, constraint: "PRIMARY_KEY" },
    { columnName: "email", expectedType: "VARCHAR", nullable: false },
    { columnName: "missing_col", expectedType: "VARCHAR" },
  ],
  qualityExpectations: [
    { id: "tc-1", fullyQualifiedName: "orders.tests.email_format", name: "email_format", type: "testCase" },
    { id: "tc-2", fullyQualifiedName: "orders.tests.id_unique", name: "id_unique", type: "testCase" },
  ],
};

const SAMPLE_TABLE = {
  name: "orders",
  fullyQualifiedName: TABLE_FQN,
  columns: [
    { name: "id", dataType: "BIGINT", constraint: "PRIMARY_KEY" },
    { name: "email", dataType: "VARCHAR", constraint: "NOT_NULL" },
    { name: "created_at", dataType: "TIMESTAMP" },
  ],
};

beforeEach(() => {
  mockGet.mockReset();
});

function setupMocks(overrides: Partial<{
  contract: unknown;
  table: unknown;
  testCases: Record<string, unknown>;
}> = {}) {
  const contract = overrides.contract ?? SAMPLE_CONTRACT;
  const table = overrides.table ?? SAMPLE_TABLE;
  const testCases = overrides.testCases ?? {
    "tc-1": { name: "email_format", testCaseResult: { testCaseStatus: "Success", timestamp: 1717000000 } },
    "tc-2": { name: "id_unique", testCaseResult: { testCaseStatus: "Failed", timestamp: 1717100000, result: "Duplicate IDs found" } },
  };

  mockGet.mockImplementation((path: string) => {
    if (path.startsWith("/dataContracts/name/")) return contract;
    if (path.startsWith("/tables/name/")) return table;
    if (path.startsWith("/dataQuality/testCases/")) {
      const id = path.split("/").pop()!;
      return (testCases as Record<string, unknown>)[id] ?? null;
    }
    throw new Error(`unexpected path: ${path}`);
  });
}

describe("validateDataContract", () => {
  it("reports passing for matching schema + passing tests", async () => {
    setupMocks({
      contract: { ...SAMPLE_CONTRACT, schema: [SAMPLE_CONTRACT.schema[0], SAMPLE_CONTRACT.schema[1]], qualityExpectations: [SAMPLE_CONTRACT.qualityExpectations[0]] },
    });
    const result = await validateDataContract({ contractFqn: "orders.contract.v1", includeQualityResults: true });
    expect(result.status).toBe("passing");
    expect(result.schema.passing).toBe(2);
    expect(result.schema.failing).toBe(0);
    expect(result.qualityExpectations.passing).toBe(1);
    expect(result.qualityExpectations.failing).toBe(0);
  });

  it("reports missing column", async () => {
    setupMocks();
    const result = await validateDataContract({ contractFqn: "orders.contract.v1", includeQualityResults: false });
    const missing = result.schema.findings.find((f) => f.field === "missing_col");
    expect(missing?.status).toBe("missing");
    expect(missing?.reason).toMatch(/not found/);
  });

  it("reports type mismatch", async () => {
    setupMocks({
      contract: {
        ...SAMPLE_CONTRACT,
        schema: [{ columnName: "id", expectedType: "INT", nullable: false }],
        qualityExpectations: [],
      },
    });
    const result = await validateDataContract({ contractFqn: "orders.contract.v1", includeQualityResults: false });
    const idFinding = result.schema.findings.find((f) => f.field === "id");
    expect(idFinding?.status).toBe("fail");
    expect(idFinding?.reason).toMatch(/type mismatch/);
  });

  it("reports failing test case", async () => {
    setupMocks();
    const result = await validateDataContract({ contractFqn: "orders.contract.v1", includeQualityResults: true });
    const failing = result.qualityExpectations.findings.find((f) => f.testCase.includes("id_unique"));
    expect(failing?.status).toBe("fail");
    expect(failing?.note).toMatch(/Duplicate/);
  });

  it("returns partial when some pass, some fail", async () => {
    setupMocks();
    const result = await validateDataContract({ contractFqn: "orders.contract.v1", includeQualityResults: true });
    // schema: 2 pass, 1 missing → failing > 0; quality: 1 pass, 1 fail → both > 0
    expect(result.status).toBe("partial");
  });

  it("skips qualityExpectations when includeQualityResults=false", async () => {
    setupMocks();
    const result = await validateDataContract({ contractFqn: "orders.contract.v1", includeQualityResults: false });
    expect(result.qualityExpectations.total).toBe(0);
    expect(result.qualityExpectations.findings).toHaveLength(0);
  });

  it("returns inconclusive when contract has no entity FQN", async () => {
    setupMocks({
      contract: { ...SAMPLE_CONTRACT, entity: {} },
    });
    const result = await validateDataContract({ contractFqn: "orders.contract.v1", includeQualityResults: true });
    expect(result.status).toBe("inconclusive");
    expect(result.entityFqn).toBeNull();
  });

  it("surfaces caveat when entity type is not table", async () => {
    setupMocks({
      contract: {
        ...SAMPLE_CONTRACT,
        entity: { fullyQualifiedName: "topic.fqn", type: "topic" },
        schema: [],
        qualityExpectations: [],
      },
    });
    const result = await validateDataContract({ contractFqn: "orders.contract.v1", includeQualityResults: false });
    expect(result.caveats.some((c) => c.includes("topic"))).toBe(true);
  });

  it("throws on contract fetch failure", async () => {
    mockGet.mockImplementation(() => {
      throw new Error("404 Not Found");
    });
    await expect(
      validateDataContract({ contractFqn: "missing.contract", includeQualityResults: true }),
    ).rejects.toThrow(/Failed to fetch data contract/);
  });
});
