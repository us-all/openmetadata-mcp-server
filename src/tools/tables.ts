import { z } from "zod/v4";
import { omClient } from "../client.js";
import { assertWriteAllowed } from "./utils.js";
import { applyExtractFields, extractFieldsDescription } from "./extract-fields.js";

// --- list-tables ---

export const listTablesSchema = z.object({
  fields: z.string().optional().describe("Fields to include (e.g. 'columns,owners,tags,joins')"),
  limit: z.coerce.number().optional().default(10).describe("Number of results per page"),
  before: z.string().optional().describe("Cursor for backward pagination"),
  after: z.string().optional().describe("Cursor for forward pagination"),
  database: z.string().optional().describe("Filter by database FQN"),
  databaseSchema: z.string().optional().describe("Filter by database schema FQN"),
  include: z.enum(["non-deleted", "deleted", "all"]).optional().default("non-deleted").describe("Include deleted entities"),
  extractFields: z.string().optional().describe(extractFieldsDescription),
});

export async function listTables(params: z.infer<typeof listTablesSchema>) {
  const { extractFields, ...query } = params;
  const data = await omClient.get("/tables", query);
  return applyExtractFields(data, extractFields);
}

// --- get-table ---

export const getTableSchema = z.object({
  id: z.string().describe("Table UUID"),
  fields: z.string().optional().describe("OpenMetadata fields to include"),
  include: z.enum(["non-deleted", "deleted", "all"]).optional(),
  extractFields: z.string().optional().describe(extractFieldsDescription),
});

const GET_TABLE_DEFAULT_FIELDS = "id,name,fullyQualifiedName,description,columns,owners,tags,database";

export async function getTable(params: z.infer<typeof getTableSchema>) {
  const { id, extractFields, ...query } = params;
  const data = await omClient.get(`/tables/${id}`, query);
  return applyExtractFields(data, extractFields ?? GET_TABLE_DEFAULT_FIELDS);
}

// --- get-table-by-name ---

export const getTableByNameSchema = z.object({
  fqn: z.string().describe("FQN (e.g. 'service.db.schema.table')"),
  fields: z.string().optional().describe("OpenMetadata fields to include"),
  include: z.enum(["non-deleted", "deleted", "all"]).optional(),
  extractFields: z.string().optional().describe(extractFieldsDescription),
});

export async function getTableByName(params: z.infer<typeof getTableByNameSchema>) {
  const { fqn, extractFields, ...query } = params;
  const data = await omClient.get(`/tables/name/${encodeURIComponent(fqn)}`, query);
  return applyExtractFields(data, extractFields ?? GET_TABLE_DEFAULT_FIELDS);
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
  operations: z.array(z.record(z.string(), z.any())).describe("JSON Patch operations"),
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
