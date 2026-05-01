import { z } from "zod/v4";
import { omClient } from "../client.js";
import { assertWriteAllowed } from "./utils.js";
import { extractFieldsDescription } from "./extract-fields.js";

const ef = z.string().optional().describe(extractFieldsDescription);

// --- list-containers ---

export const listContainersSchema = z.object({
  fields: z.string().optional().describe("Comma-separated fields to include (e.g. 'owners,tags,followers')"),
  limit: z.coerce.number().optional().default(10).describe("Number of results per page"),
  before: z.string().optional().describe("Cursor for backward pagination"),
  after: z.string().optional().describe("Cursor for forward pagination"),
  service: z.string().optional().describe("Filter by service FQN"),
  include: z.enum(["non-deleted", "deleted", "all"]).optional().default("non-deleted").describe("Include deleted entities"),
  extractFields: ef,
});

export async function listContainers(params: z.infer<typeof listContainersSchema>) {
  return omClient.get("/containers", params);
}

// --- get-container ---

export const getContainerSchema = z.object({
  id: z.string().describe("Container UUID"),
  fields: z.string().optional().describe("Comma-separated fields to include"),
  include: z.enum(["non-deleted", "deleted", "all"]).optional(),
  extractFields: ef,
});

export async function getContainer(params: z.infer<typeof getContainerSchema>) {
  const { id, ...query } = params;
  return omClient.get(`/containers/${id}`, query);
}

// --- get-container-by-name ---

export const getContainerByNameSchema = z.object({
  fqn: z.string().describe("Fully qualified name (e.g. 'service.containerName')"),
  fields: z.string().optional().describe("Comma-separated fields to include"),
  include: z.enum(["non-deleted", "deleted", "all"]).optional(),
  extractFields: ef,
});

export async function getContainerByName(params: z.infer<typeof getContainerByNameSchema>) {
  const { fqn, ...query } = params;
  return omClient.get(`/containers/name/${encodeURIComponent(fqn)}`, query);
}

// --- create-container ---

export const createContainerSchema = z.object({
  name: z.string().describe("Container name"),
  service: z.string().describe("FQN of the storage service"),
  description: z.string().optional().describe("Container description in markdown"),
  displayName: z.string().optional().describe("Display name"),
  dataModel: z.record(z.string(), z.any()).optional().describe("Data model definition"),
  tags: z.array(z.record(z.string(), z.any())).optional().describe("Tags to apply"),
  owners: z.array(z.record(z.string(), z.any())).optional().describe("Owner references"),
});

export async function createContainer(params: z.infer<typeof createContainerSchema>) {
  assertWriteAllowed();
  return omClient.post("/containers", params);
}

// --- update-container ---

export const updateContainerSchema = z.object({
  id: z.string().describe("Container UUID to update"),
  operations: z.array(z.record(z.string(), z.any())).describe("JSON Patch operations array (e.g. [{op:'add', path:'/description', value:'...'}])"),
});

export async function updateContainer(params: z.infer<typeof updateContainerSchema>) {
  assertWriteAllowed();
  return omClient.patch(`/containers/${params.id}`, params.operations);
}

// --- delete-container ---

export const deleteContainerSchema = z.object({
  id: z.string().describe("Container UUID to delete"),
  hardDelete: z.boolean().optional().default(false).describe("Hard delete (permanent) vs soft delete"),
  recursive: z.boolean().optional().default(false).describe("Recursively delete children"),
});

export async function deleteContainer(params: z.infer<typeof deleteContainerSchema>) {
  assertWriteAllowed();
  return omClient.delete(`/containers/${params.id}`, {
    hardDelete: params.hardDelete,
    recursive: params.recursive,
  });
}
