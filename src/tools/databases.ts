import { z } from "zod/v4";
import { omClient } from "../client.js";
import { assertWriteAllowed } from "./utils.js";

export const listDatabasesSchema = z.object({
  fields: z.string().optional().describe("Comma-separated fields to include (e.g. 'owners,tags,domain')"),
  limit: z.coerce.number().optional().default(10),
  before: z.string().optional(),
  after: z.string().optional(),
  service: z.string().optional().describe("Filter by database service FQN"),
  include: z.enum(["non-deleted", "deleted", "all"]).optional().default("non-deleted"),
});

export async function listDatabases(params: z.infer<typeof listDatabasesSchema>) {
  return omClient.get("/databases", params);
}

export const getDatabaseSchema = z.object({
  id: z.string().describe("Database UUID"),
  fields: z.string().optional(),
  include: z.enum(["non-deleted", "deleted", "all"]).optional(),
});

export async function getDatabase(params: z.infer<typeof getDatabaseSchema>) {
  const { id, ...query } = params;
  return omClient.get(`/databases/${id}`, query);
}

export const getDatabaseByNameSchema = z.object({
  fqn: z.string().describe("Fully qualified name (e.g. 'service.database')"),
  fields: z.string().optional(),
  include: z.enum(["non-deleted", "deleted", "all"]).optional(),
});

export async function getDatabaseByName(params: z.infer<typeof getDatabaseByNameSchema>) {
  const { fqn, ...query } = params;
  return omClient.get(`/databases/name/${encodeURIComponent(fqn)}`, query);
}

export const createDatabaseSchema = z.object({
  name: z.string().describe("Database name"),
  service: z.string().describe("FQN of parent database service"),
  description: z.string().optional(),
  owners: z.array(z.record(z.string(), z.any())).optional(),
  tags: z.array(z.record(z.string(), z.any())).optional(),
});

export async function createDatabase(params: z.infer<typeof createDatabaseSchema>) {
  assertWriteAllowed();
  return omClient.post("/databases", params);
}

export const updateDatabaseSchema = z.object({
  id: z.string().describe("Database UUID"),
  operations: z.array(z.record(z.string(), z.any())).describe("JSON Patch operations"),
});

export async function updateDatabase(params: z.infer<typeof updateDatabaseSchema>) {
  assertWriteAllowed();
  return omClient.patch(`/databases/${params.id}`, params.operations);
}

export const deleteDatabaseSchema = z.object({
  id: z.string().describe("Database UUID"),
  hardDelete: z.boolean().optional().default(false),
  recursive: z.boolean().optional().default(false),
});

export async function deleteDatabase(params: z.infer<typeof deleteDatabaseSchema>) {
  assertWriteAllowed();
  return omClient.delete(`/databases/${params.id}`, {
    hardDelete: params.hardDelete,
    recursive: params.recursive,
  });
}
