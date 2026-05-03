import { z } from "zod/v4";
import { aggregate } from "@us-all/mcp-toolkit";
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

  const caveats: string[] = [];

  const { table, lineage } = await aggregate(
    {
      table: () =>
        omClient.get<{ id: string }>(`/tables/name/${encoded}`, {
          fields: "columns,owners,tags,description,tableConstraints,joins,domains,dataProducts",
        }),
      lineage: params.includeLineage
        ? () => omClient.get(`/lineage/table/name/${encoded}`, { upstreamDepth: 2, downstreamDepth: 2 })
        : () => Promise.resolve(null),
    },
    caveats,
  );

  const tableId = (table as { id?: string } | null)?.id;

  // sample/testCases need table id; fetched serially after the table call
  const sample = params.includeSample && tableId
    ? await omClient.get(`/tables/${tableId}/sampleData`).catch(() => ({ error: "sample data unavailable" }))
    : null;

  const testCases = params.includeTestCases
    ? await omClient.get("/dataQuality/testCases", { entityLink: `<#E::table::${fqn}>`, limit: 50 }).catch(() => ({ error: "test cases unavailable" }))
    : null;

  return {
    table,
    lineage,
    sampleData: sample,
    testCases,
    summary: {
      columnCount: (table as { columns?: unknown[] } | null)?.columns?.length ?? 0,
      tagCount: (table as { tags?: unknown[] } | null)?.tags?.length ?? 0,
      hasLineage: !!lineage,
      sampleIncluded: !!sample,
      testCasesIncluded: !!testCases,
    },
    caveats,
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

  const fetched = await aggregate(
    {
      domain: () =>
        omClient.get<AnyRecord>(`/domains/name/${encoded}`, {
          fields: "experts,owners,description,parent,domainType",
        }),
      // /dataProducts supports `domain` filter natively
      dataProducts: () =>
        omClient.get<{ data?: AnyRecord[]; paging?: { total?: number } }>("/dataProducts", {
          domain: fqn,
          limit,
          fields: "owners,description",
        }),
      // search-metadata fallback for the rest
      tables: () => searchByDomain("table_search_index", fqn, limit),
      dashboards: () => searchByDomain("dashboard_search_index", fqn, limit),
      pipelines: () => searchByDomain("pipeline_search_index", fqn, limit),
      topics: () => searchByDomain("topic_search_index", fqn, limit),
      mlModels: () => searchByDomain("mlmodel_search_index", fqn, limit),
    },
    caveats,
  );

  // domain
  const d = fetched.domain;
  const domain = d
    ? {
        id: d.id,
        name: d.name,
        fqn: d.fullyQualifiedName ?? d.name,
        description: d.description,
        owners: ownerSlim(d.owners),
        experts: ownerSlim(d.experts),
      }
    : null;

  // data products (native list)
  const dpItems = fetched.dataProducts?.data ?? [];
  const dataProducts = fetched.dataProducts
    ? {
        count: fetched.dataProducts.paging?.total ?? dpItems.length,
        samples: dpItems.slice(0, limit).map((dp) => ({
          name: dp?.name,
          fqn: dp?.fullyQualifiedName,
          description: dp?.description,
          owners: ownerSlim(dp?.owners),
        })),
      }
    : { count: 0, samples: [] as AnyRecord[] };

  function projectSearchHits(value: SearchResult | null, includeTags = false) {
    if (!value) return { count: 0, samples: [] as AnyRecord[] };
    const hits = value.hits?.hits ?? [];
    return {
      count: searchTotal(value),
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

  const tables = projectSearchHits(fetched.tables, true);
  const dashboards = projectSearchHits(fetched.dashboards);
  const pipelines = projectSearchHits(fetched.pipelines);
  const topics = projectSearchHits(fetched.topics);
  const mlModels = projectSearchHits(fetched.mlModels);

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
