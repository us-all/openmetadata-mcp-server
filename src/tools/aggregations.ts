import { z } from "zod/v4";
import { omClient } from "../client.js";
import { extractFieldsDescription } from "./extract-fields.js";

const ef = z.string().optional().describe(extractFieldsDescription);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyRecord = Record<string, any>;

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

// --- get-domain-summary ---
//
// One-call snapshot of a Domain's scope. Replaces 5-7 sequential calls
// (domain → data products → tables → dashboards → pipelines → topics → ml-models).
//
// Implementation note: most OpenMetadata REST list endpoints (/tables, /dashboards,
// /pipelines, /topics, /mlmodels) do NOT accept a `domain` query filter directly,
// so we fall back to /search/query with `domains.fullyQualifiedName:"<fqn>"`
// (note: plural — entities carry a `domains` array, not a singular `domain`).
// /dataProducts list does support a `domain` filter natively. /domains/name/{fqn}
// is used for the domain config (experts/owners/description).

export const getDomainSummarySchema = z.object({
  domainFqn: z.string().describe("Domain fully qualified name (e.g. 'Sales' or 'Marketing.US')"),
  entityLimit: z.coerce.number().int().min(1).max(50).optional().default(10)
    .describe("Cap per entity-type sample (default 10, max 50). Full counts are still returned via paging.total / hits.total."),
  extractFields: ef,
});

type SearchHit = { _source?: AnyRecord };
type SearchResult = { hits?: { total?: { value?: number } | number; hits?: SearchHit[] } };

function searchTotal(res: SearchResult | null | undefined): number {
  const total = res?.hits?.total;
  if (typeof total === "number") return total;
  return total?.value ?? 0;
}

function ownerSlim(owners: unknown): Array<{ name?: string; type?: string }> | undefined {
  if (!Array.isArray(owners)) return undefined;
  return owners.map((o: AnyRecord) => ({ name: o?.name, type: o?.type }));
}

function tagsSlim(tags: unknown): Array<{ tagFQN?: string }> | undefined {
  if (!Array.isArray(tags)) return undefined;
  return tags.map((t: AnyRecord) => ({ tagFQN: t?.tagFQN }));
}

async function searchByDomain(index: string, fqn: string, limit: number) {
  // Quote fqn so dots/spaces are matched as one term.
  const q = `domains.fullyQualifiedName:"${fqn}"`;
  return omClient.get<SearchResult>("/search/query", {
    q,
    index,
    from: 0,
    size: limit,
    track_total_hits: true,
  });
}

export async function getDomainSummary(params: z.infer<typeof getDomainSummarySchema>) {
  const fqn = params.domainFqn;
  const encoded = encodeURIComponent(fqn);
  const limit = params.entityLimit ?? 10;
  const caveats: string[] = [];

  const [
    domainResult,
    dataProductsResult,
    tablesResult,
    dashboardsResult,
    pipelinesResult,
    topicsResult,
    mlModelsResult,
  ] = await Promise.allSettled([
    omClient.get<AnyRecord>(`/domains/name/${encoded}`, {
      fields: "experts,owners,description,parent,domainType",
    }),
    // /dataProducts supports `domain` filter natively
    omClient.get<{ data?: AnyRecord[]; paging?: { total?: number } }>("/dataProducts", {
      domain: fqn,
      limit,
      fields: "owners,description",
    }),
    // search-metadata fallback for the rest
    searchByDomain("table_search_index", fqn, limit),
    searchByDomain("dashboard_search_index", fqn, limit),
    searchByDomain("pipeline_search_index", fqn, limit),
    searchByDomain("topic_search_index", fqn, limit),
    searchByDomain("mlmodel_search_index", fqn, limit),
  ]);

  // domain
  let domain: AnyRecord | null = null;
  if (domainResult.status === "fulfilled") {
    const d = domainResult.value;
    domain = {
      id: d?.id,
      name: d?.name,
      fqn: d?.fullyQualifiedName ?? d?.name,
      description: d?.description,
      owners: ownerSlim(d?.owners),
      experts: ownerSlim(d?.experts),
    };
  } else {
    caveats.push(`get-domain-by-name failed: ${(domainResult.reason as Error)?.message ?? String(domainResult.reason)}`);
  }

  // data products (native list)
  let dataProducts: { count: number; samples: AnyRecord[] } = { count: 0, samples: [] };
  if (dataProductsResult.status === "fulfilled") {
    const v = dataProductsResult.value;
    const items = v?.data ?? [];
    dataProducts = {
      count: v?.paging?.total ?? items.length,
      samples: items.slice(0, limit).map((dp) => ({
        name: dp?.name,
        fqn: dp?.fullyQualifiedName,
        description: dp?.description,
        owners: ownerSlim(dp?.owners),
      })),
    };
  } else {
    caveats.push(`list-data-products failed: ${(dataProductsResult.reason as Error)?.message ?? String(dataProductsResult.reason)}`);
  }

  function projectSearchHits(label: string, settled: PromiseSettledResult<SearchResult>, includeTags = false) {
    if (settled.status !== "fulfilled") {
      caveats.push(`${label} failed: ${(settled.reason as Error)?.message ?? String(settled.reason)}`);
      return { count: 0, samples: [] as AnyRecord[] };
    }
    const v = settled.value;
    const hits = v?.hits?.hits ?? [];
    return {
      count: searchTotal(v),
      samples: hits.slice(0, limit).map((h) => {
        const s = h._source ?? {};
        const sample: AnyRecord = {
          name: s.name,
          fqn: s.fullyQualifiedName,
          owners: ownerSlim(s.owners),
        };
        if (includeTags) sample.tags = tagsSlim(s.tags);
        return sample;
      }),
    };
  }

  const tables = projectSearchHits("list-tables", tablesResult, true);
  const dashboards = projectSearchHits("list-dashboards", dashboardsResult);
  const pipelines = projectSearchHits("list-pipelines", pipelinesResult);
  const topics = projectSearchHits("list-topics", topicsResult);
  const mlModels = projectSearchHits("list-ml-models", mlModelsResult);

  return {
    domain,
    dataProducts,
    tables,
    dashboards,
    pipelines,
    topics,
    mlModels,
    caveats,
  };
}
