import { z } from "zod/v4";
import { omClient } from "../client.js";
import { applyExtractFields, extractFieldsDescription } from "./extract-fields.js";

/**
 * OM 1.12+ governance/data-asset entities (read-only — list + get-by-name only).
 *
 * Endpoints follow OpenMetadata REST conventions:
 *   /v1/{collection}            → list
 *   /v1/{collection}/name/{fqn} → get-by-name
 *
 * The `omClient` is already mounted at `/api/v1`, so we pass the collection path only
 * (e.g. `/dataContracts`).
 */

// Shared helpers ------------------------------------------------------------

const listIncludeEnum = z.enum(["non-deleted", "deleted", "all"]);

// Default projections drop noise (changeDescription, incrementalChangeDescription,
// version, updatedBy, href, entityStatus, deleted, _unparsed) when caller didn't
// pass extractFields. Caller-supplied extractFields takes precedence.
const COMMON_LIST_FIELDS = "data.*.id,data.*.name,data.*.fullyQualifiedName,data.*.displayName,data.*.description,data.*.owners,data.*.tags,data.*.updatedAt,paging";
const COMMON_GET_FIELDS = "id,name,fullyQualifiedName,displayName,description,owners,tags,updatedAt";

const DEFAULTS = {
  dataContract: {
    list: `${COMMON_LIST_FIELDS},data.*.entity,data.*.status,data.*.semantics,data.*.qualityExpectations`,
    get:  `${COMMON_GET_FIELDS},entity,status,semantics,schema,qualityExpectations`,
  },
  metric: {
    list: `${COMMON_LIST_FIELDS},data.*.metricExpression,data.*.metricType,data.*.granularity,data.*.unitOfMeasurement`,
    get:  `${COMMON_GET_FIELDS},metricExpression,metricType,granularity,unitOfMeasurement,relatedMetrics`,
  },
  searchIndex: {
    list: `${COMMON_LIST_FIELDS},data.*.service,data.*.indexType,data.*.searchIndexSettings`,
    get:  `${COMMON_GET_FIELDS},service,indexType,fields,searchIndexSettings`,
  },
  apiCollection: {
    list: `${COMMON_LIST_FIELDS},data.*.service,data.*.endpointURL`,
    get:  `${COMMON_GET_FIELDS},service,endpointURL,apiEndpoints`,
  },
  apiEndpoint: {
    list: `${COMMON_LIST_FIELDS},data.*.endpointURL,data.*.requestMethod,data.*.apiCollection`,
    get:  `${COMMON_GET_FIELDS},apiCollection,endpointURL,requestMethod,requestSchema,responseSchema`,
  },
} as const;

// --- Data Contracts --------------------------------------------------------

export const listDataContractsSchema = z.object({
  fields: z.string().optional().describe("Comma-separated fields to include"),
  limit: z.coerce.number().optional().default(10).describe("Number of results per page"),
  before: z.string().optional().describe("Cursor for backward pagination"),
  after: z.string().optional().describe("Cursor for forward pagination"),
  include: listIncludeEnum.optional().default("non-deleted").describe("Include deleted entities"),
  extractFields: z.string().optional().describe(extractFieldsDescription),
});

export async function listDataContracts(params: z.infer<typeof listDataContractsSchema>) {
  const { extractFields, ...query } = params;
  const data = await omClient.get("/dataContracts", query);
  if (extractFields) return data;
  return applyExtractFields(data, DEFAULTS.dataContract.list);
}

export const getDataContractByNameSchema = z.object({
  fqn: z.string().describe("Data Contract fully qualified name"),
  fields: z.string().optional().describe("Comma-separated fields to include"),
  include: listIncludeEnum.optional(),
  extractFields: z.string().optional().describe(extractFieldsDescription),
});

export async function getDataContractByName(params: z.infer<typeof getDataContractByNameSchema>) {
  const { fqn, extractFields, ...query } = params;
  const data = await omClient.get(`/dataContracts/name/${encodeURIComponent(fqn)}`, query);
  if (extractFields) return data;
  return applyExtractFields(data, DEFAULTS.dataContract.get);
}

// --- Metrics ---------------------------------------------------------------

export const listMetricsSchema = z.object({
  fields: z.string().optional().describe("Comma-separated fields to include"),
  limit: z.coerce.number().optional().default(10).describe("Number of results per page"),
  before: z.string().optional().describe("Cursor for backward pagination"),
  after: z.string().optional().describe("Cursor for forward pagination"),
  include: listIncludeEnum.optional().default("non-deleted").describe("Include deleted entities"),
  extractFields: z.string().optional().describe(extractFieldsDescription),
});

export async function listMetrics(params: z.infer<typeof listMetricsSchema>) {
  const { extractFields, ...query } = params;
  const data = await omClient.get("/metrics", query);
  if (extractFields) return data;
  return applyExtractFields(data, DEFAULTS.metric.list);
}

export const getMetricByNameSchema = z.object({
  fqn: z.string().describe("Metric fully qualified name"),
  fields: z.string().optional().describe("Comma-separated fields to include"),
  include: listIncludeEnum.optional(),
  extractFields: z.string().optional().describe(extractFieldsDescription),
});

