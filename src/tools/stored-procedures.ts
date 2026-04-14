import { z } from "zod/v4";
import { omClient } from "../client.js";
import { assertWriteAllowed } from "./utils.js";

// --- list-stored-procedures ---

export const listStoredProceduresSchema = z.object({
  fields: z.string().optional().describe("Comma-separated fields to include (e.g. 'owners,tags')"),
  limit: z.coerce.number().optional().default(10).describe("Number of results per page"),
  before: z.string().optional().describe("Cursor for backward pagination"),
  after: z.string().optional().describe("Cursor for forward pagination"),
  databaseSchema: z.string().optional().describe("Filter by database schema FQN"),
  include: z.enum(["non-deleted", "deleted", "all"]).optional().default("non-deleted").describe("Include deleted entities"),
});

export async function listStoredProcedures(params: z.infer<typeof listStoredProceduresSchema>) {
  return omClient.get("/storedProcedures", params);
}

// --- get-stored-procedure ---

export const getStoredProcedureSchema = z.object({
  id: z.string().describe("Stored Procedure UUID"),
  fields: z.string().optional().describe("Comma-separated fields to include"),
  include: z.enum(["non-deleted", "deleted", "all"]).optional(),
});

export async function getStoredProcedure(params: z.infer<typeof getStoredProcedureSchema>) {
  const { id, ...query } = params;
  return omClient.get(`/storedProcedures/${id}`, query);
}

// --- get-stored-procedure-by-name ---

export const getStoredProcedureByNameSchema = z.object({
  fqn: z.string().describe("Fully qualified name (e.g. 'service.database.schema.procedureName')"),
  fields: z.string().optional().describe("Comma-separated fields to include"),
  include: z.enum(["non-deleted", "deleted", "all"]).optional(),
});

export async function getStoredProcedureByName(params: z.infer<typeof getStoredProcedureByNameSchema>) {
  const { fqn, ...query } = params;
  return omClient.get(`/storedProcedures/name/${encodeURIComponent(fqn)}`, query);
}

// --- create-stored-procedure ---

export const createStoredProcedureSchema = z.object({
  name: z.string().describe("Stored Procedure name"),
  databaseSchema: z.string().describe("FQN of the parent database schema"),
  description: z.string().optional().describe("Stored Procedure description in markdown"),
  storedProcedureCode: z.record(z.string(), z.any()).optional().describe("Stored procedure code definition (e.g. {language:'SQL', code:'...'})"),
  tags: z.array(z.record(z.string(), z.any())).optional().describe("Tags to apply"),
  owners: z.array(z.record(z.string(), z.any())).optional().describe("Owner references"),
});

export async function createStoredProcedure(params: z.infer<typeof createStoredProcedureSchema>) {
  assertWriteAllowed();
  return omClient.post("/storedProcedures", params);
}

// --- update-stored-procedure ---

export const updateStoredProcedureSchema = z.object({
  id: z.string().describe("Stored Procedure UUID to update"),
  operations: z.array(z.record(z.string(), z.any())).describe("JSON Patch operations array (e.g. [{op:'add', path:'/description', value:'...'}])"),
});

export async function updateStoredProcedure(params: z.infer<typeof updateStoredProcedureSchema>) {
  assertWriteAllowed();
  return omClient.patch(`/storedProcedures/${params.id}`, params.operations);
}

// --- delete-stored-procedure ---

export const deleteStoredProcedureSchema = z.object({
  id: z.string().describe("Stored Procedure UUID to delete"),
  hardDelete: z.boolean().optional().default(false).describe("Hard delete (permanent) vs soft delete"),
  recursive: z.boolean().optional().default(false).describe("Recursively delete children"),
});

export async function deleteStoredProcedure(params: z.infer<typeof deleteStoredProcedureSchema>) {
  assertWriteAllowed();
  return omClient.delete(`/storedProcedures/${params.id}`, {
    hardDelete: params.hardDelete,
    recursive: params.recursive,
  });
}
