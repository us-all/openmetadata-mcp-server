import { z } from "zod/v4";
import { omClient } from "../client.js";
import { assertWriteAllowed } from "./utils.js";
import { extractFieldsDescription } from "./extract-fields.js";

const ef = z.string().optional().describe(extractFieldsDescription);

// --- list-charts ---

export const listChartsSchema = z.object({
  fields: z.string().optional().describe("Comma-separated fields to include (e.g. 'owners,tags,followers')"),
  limit: z.coerce.number().optional().default(10).describe("Number of results per page"),
  before: z.string().optional().describe("Cursor for backward pagination"),
  after: z.string().optional().describe("Cursor for forward pagination"),
  service: z.string().optional().describe("Filter by service FQN"),
  include: z.enum(["non-deleted", "deleted", "all"]).optional().default("non-deleted").describe("Include deleted entities"),
  extractFields: ef,
});

export async function listCharts(params: z.infer<typeof listChartsSchema>) {
  return omClient.get("/charts", params);
}

// --- get-chart ---

export const getChartSchema = z.object({
  id: z.string().describe("Chart UUID"),
  fields: z.string().optional().describe("Comma-separated fields to include"),
  include: z.enum(["non-deleted", "deleted", "all"]).optional(),
  extractFields: ef,
});

export async function getChart(params: z.infer<typeof getChartSchema>) {
  const { id, ...query } = params;
  return omClient.get(`/charts/${id}`, query);
}

// --- get-chart-by-name ---

export const getChartByNameSchema = z.object({
  fqn: z.string().describe("Fully qualified name (e.g. 'service.chartName')"),
  fields: z.string().optional().describe("Comma-separated fields to include"),
  include: z.enum(["non-deleted", "deleted", "all"]).optional(),
  extractFields: ef,
});

export async function getChartByName(params: z.infer<typeof getChartByNameSchema>) {
  const { fqn, ...query } = params;
  return omClient.get(`/charts/name/${encodeURIComponent(fqn)}`, query);
}

// --- create-chart ---

export const createChartSchema = z.object({
  name: z.string().describe("Chart name"),
  service: z.string().describe("FQN of the dashboard service"),
  description: z.string().optional().describe("Chart description in markdown"),
  displayName: z.string().optional().describe("Display name"),
  chartType: z.string().optional().describe("Chart type (e.g. 'Bar', 'Line', 'Pie')"),
  sourceUrl: z.string().optional().describe("Source URL of the chart"),
  tags: z.array(z.record(z.string(), z.any())).optional().describe("Tags to apply"),
  owners: z.array(z.record(z.string(), z.any())).optional().describe("Owner references"),
});

export async function createChart(params: z.infer<typeof createChartSchema>) {
  assertWriteAllowed();
  return omClient.post("/charts", params);
}

// --- update-chart ---

export const updateChartSchema = z.object({
  id: z.string().describe("Chart UUID to update"),
  operations: z.array(z.record(z.string(), z.any())).describe("JSON Patch operations array (e.g. [{op:'add', path:'/description', value:'...'}])"),
});

export async function updateChart(params: z.infer<typeof updateChartSchema>) {
  assertWriteAllowed();
  return omClient.patch(`/charts/${params.id}`, params.operations);
}

// --- delete-chart ---

export const deleteChartSchema = z.object({
  id: z.string().describe("Chart UUID to delete"),
  hardDelete: z.boolean().optional().default(false).describe("Hard delete (permanent) vs soft delete"),
  recursive: z.boolean().optional().default(false).describe("Recursively delete children"),
});

export async function deleteChart(params: z.infer<typeof deleteChartSchema>) {
  assertWriteAllowed();
  return omClient.delete(`/charts/${params.id}`, {
    hardDelete: params.hardDelete,
    recursive: params.recursive,
  });
}
