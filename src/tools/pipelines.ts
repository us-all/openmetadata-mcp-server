import { z } from "zod/v4";
import { omClient } from "../client.js";
import { assertWriteAllowed } from "./utils.js";

// --- list-pipelines ---

export const listPipelinesSchema = z.object({
  fields: z.string().optional().describe("Comma-separated fields to include (e.g. 'owners,tags,followers,tasks')"),
  limit: z.coerce.number().optional().default(10).describe("Number of results per page"),
  before: z.string().optional().describe("Cursor for backward pagination"),
  after: z.string().optional().describe("Cursor for forward pagination"),
  service: z.string().optional().describe("Filter by service FQN"),
  include: z.enum(["non-deleted", "deleted", "all"]).optional().default("non-deleted").describe("Include deleted entities"),
});

export async function listPipelines(params: z.infer<typeof listPipelinesSchema>) {
  return omClient.get("/pipelines", params);
}

// --- get-pipeline ---

export const getPipelineSchema = z.object({
  id: z.string().describe("Pipeline UUID"),
  fields: z.string().optional().describe("Comma-separated fields to include"),
  include: z.enum(["non-deleted", "deleted", "all"]).optional(),
});

export async function getPipeline(params: z.infer<typeof getPipelineSchema>) {
  const { id, ...query } = params;
  return omClient.get(`/pipelines/${id}`, query);
}

// --- get-pipeline-by-name ---

export const getPipelineByNameSchema = z.object({
  fqn: z.string().describe("Fully qualified name (e.g. 'service.pipelineName')"),
  fields: z.string().optional().describe("Comma-separated fields to include"),
  include: z.enum(["non-deleted", "deleted", "all"]).optional(),
});

export async function getPipelineByName(params: z.infer<typeof getPipelineByNameSchema>) {
  const { fqn, ...query } = params;
  return omClient.get(`/pipelines/name/${encodeURIComponent(fqn)}`, query);
}

// --- create-pipeline ---

export const createPipelineSchema = z.object({
  name: z.string().describe("Pipeline name"),
  service: z.string().describe("FQN of the pipeline service"),
  description: z.string().optional().describe("Pipeline description in markdown"),
  displayName: z.string().optional().describe("Display name"),
  sourceUrl: z.string().optional().describe("Source URL of the pipeline"),
  tasks: z.array(z.record(z.string(), z.any())).optional().describe("Pipeline task definitions"),
  tags: z.array(z.record(z.string(), z.any())).optional().describe("Tags to apply"),
  owners: z.array(z.record(z.string(), z.any())).optional().describe("Owner references"),
});

export async function createPipeline(params: z.infer<typeof createPipelineSchema>) {
  assertWriteAllowed();
  return omClient.post("/pipelines", params);
}

// --- update-pipeline ---

export const updatePipelineSchema = z.object({
  id: z.string().describe("Pipeline UUID to update"),
  operations: z.array(z.record(z.string(), z.any())).describe("JSON Patch operations array (e.g. [{op:'add', path:'/description', value:'...'}])"),
});

export async function updatePipeline(params: z.infer<typeof updatePipelineSchema>) {
  assertWriteAllowed();
  return omClient.patch(`/pipelines/${params.id}`, params.operations);
}

// --- delete-pipeline ---

export const deletePipelineSchema = z.object({
  id: z.string().describe("Pipeline UUID to delete"),
  hardDelete: z.boolean().optional().default(false).describe("Hard delete (permanent) vs soft delete"),
  recursive: z.boolean().optional().default(false).describe("Recursively delete children"),
});

export async function deletePipeline(params: z.infer<typeof deletePipelineSchema>) {
  assertWriteAllowed();
  return omClient.delete(`/pipelines/${params.id}`, {
    hardDelete: params.hardDelete,
    recursive: params.recursive,
  });
}
