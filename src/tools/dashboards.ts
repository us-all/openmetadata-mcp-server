import { z } from "zod/v4";
import { omClient } from "../client.js";
import { assertWriteAllowed } from "./utils.js";
import { extractFieldsDescription } from "./extract-fields.js";

// --- list-dashboards ---

export const listDashboardsSchema = z.object({
  fields: z.string().optional().describe("Comma-separated fields to include (e.g. 'owners,tags,followers,charts')"),
  limit: z.coerce.number().optional().default(10).describe("Number of results per page"),
  before: z.string().optional().describe("Cursor for backward pagination"),
  after: z.string().optional().describe("Cursor for forward pagination"),
  service: z.string().optional().describe("Filter by service FQN"),
  include: z.enum(["non-deleted", "deleted", "all"]).optional().default("non-deleted").describe("Include deleted entities"),
  extractFields: z.string().optional().describe(extractFieldsDescription),
});

export async function listDashboards(params: z.infer<typeof listDashboardsSchema>) {
  return omClient.get("/dashboards", params);
}

// --- get-dashboard ---

export const getDashboardSchema = z.object({
  id: z.string().describe("Dashboard UUID"),
  fields: z.string().optional().describe("Comma-separated fields to include"),
  include: z.enum(["non-deleted", "deleted", "all"]).optional(),
  extractFields: z.string().optional().describe(extractFieldsDescription),
});

export async function getDashboard(params: z.infer<typeof getDashboardSchema>) {
  const { id, ...query } = params;
  return omClient.get(`/dashboards/${id}`, query);
}

// --- get-dashboard-by-name ---

export const getDashboardByNameSchema = z.object({
  fqn: z.string().describe("Fully qualified name (e.g. 'service.dashboardName')"),
  fields: z.string().optional().describe("Comma-separated fields to include"),
  include: z.enum(["non-deleted", "deleted", "all"]).optional(),
  extractFields: z.string().optional().describe(extractFieldsDescription),
});

export async function getDashboardByName(params: z.infer<typeof getDashboardByNameSchema>) {
  const { fqn, ...query } = params;
  return omClient.get(`/dashboards/name/${encodeURIComponent(fqn)}`, query);
}

// --- create-dashboard ---

export const createDashboardSchema = z.object({
  name: z.string().describe("Dashboard name"),
  service: z.string().describe("FQN of the dashboard service"),
  description: z.string().optional().describe("Dashboard description in markdown"),
  displayName: z.string().optional().describe("Display name"),
  sourceUrl: z.string().optional().describe("Source URL of the dashboard"),
  tags: z.array(z.record(z.string(), z.any())).optional().describe("Tags to apply"),
  owners: z.array(z.record(z.string(), z.any())).optional().describe("Owner references"),
});

export async function createDashboard(params: z.infer<typeof createDashboardSchema>) {
  assertWriteAllowed();
  return omClient.post("/dashboards", params);
}

// --- update-dashboard ---

export const updateDashboardSchema = z.object({
  id: z.string().describe("Dashboard UUID to update"),
  operations: z.array(z.record(z.string(), z.any())).describe("JSON Patch operations array (e.g. [{op:'add', path:'/description', value:'...'}])"),
});

export async function updateDashboard(params: z.infer<typeof updateDashboardSchema>) {
  assertWriteAllowed();
  return omClient.patch(`/dashboards/${params.id}`, params.operations);
}

// --- delete-dashboard ---

export const deleteDashboardSchema = z.object({
  id: z.string().describe("Dashboard UUID to delete"),
  hardDelete: z.boolean().optional().default(false).describe("Hard delete (permanent) vs soft delete"),
  recursive: z.boolean().optional().default(false).describe("Recursively delete children"),
});

export async function deleteDashboard(params: z.infer<typeof deleteDashboardSchema>) {
  assertWriteAllowed();
  return omClient.delete(`/dashboards/${params.id}`, {
    hardDelete: params.hardDelete,
    recursive: params.recursive,
  });
}
