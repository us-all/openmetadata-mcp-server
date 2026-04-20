import { z } from "zod/v4";
import { omClient } from "../client.js";

// --- get-table-sample-data ---

export const getTableSampleDataSchema = z.object({
  id: z.string().describe("Table UUID"),
});

export async function getTableSampleData(params: z.infer<typeof getTableSampleDataSchema>) {
  return omClient.get(`/tables/${params.id}/sampleData`);
}

// --- get-table-sample-data-by-name ---

export const getTableSampleDataByNameSchema = z.object({
  fqn: z.string().describe("Fully qualified table name (e.g. 'service.database.schema.tableName')"),
});

export async function getTableSampleDataByName(params: z.infer<typeof getTableSampleDataByNameSchema>) {
  const entity = await omClient.get<{ id: string }>(`/tables/name/${encodeURIComponent(params.fqn)}`, { fields: "id" });
  return omClient.get(`/tables/${entity.id}/sampleData`);
}

// --- get-topic-sample-data ---

export const getTopicSampleDataSchema = z.object({
  id: z.string().describe("Topic UUID"),
});

export async function getTopicSampleData(params: z.infer<typeof getTopicSampleDataSchema>) {
  return omClient.get(`/topics/${params.id}/sampleData`);
}

// --- get-topic-sample-data-by-name ---

export const getTopicSampleDataByNameSchema = z.object({
  fqn: z.string().describe("Fully qualified topic name (e.g. 'service.topicName')"),
});

export async function getTopicSampleDataByName(params: z.infer<typeof getTopicSampleDataByNameSchema>) {
  const entity = await omClient.get<{ id: string }>(`/topics/name/${encodeURIComponent(params.fqn)}`, { fields: "id" });
  return omClient.get(`/topics/${entity.id}/sampleData`);
}

// --- get-container-sample-data ---

export const getContainerSampleDataSchema = z.object({
  id: z.string().describe("Container UUID"),
});

export async function getContainerSampleData(params: z.infer<typeof getContainerSampleDataSchema>) {
  return omClient.get(`/containers/${params.id}/sampleData`);
}

// --- get-container-sample-data-by-name ---

export const getContainerSampleDataByNameSchema = z.object({
  fqn: z.string().describe("Fully qualified container name"),
});

export async function getContainerSampleDataByName(params: z.infer<typeof getContainerSampleDataByNameSchema>) {
  const entity = await omClient.get<{ id: string }>(`/containers/name/${encodeURIComponent(params.fqn)}`, { fields: "id" });
  return omClient.get(`/containers/${entity.id}/sampleData`);
}
