import { z } from "zod/v4";
import { aggregate } from "@us-all/mcp-toolkit";
import { omClient } from "../client.js";

/**
 * `validate-data-contract` — read-only validation of an OM 1.12+ Data Contract
 * against the actual state of its referenced entity.
 *
 * Companion to the `data-contract-bootstrap` MCP Prompt. Bootstrap *infers* a
 * contract from the entity; this validates an existing contract and reports
 * which rules currently pass/fail so the LLM (or a human) can act on the gap.
 *
 * Scope:
 *   - **Schema rules**: per-column existence + type match + nullable/constraint
 *   - **Quality expectations**: latest test case result per linked test case
 *   - SLA / freshness rules are surfaced as `notValidated` items pointing at
 *     `get-table-summary` for the underlying profile data (out of scope for
 *     this tool — they need profiling pipeline data, not a single REST call)
 *
 * Implementation: parallel fetch (contract + table + per-test-case results)
 * via `aggregate()`. Partial failures degrade to `caveats[]` rather than failing
 * the whole report.
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyRecord = Record<string, any>;

interface SchemaRule {
  name?: string;
  columnName?: string;
  dataType?: string;
  expectedType?: string;
  nullable?: boolean;
  constraint?: string;
  description?: string;
}

interface SchemaFinding {
  field: string;
  status: "pass" | "fail" | "missing";
  expected: { type?: string; nullable?: boolean; constraint?: string };
  actual?: { type?: string; nullable?: boolean; constraint?: string };
  reason?: string;
}

interface QualityExpectation {
  // OM EntityReference shape
  id?: string;
  fullyQualifiedName?: string;
  name?: string;
  type?: string;
}

interface QualityFinding {
  testCase: string;
  status: "pass" | "fail" | "aborted" | "queued" | "unknown";
  lastRunAt?: string | number;
  note?: string;
}

function normalizeType(t: string | undefined): string {
  return (t ?? "").trim().toLowerCase().replace(/\(.*\)$/, "");
}

function compareSchemaRule(rule: SchemaRule, column: AnyRecord | undefined): SchemaFinding {
  const field = rule.columnName ?? rule.name ?? "(unnamed-rule)";
  if (!column) {
    return {
      field,
      status: "missing",
      expected: { type: rule.expectedType ?? rule.dataType, nullable: rule.nullable, constraint: rule.constraint },
      reason: "column not found in table",
    };
  }

  const expectedType = rule.expectedType ?? rule.dataType;
  const actualType = column.dataType as string | undefined;

  const typeOk = !expectedType || normalizeType(actualType) === normalizeType(expectedType);

  // OM table columns commonly have constraint: PRIMARY_KEY / NOT_NULL / UNIQUE etc.
  // No constraint → assume nullable (column is nullable by default in most warehouses).
  // Some contracts express required as `nullable: false`.
  const expectedNullable = rule.nullable;
  const actualNullable = column.constraint
    ? !["NOT_NULL", "PRIMARY_KEY"].includes(String(column.constraint))
    : true;
  const nullableOk = expectedNullable === undefined || expectedNullable === actualNullable;

  const expectedConstraint = rule.constraint;
  const actualConstraint = column.constraint as string | undefined;
  const constraintOk = !expectedConstraint || expectedConstraint === actualConstraint;

  if (typeOk && nullableOk && constraintOk) {
    return {
      field,
      status: "pass",
      expected: { type: expectedType, nullable: expectedNullable, constraint: expectedConstraint },
      actual: { type: actualType, nullable: actualNullable, constraint: actualConstraint },
    };
  }
  const reasons: string[] = [];
  if (!typeOk) reasons.push(`type mismatch (expected ${expectedType}, got ${actualType ?? "<none>"})`);
  if (!nullableOk) reasons.push(`nullable mismatch (expected ${expectedNullable}, got ${actualNullable})`);
  if (!constraintOk) reasons.push(`constraint mismatch (expected ${expectedConstraint}, got ${actualConstraint ?? "<none>"})`);
  return {
    field,
    status: "fail",
    expected: { type: expectedType, nullable: expectedNullable, constraint: expectedConstraint },
    actual: { type: actualType, nullable: actualNullable, constraint: actualConstraint },
    reason: reasons.join("; "),
  };
}

export const validateDataContractSchema = z.object({
  contractFqn: z
    .string()
    .describe("Fully qualified name of the Data Contract to validate (e.g. 'orders.contract.v1')"),
  includeQualityResults: z
    .boolean()
    .optional()
    .default(true)
    .describe("Fetch latest test case result for each quality expectation. Default true."),
});

export async function validateDataContract(params: z.infer<typeof validateDataContractSchema>) {
  const caveats: string[] = [];
  const contractFqn = params.contractFqn;

  // 1. Fetch the contract (need schema, qualityExpectations, entity)
  let contract: AnyRecord;
  try {
    contract = (await omClient.get(
      `/dataContracts/name/${encodeURIComponent(contractFqn)}`,
      { fields: "schema,qualityExpectations,entity,status" },
    )) as AnyRecord;
  } catch (err) {
    throw new Error(
      `Failed to fetch data contract "${contractFqn}": ${err instanceof Error ? err.message : String(err)}`,
    );
  }

  const entityFqn = (contract.entity?.fullyQualifiedName as string | undefined) ?? "";
  const entityType = (contract.entity?.type as string | undefined) ?? "";

  if (!entityFqn) {
    return {
      contractFqn,
      contractStatus: contract.status,
      entityFqn: null,
      status: "inconclusive" as const,
      reason: "contract.entity.fullyQualifiedName missing — cannot resolve target entity",
      caveats,
    };
  }

  if (entityType && entityType !== "table") {
    caveats.push(
      `entity is type "${entityType}" — schema validation is implemented for tables only; ` +
        "results below cover qualityExpectations but skip schema rules",
    );
  }

  // 2. Fetch the table (only if entity is a table)
  const fetchTable = async (): Promise<AnyRecord | null> => {
    if (entityType && entityType !== "table") return null;
    return (await omClient.get(
      `/tables/name/${encodeURIComponent(entityFqn)}`,
      { fields: "columns" },
    )) as AnyRecord;
  };

  // 3. Fetch latest result per quality expectation (if requested)
  const qualityExpectations: QualityExpectation[] = Array.isArray(contract.qualityExpectations)
    ? contract.qualityExpectations
    : [];

  const fetchTestCaseResult = (qe: QualityExpectation): (() => Promise<AnyRecord | null>) => {
    return async () => {
      const id = qe.id;
      if (!id) return null;
      // OM exposes test case latest result via /dataQuality/testCases/{id} which embeds testCaseResult
      const tc = (await omClient.get(`/dataQuality/testCases/${encodeURIComponent(id)}`, {
        fields: "testCaseResult",
      })) as AnyRecord;
      return tc;
    };
  };

  const fetchers: Record<string, () => Promise<AnyRecord | null>> = {
    table: fetchTable,
  };
  if (params.includeQualityResults) {
    qualityExpectations.forEach((qe, idx) => {
      const key = `qe_${idx}`;
      fetchers[key] = fetchTestCaseResult(qe);
    });
  }

  const fetched = await aggregate(fetchers, caveats);

  // 4. Schema validation
  const schemaRules: SchemaRule[] = Array.isArray(contract.schema) ? contract.schema : [];
  const tableData = fetched.table;
  const columns: AnyRecord[] = Array.isArray(tableData?.columns) ? tableData.columns : [];
  const columnByName = new Map<string, AnyRecord>();
  for (const c of columns) {
    if (c?.name) columnByName.set(c.name as string, c);
  }

  const schemaFindings: SchemaFinding[] = [];
  if (entityType === "table" || !entityType) {
    if (!tableData) {
      caveats.push("table fetch failed — schema rules cannot be validated");
    } else {
      for (const rule of schemaRules) {
        const colName = rule.columnName ?? rule.name ?? "";
        const column = colName ? columnByName.get(colName) : undefined;
        schemaFindings.push(compareSchemaRule(rule, column));
      }
    }
  }

  // 5. Quality validation
  const qualityFindings: QualityFinding[] = [];
  if (params.includeQualityResults) {
    qualityExpectations.forEach((qe, idx) => {
      const key = `qe_${idx}`;
      const tc = fetched[key];
      if (!tc) {
        qualityFindings.push({
          testCase: qe.fullyQualifiedName ?? qe.name ?? `(qe_${idx})`,
          status: "unknown",
          note: "fetch failed or no result yet — see caveats",
        });
        return;
      }
      const result = tc.testCaseResult as AnyRecord | undefined;
      const status = (result?.testCaseStatus as string | undefined)?.toLowerCase() ?? "unknown";
      const mapped: QualityFinding["status"] =
        status === "success" ? "pass"
          : status === "failed" ? "fail"
          : status === "aborted" ? "aborted"
          : status === "queued" ? "queued"
          : "unknown";
      qualityFindings.push({
        testCase: qe.fullyQualifiedName ?? qe.name ?? tc.name ?? `(qe_${idx})`,
        status: mapped,
        lastRunAt: result?.timestamp,
        note: result?.result ? String(result.result) : undefined,
      });
    });
  }

  // 6. Aggregate status
  const schemaPassing = schemaFindings.filter((f) => f.status === "pass").length;
  const schemaFailing = schemaFindings.filter((f) => f.status === "fail" || f.status === "missing").length;
  const qualityPassing = qualityFindings.filter((f) => f.status === "pass").length;
  const qualityFailing = qualityFindings.filter((f) => f.status === "fail" || f.status === "aborted").length;

  let overallStatus: "passing" | "failing" | "partial" | "inconclusive";
  if (schemaFindings.length === 0 && qualityFindings.length === 0) {
    overallStatus = "inconclusive";
  } else if (schemaFailing === 0 && qualityFailing === 0) {
    overallStatus = "passing";
  } else if (schemaPassing === 0 && qualityPassing === 0) {
    overallStatus = "failing";
  } else {
    overallStatus = "partial";
  }

  return {
    contractFqn,
    contractStatus: contract.status,
    entityFqn,
    entityType: entityType || "table",
    evaluatedAt: new Date().toISOString(),
    status: overallStatus,
    schema: {
      total: schemaFindings.length,
      passing: schemaPassing,
      failing: schemaFailing,
      findings: schemaFindings,
    },
    qualityExpectations: {
      total: qualityFindings.length,
      passing: qualityPassing,
      failing: qualityFailing,
      findings: qualityFindings,
    },
    caveats,
  };
}
