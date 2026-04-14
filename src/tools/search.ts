import { z } from "zod/v4";
import { omClient } from "../client.js";

// --- search-metadata ---

export const searchMetadataSchema = z.object({
  q: z.string().describe("Search query string. Example: 'customer_orders'"),
  index: z.enum([
    "table_search_index", "topic_search_index", "dashboard_search_index",
    "pipeline_search_index", "mlmodel_search_index", "container_search_index",
    "query_search_index", "user_search_index", "team_search_index",
    "glossary_term_search_index", "tag_search_index", "data_product_search_index",
    "stored_procedure_search_index", "dashboard_data_model_search_index",
    "search_entity_search_index", "domain_search_index", "api_collection_search_index",
    "api_endpoint_search_index",
  ]).optional().describe("Restrict search to a specific entity index"),
  from: z.coerce.number().optional().default(0).describe("Pagination offset"),
  size: z.coerce.number().optional().default(10).describe("Number of results to return (max 100)"),
  deleted: z.boolean().optional().default(false).describe("Include soft-deleted entities"),
  trackTotalHits: z.boolean().optional().default(false).describe("Track exact total hit count"),
  queryFilter: z.string().optional().describe("Additional ElasticSearch query filter as JSON string"),
  sortField: z.string().optional().describe("Field to sort by (e.g. 'name.keyword', 'updatedAt')"),
  sortOrder: z.enum(["asc", "desc"]).optional().describe("Sort order"),
  includeSourceFields: z.string().optional().describe("Comma-separated source fields to include in response"),
});

export async function searchMetadata(params: z.infer<typeof searchMetadataSchema>) {
  return omClient.get("/search/query", {
    q: params.q,
    index: params.index,
    from: params.from,
    size: Math.min(params.size ?? 10, 100),
    deleted: params.deleted,
    track_total_hits: params.trackTotalHits,
    query_filter: params.queryFilter,
    sort_field: params.sortField,
    sort_order: params.sortOrder,
    include_source_fields: params.includeSourceFields,
  });
}

// --- suggest-metadata ---

export const suggestMetadataSchema = z.object({
  q: z.string().describe("Query text for autocomplete suggestions"),
  index: z.enum([
    "table_search_index", "topic_search_index", "dashboard_search_index",
    "pipeline_search_index", "mlmodel_search_index", "container_search_index",
    "query_search_index", "user_search_index", "team_search_index",
    "glossary_term_search_index", "tag_search_index", "data_product_search_index",
  ]).optional().describe("Restrict suggestions to a specific entity index"),
  size: z.coerce.number().optional().default(10).describe("Number of suggestions to return"),
  field: z.string().optional().describe("Field to get suggestions for (e.g. 'name', 'displayName')"),
});

export async function suggestMetadata(params: z.infer<typeof suggestMetadataSchema>) {
  return omClient.get("/search/suggest", {
    q: params.q,
    index: params.index,
    size: Math.min(params.size ?? 10, 25),
    field: params.field,
  });
}
