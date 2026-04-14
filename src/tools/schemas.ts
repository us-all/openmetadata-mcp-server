import { z } from "zod/v4";
import { omClient } from "../client.js";
import { assertWriteAllowed } from "./utils.js";

export const listSchemasSchema = z.object({
  fields: z.string().optional().describe("Comma-separated fields to include"),
  limit: z.coerce.number().optional().default(10),
  before: z.string().optional(),
  after: z.string().optional(),
  database: z.string().optional().describe("Filter by database FQN"),
  include: z.enum(["non-deleted", "deleted", "all"]).optional().default("non-deleted"),
});

export async function listSchemas(params: z.infer<typeof listSchemasSchema>) {
  return omClient.get("/databaseSchemas", params);
}

export const getSchemaSchema = z.object({
  id: z.string().describe("Database schema UUID"),
  fields: z.string().optional(),
  include: z.enum(["non-deleted", "deleted", "all"]).optional(),
});

export async function getSchema(params: z.infer<typeof getSchemaSchema>) {
  const { id, ...query } = params;
  return omClient.get(`/databaseSchemas/${id}`, query);
}

export const getSchemaByNameSchema = z.object({
  fqn: z.string().describe("Fully qualified name (e.g. 'service.database.schema')"),
  fields: z.string().optional(),
  include: z.enum(["non-deleted", "deleted", "all"]).optional(),
});

export async function getSchemaByName(params: z.infer<typeof getSchemaByNameSchema>) {
  const { fqn, ...query } = params;
  return omClient.get(`/databaseSchemas/name/${encodeURIComponent(fqn)}`, query);
}

export const createSchemaSchema = z.object({
  name: z.string().describe("Schema name"),
  database: z.string().describe("FQN of parent database"),
  description: z.string().optional(),
  owners: z.array(z.record(z.string(), z.any())).optional(),
  tags: z.array(z.record(z.string(), z.any())).optional(),
});

export async function createSchema(params: z.infer<typeof createSchemaSchema>) {
  assertWriteAllowed();
  return omClient.post("/databaseSchemas", params);
}

export const updateSchemaSchema = z.object({
  id: z.string().describe("Database schema UUID"),
  operations: z.array(z.record(z.string(), z.any())).describe("JSON Patch operations"),
});

export async function updateSchema(params: z.infer<typeof updateSchemaSchema>) {
  assertWriteAllowed();
  return omClient.patch(`/databaseSchemas/${params.id}`, params.operations);
}

export const deleteSchemaSchema = z.object({
  id: z.string().describe("Database schema UUID"),
  hardDelete: z.boolean().optional().default(false),
  recursive: z.boolean().optional().default(false),
});

export async function deleteSchema(params: z.infer<typeof deleteSchemaSchema>) {
  assertWriteAllowed();
  return omClient.delete(`/databaseSchemas/${params.id}`, {
    hardDelete: params.hardDelete,
    recursive: params.recursive,
  });
}
