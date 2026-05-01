import { z } from "zod/v4";
import { omClient } from "../client.js";
import { extractFieldsDescription } from "./extract-fields.js";

const ef = z.string().optional().describe(extractFieldsDescription);

/**
 * Aggregation tools — fetch multiple related artifacts in a single call.
 *
 * Without aggregation, an LLM exploring a table typically needs 3-4 round-trips:
 *   1. get-table-by-name        → entity with columns
 *   2. get-lineage-by-name      → upstream/downstream
 *   3. get-table-sample-data    → sample rows
 *   4. (optional) list-test-cases → DQ status
 *
 * With aggregation, one call returns the consolidated view.
 */

// --- get-table-summary ---

export const getTableSummarySchema = z.object({
  fqn: z.string().describe("Fully qualified table name (e.g. 'service.database.schema.tableName')"),
  includeLineage: z.boolean().optional().default(true).describe("Include upstream/downstream lineage (depth 2). Default true."),
  includeSample: z.boolean().optional().default(false).describe("Include sample data rows. Default false (sample data can be large)."),
  includeTestCases: z.boolean().optional().default(false).describe("Include data-quality test cases for the table. Default false."),
  extractFields: ef,
});

export async function getTableSummary(params: z.infer<typeof getTableSummarySchema>) {
  const fqn = params.fqn;
  const encoded = encodeURIComponent(fqn);

  const [tableResult, lineageResult, sampleResult, testCasesResult] = await Promise.allSettled([
    omClient.get<{ id: string }>(`/tables/name/${encoded}`, {
      fields: "columns,owners,tags,description,tableConstraints,joins,domains,dataProducts",
    }),
    params.includeLineage
      ? omClient.get(`/lineage/table/name/${encoded}`, { upstreamDepth: 2, downstreamDepth: 2 })
      : Promise.resolve(null),
    Promise.resolve(null), // resolved below using table id
    Promise.resolve(null),
  ]);

  const table = tableResult.status === "fulfilled" ? tableResult.value : null;
  const tableId = (table as { id?: string } | null)?.id;

  // sample/testCases need table id
  const sample = params.includeSample && tableId
    ? await omClient.get(`/tables/${tableId}/sampleData`).catch(() => ({ error: "sample data unavailable" }))
    : null;

  const testCases = params.includeTestCases
    ? await omClient.get("/dataQuality/testCases", { entityLink: `<#E::table::${fqn}>`, limit: 50 }).catch(() => ({ error: "test cases unavailable" }))
    : null;

  return {
    table,
    lineage: lineageResult.status === "fulfilled" ? lineageResult.value : null,
    sampleData: sample,
    testCases,
    summary: {
      columnCount: (table as { columns?: unknown[] } | null)?.columns?.length ?? 0,
      tagCount: (table as { tags?: unknown[] } | null)?.tags?.length ?? 0,
      hasLineage: !!lineageResult,
      sampleIncluded: !!sample,
      testCasesIncluded: !!testCases,
    },
  };
}
