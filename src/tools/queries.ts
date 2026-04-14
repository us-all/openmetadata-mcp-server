import { z } from "zod/v4";
import { omClient } from "../client.js";
import { assertWriteAllowed } from "./utils.js";

// --- list-queries ---

export const listQueriesSchema = z.object({
  fields: z.string().optional().describe("Comma-separated fields to include"),
  limit: z.coerce.number().optional().default(10).describe("Number of results per page"),
  before: z.string().optional().describe("Cursor for backward pagination"),
  after: z.string().optional().describe("Cursor for forward pagination"),
  entityId: z.string().optional().describe("Filter by entity UUID (e.g. table ID)"),
  include: z.enum(["non-deleted", "deleted", "all"]).optional().default("non-deleted").describe("Include deleted entities"),
});

export async function listQueries(params: z.infer<typeof listQueriesSchema>) {
  return omClient.get("/queries", params);
}

// --- get-query ---

export const getQuerySchema = z.object({
  id: z.string().describe("Query UUID"),
  fields: z.string().optional().describe("Comma-separated fields to include"),
  include: z.enum(["non-deleted", "deleted", "all"]).optional(),
});

export async function getQuery(params: z.infer<typeof getQuerySchema>) {
  const { id, ...query } = params;
  return omClient.get(`/queries/${id}`, query);
}

// --- create-query ---

export const createQuerySchema = z.object({
  query: z.string().describe("SQL query string"),
  description: z.string().optional().describe("Query description in markdown"),
  name: z.string().optional().describe("Query name"),
  queryUsedIn: z.array(z.record(z.string(), z.any())).optional().describe("Entity references where this query is used"),
  tags: z.array(z.record(z.string(), z.any())).optional().describe("Tags to apply"),
  owners: z.array(z.record(z.string(), z.any())).optional().describe("Owner references"),
});

export async function createQuery(params: z.infer<typeof createQuerySchema>) {
  assertWriteAllowed();
  return omClient.post("/queries", params);
}

// --- update-query ---

export const updateQuerySchema = z.object({
  id: z.string().describe("Query UUID to update"),
  operations: z.array(z.record(z.string(), z.any())).describe("JSON Patch operations array (e.g. [{op:'add', path:'/description', value:'...'}])"),
});

export async function updateQuery(params: z.infer<typeof updateQuerySchema>) {
  assertWriteAllowed();
  return omClient.patch(`/queries/${params.id}`, params.operations);
}

// --- delete-query ---

export const deleteQuerySchema = z.object({
  id: z.string().describe("Query UUID to delete"),
  hardDelete: z.boolean().optional().default(false).describe("Hard delete (permanent) vs soft delete"),
});

export async function deleteQuery(params: z.infer<typeof deleteQuerySchema>) {
  assertWriteAllowed();
  return omClient.delete(`/queries/${params.id}`, {
    hardDelete: params.hardDelete,
  });
}
