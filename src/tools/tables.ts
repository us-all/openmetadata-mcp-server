import { z } from "zod/v4";
import { omClient } from "../client.js";
import { assertWriteAllowed } from "./utils.js";

// --- list-tables ---

export const listTablesSchema = z.object({
  fields: z.string().optional().describe("Comma-separated fields to include (e.g. 'columns,owners,tags,followers,joins,tableConstraints')"),
  limit: z.coerce.number().optional().default(10).describe("Number of results per page"),
  before: z.string().optional().describe("Cursor for backward pagination"),
  after: z.string().optional().describe("Cursor for forward pagination"),
  database: z.string().optional().describe("Filter by database FQN"),
  databaseSchema: z.string().optional().describe("Filter by database schema FQN"),
  include: z.enum(["non-deleted", "deleted", "all"]).optional().default("non-deleted").describe("Include deleted entities"),
});

export async function listTables(params: z.infer<typeof listTablesSchema>) {
  return omClient.get("/tables", params);
}

// --- get-table ---

export const getTableSchema = z.object({
  id: z.string().describe("Table UUID"),
  fields: z.string().optional().describe("Comma-separated fields to include"),
  include: z.enum(["non-deleted", "deleted", "all"]).optional(),
});

export async function getTable(params: z.infer<typeof getTableSchema>) {
  const { id, ...query } = params;
  return omClient.get(`/tables/${id}`, query);
}

// --- get-table-by-name ---

export const getTableByNameSchema = z.object({
  fqn: z.string().describe("Fully qualified name (e.g. 'service.database.schema.tableName')"),
  fields: z.string().optional().describe("Comma-separated fields to include"),
  include: z.enum(["non-deleted", "deleted", "all"]).optional(),
});

export async function getTableByName(params: z.infer<typeof getTableByNameSchema>) {
  const { fqn, ...query } = params;
  return omClient.get(`/tables/name/${encodeURIComponent(fqn)}`, query);
}

// --- create-table ---

export const createTableSchema = z.object({
  name: z.string().describe("Table name"),
  databaseSchema: z.string().describe("FQN of parent database schema"),
  columns: z.array(z.record(z.string(), z.any())).describe("Column definitions array"),
  tableType: z.enum(["Regular", "External", "View", "SecureView", "MaterializedView", "Iceberg", "Local", "Partitioned", "Foreign", "Transient"]).optional(),
  description: z.string().optional().describe("Table description in markdown"),
  tags: z.array(z.record(z.string(), z.any())).optional().describe("Tags to apply"),
  owners: z.array(z.record(z.string(), z.any())).optional().describe("Owner references"),
});

export async function createTable(params: z.infer<typeof createTableSchema>) {
  assertWriteAllowed();
  return omClient.post("/tables", params);
}

// --- update-table ---

export const updateTableSchema = z.object({
  id: z.string().describe("Table UUID to update"),
  operations: z.array(z.record(z.string(), z.any())).describe("JSON Patch operations array (e.g. [{op:'add', path:'/description', value:'...'}])"),
});

export async function updateTable(params: z.infer<typeof updateTableSchema>) {
  assertWriteAllowed();
  return omClient.patch(`/tables/${params.id}`, params.operations);
}

// --- delete-table ---

export const deleteTableSchema = z.object({
  id: z.string().describe("Table UUID to delete"),
  hardDelete: z.boolean().optional().default(false).describe("Hard delete (permanent) vs soft delete"),
  recursive: z.boolean().optional().default(false).describe("Recursively delete children"),
});

export async function deleteTable(params: z.infer<typeof deleteTableSchema>) {
  assertWriteAllowed();
  return omClient.delete(`/tables/${params.id}`, {
    hardDelete: params.hardDelete,
    recursive: params.recursive,
  });
}
