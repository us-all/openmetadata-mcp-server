import { z } from "zod/v4";
import { omClient } from "../client.js";
import { assertWriteAllowed } from "./utils.js";

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
  return omClient.get(`/tables/name/${encodeURIComponent(params.fqn)}/sampleData`);
}

// --- add-table-sample-data ---

export const addTableSampleDataSchema = z.object({
  id: z.string().describe("Table UUID"),
  columns: z.array(z.string()).describe("Column names in row-order (e.g. ['id','name'])"),
  rows: z.array(z.array(z.any())).describe("Row values aligned to columns (e.g. [[1,'foo'],[2,'bar']])"),
});

export async function addTableSampleData(params: z.infer<typeof addTableSampleDataSchema>) {
  assertWriteAllowed();
  const { id, ...body } = params;
  return omClient.put(`/tables/${id}/sampleData`, body);
}

// --- delete-table-sample-data ---

export const deleteTableSampleDataSchema = z.object({
  id: z.string().describe("Table UUID"),
});

export async function deleteTableSampleData(params: z.infer<typeof deleteTableSampleDataSchema>) {
  assertWriteAllowed();
  return omClient.delete(`/tables/${params.id}/sampleData`);
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
  return omClient.get(`/topics/name/${encodeURIComponent(params.fqn)}/sampleData`);
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
  return omClient.get(`/containers/name/${encodeURIComponent(params.fqn)}/sampleData`);
}
