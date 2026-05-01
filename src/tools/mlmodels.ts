import { z } from "zod/v4";
import { omClient } from "../client.js";
import { assertWriteAllowed } from "./utils.js";
import { extractFieldsDescription } from "./extract-fields.js";

const ef = z.string().optional().describe(extractFieldsDescription);

// --- list-ml-models ---

export const listMlModelsSchema = z.object({
  fields: z.string().optional().describe("Comma-separated fields to include (e.g. 'owners,tags,followers')"),
  limit: z.coerce.number().optional().default(10).describe("Number of results per page"),
  before: z.string().optional().describe("Cursor for backward pagination"),
  after: z.string().optional().describe("Cursor for forward pagination"),
  service: z.string().optional().describe("Filter by service FQN"),
  include: z.enum(["non-deleted", "deleted", "all"]).optional().default("non-deleted").describe("Include deleted entities"),
  extractFields: ef,
});

export async function listMlModels(params: z.infer<typeof listMlModelsSchema>) {
  return omClient.get("/mlmodels", params);
}

// --- get-ml-model ---

export const getMlModelSchema = z.object({
  id: z.string().describe("ML Model UUID"),
  fields: z.string().optional().describe("Comma-separated fields to include"),
  include: z.enum(["non-deleted", "deleted", "all"]).optional(),
  extractFields: ef,
});

export async function getMlModel(params: z.infer<typeof getMlModelSchema>) {
  const { id, ...query } = params;
  return omClient.get(`/mlmodels/${id}`, query);
}

// --- get-ml-model-by-name ---

export const getMlModelByNameSchema = z.object({
  fqn: z.string().describe("Fully qualified name (e.g. 'service.mlModelName')"),
  fields: z.string().optional().describe("Comma-separated fields to include"),
  include: z.enum(["non-deleted", "deleted", "all"]).optional(),
  extractFields: ef,
});

export async function getMlModelByName(params: z.infer<typeof getMlModelByNameSchema>) {
  const { fqn, ...query } = params;
  return omClient.get(`/mlmodels/name/${encodeURIComponent(fqn)}`, query);
}

// --- create-ml-model ---

export const createMlModelSchema = z.object({
  name: z.string().describe("ML Model name"),
  service: z.string().describe("FQN of the ML model service"),
  algorithm: z.string().describe("Algorithm used by the ML model"),
  description: z.string().optional().describe("ML Model description in markdown"),
  displayName: z.string().optional().describe("Display name"),
  mlFeatures: z.array(z.record(z.string(), z.any())).optional().describe("ML features definitions"),
  target: z.string().optional().describe("Target column or value"),
  tags: z.array(z.record(z.string(), z.any())).optional().describe("Tags to apply"),
  owners: z.array(z.record(z.string(), z.any())).optional().describe("Owner references"),
});

export async function createMlModel(params: z.infer<typeof createMlModelSchema>) {
  assertWriteAllowed();
  return omClient.post("/mlmodels", params);
}

// --- update-ml-model ---

export const updateMlModelSchema = z.object({
  id: z.string().describe("ML Model UUID to update"),
  operations: z.array(z.record(z.string(), z.any())).describe("JSON Patch operations array (e.g. [{op:'add', path:'/description', value:'...'}])"),
});

export async function updateMlModel(params: z.infer<typeof updateMlModelSchema>) {
  assertWriteAllowed();
  return omClient.patch(`/mlmodels/${params.id}`, params.operations);
}

// --- delete-ml-model ---

export const deleteMlModelSchema = z.object({
  id: z.string().describe("ML Model UUID to delete"),
  hardDelete: z.boolean().optional().default(false).describe("Hard delete (permanent) vs soft delete"),
  recursive: z.boolean().optional().default(false).describe("Recursively delete children"),
});

export async function deleteMlModel(params: z.infer<typeof deleteMlModelSchema>) {
  assertWriteAllowed();
  return omClient.delete(`/mlmodels/${params.id}`, {
    hardDelete: params.hardDelete,
    recursive: params.recursive,
  });
}
