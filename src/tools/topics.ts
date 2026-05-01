import { z } from "zod/v4";
import { omClient } from "../client.js";
import { assertWriteAllowed } from "./utils.js";
import { extractFieldsDescription } from "./extract-fields.js";

const ef = z.string().optional().describe(extractFieldsDescription);

// --- list-topics ---

export const listTopicsSchema = z.object({
  fields: z.string().optional().describe("Comma-separated fields to include (e.g. 'owners,tags,followers')"),
  limit: z.coerce.number().optional().default(10).describe("Number of results per page"),
  before: z.string().optional().describe("Cursor for backward pagination"),
  after: z.string().optional().describe("Cursor for forward pagination"),
  service: z.string().optional().describe("Filter by service FQN"),
  include: z.enum(["non-deleted", "deleted", "all"]).optional().default("non-deleted").describe("Include deleted entities"),
  extractFields: ef,
});

export async function listTopics(params: z.infer<typeof listTopicsSchema>) {
  return omClient.get("/topics", params);
}

// --- get-topic ---

export const getTopicSchema = z.object({
  id: z.string().describe("Topic UUID"),
  fields: z.string().optional().describe("Comma-separated fields to include"),
  include: z.enum(["non-deleted", "deleted", "all"]).optional(),
  extractFields: ef,
});

export async function getTopic(params: z.infer<typeof getTopicSchema>) {
  const { id, ...query } = params;
  return omClient.get(`/topics/${id}`, query);
}

// --- get-topic-by-name ---

export const getTopicByNameSchema = z.object({
  fqn: z.string().describe("Fully qualified name (e.g. 'service.topicName')"),
  fields: z.string().optional().describe("Comma-separated fields to include"),
  include: z.enum(["non-deleted", "deleted", "all"]).optional(),
  extractFields: ef,
});

export async function getTopicByName(params: z.infer<typeof getTopicByNameSchema>) {
  const { fqn, ...query } = params;
  return omClient.get(`/topics/name/${encodeURIComponent(fqn)}`, query);
}

// --- create-topic ---

export const createTopicSchema = z.object({
  name: z.string().describe("Topic name"),
  service: z.string().describe("FQN of the messaging service"),
  description: z.string().optional().describe("Topic description in markdown"),
  partitions: z.coerce.number().optional().describe("Number of partitions"),
  replicationFactor: z.coerce.number().optional().describe("Replication factor"),
  messageSchema: z.record(z.string(), z.any()).optional().describe("Message schema definition"),
  tags: z.array(z.record(z.string(), z.any())).optional().describe("Tags to apply"),
  owners: z.array(z.record(z.string(), z.any())).optional().describe("Owner references"),
});

export async function createTopic(params: z.infer<typeof createTopicSchema>) {
  assertWriteAllowed();
  return omClient.post("/topics", params);
}

// --- update-topic ---

export const updateTopicSchema = z.object({
  id: z.string().describe("Topic UUID to update"),
  operations: z.array(z.record(z.string(), z.any())).describe("JSON Patch operations array (e.g. [{op:'add', path:'/description', value:'...'}])"),
});

export async function updateTopic(params: z.infer<typeof updateTopicSchema>) {
  assertWriteAllowed();
  return omClient.patch(`/topics/${params.id}`, params.operations);
}

// --- delete-topic ---

export const deleteTopicSchema = z.object({
  id: z.string().describe("Topic UUID to delete"),
  hardDelete: z.boolean().optional().default(false).describe("Hard delete (permanent) vs soft delete"),
  recursive: z.boolean().optional().default(false).describe("Recursively delete children"),
});

export async function deleteTopic(params: z.infer<typeof deleteTopicSchema>) {
  assertWriteAllowed();
  return omClient.delete(`/topics/${params.id}`, {
    hardDelete: params.hardDelete,
    recursive: params.recursive,
  });
}