export async function getMetricByName(params: z.infer<typeof getMetricByNameSchema>) {
  const { fqn, extractFields, ...query } = params;
  const data = await omClient.get(`/metrics/name/${encodeURIComponent(fqn)}`, query);
  if (extractFields) return data;
  return applyExtractFields(data, DEFAULTS.metric.get);
}

// --- Search Indexes --------------------------------------------------------

export const listSearchIndexesSchema = z.object({
  fields: z.string().optional().describe("Comma-separated fields to include"),
  limit: z.coerce.number().optional().default(10).describe("Number of results per page"),
  before: z.string().optional().describe("Cursor for backward pagination"),
  after: z.string().optional().describe("Cursor for forward pagination"),
  service: z.string().optional().describe("Filter by search service FQN"),
  include: listIncludeEnum.optional().default("non-deleted").describe("Include deleted entities"),
  extractFields: z.string().optional().describe(extractFieldsDescription),
});

export async function listSearchIndexes(params: z.infer<typeof listSearchIndexesSchema>) {
  const { extractFields, ...query } = params;
  const data = await omClient.get("/searchIndexes", query);
  if (extractFields) return data;
  return applyExtractFields(data, DEFAULTS.searchIndex.list);
}

export const getSearchIndexByNameSchema = z.object({
  fqn: z.string().describe("Search Index fully qualified name"),
  fields: z.string().optional().describe("Comma-separated fields to include"),
  include: listIncludeEnum.optional(),
  extractFields: z.string().optional().describe(extractFieldsDescription),
});

export async function getSearchIndexByName(params: z.infer<typeof getSearchIndexByNameSchema>) {
  const { fqn, extractFields, ...query } = params;
  const data = await omClient.get(`/searchIndexes/name/${encodeURIComponent(fqn)}`, query);
  if (extractFields) return data;
  return applyExtractFields(data, DEFAULTS.searchIndex.get);
}

// --- API Collections -------------------------------------------------------

export const listApiCollectionsSchema = z.object({
  fields: z.string().optional().describe("Comma-separated fields to include"),
  limit: z.coerce.number().optional().default(10).describe("Number of results per page"),
  before: z.string().optional().describe("Cursor for backward pagination"),
  after: z.string().optional().describe("Cursor for forward pagination"),
  service: z.string().optional().describe("Filter by API service FQN"),
  include: listIncludeEnum.optional().default("non-deleted").describe("Include deleted entities"),
  extractFields: z.string().optional().describe(extractFieldsDescription),
});

export async function listApiCollections(params: z.infer<typeof listApiCollectionsSchema>) {
  const { extractFields, ...query } = params;
  const data = await omClient.get("/apiCollections", query);
  if (extractFields) return data;
  return applyExtractFields(data, DEFAULTS.apiCollection.list);
}

export const getApiCollectionByNameSchema = z.object({
  fqn: z.string().describe("API Collection fully qualified name"),
  fields: z.string().optional().describe("Comma-separated fields to include"),
  include: listIncludeEnum.optional(),
  extractFields: z.string().optional().describe(extractFieldsDescription),
});

export async function getApiCollectionByName(params: z.infer<typeof getApiCollectionByNameSchema>) {
  const { fqn, extractFields, ...query } = params;
  const data = await omClient.get(`/apiCollections/name/${encodeURIComponent(fqn)}`, query);
  if (extractFields) return data;
  return applyExtractFields(data, DEFAULTS.apiCollection.get);
}

// --- API Endpoints ---------------------------------------------------------

export const listApiEndpointsSchema = z.object({
  fields: z.string().optional().describe("Comma-separated fields to include"),
  limit: z.coerce.number().optional().default(10).describe("Number of results per page"),
  before: z.string().optional().describe("Cursor for backward pagination"),
  after: z.string().optional().describe("Cursor for forward pagination"),
  apiCollection: z.string().optional().describe("Filter by parent API collection FQN"),
  include: listIncludeEnum.optional().default("non-deleted").describe("Include deleted entities"),
  extractFields: z.string().optional().describe(extractFieldsDescription),
});

export async function listApiEndpoints(params: z.infer<typeof listApiEndpointsSchema>) {
  const { extractFields, ...query } = params;
  const data = await omClient.get("/apiEndpoints", query);
  if (extractFields) return data;
  return applyExtractFields(data, DEFAULTS.apiEndpoint.list);
}

export const getApiEndpointByNameSchema = z.object({
  fqn: z.string().describe("API Endpoint fully qualified name"),
  fields: z.string().optional().describe("Comma-separated fields to include"),
  include: listIncludeEnum.optional(),
  extractFields: z.string().optional().describe(extractFieldsDescription),
});

export async function getApiEndpointByName(params: z.infer<typeof getApiEndpointByNameSchema>) {
  const { fqn, extractFields, ...query } = params;
  const data = await omClient.get(`/apiEndpoints/name/${encodeURIComponent(fqn)}`, query);
  if (extractFields) return data;
  return applyExtractFields(data, DEFAULTS.apiEndpoint.get);
}
