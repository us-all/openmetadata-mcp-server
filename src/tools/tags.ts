import { z } from "zod/v4";
import { omClient } from "../client.js";
import { assertWriteAllowed } from "./utils.js";

// ========== Classifications ==========

// --- list-classifications ---

export const listClassificationsSchema = z.object({
  fields: z.string().optional().describe("Comma-separated fields to include"),
  limit: z.coerce.number().optional().default(10).describe("Number of results per page"),
  before: z.string().optional().describe("Cursor for backward pagination"),
  after: z.string().optional().describe("Cursor for forward pagination"),
  include: z.enum(["non-deleted", "deleted", "all"]).optional().default("non-deleted").describe("Include deleted entities"),
});

export async function listClassifications(params: z.infer<typeof listClassificationsSchema>) {
  return omClient.get("/classifications", params);
}

// --- get-classification ---

export const getClassificationSchema = z.object({
  name: z.string().describe("Classification name"),
  fields: z.string().optional().describe("Comma-separated fields to include"),
  include: z.enum(["non-deleted", "deleted", "all"]).optional(),
});

export async function getClassification(params: z.infer<typeof getClassificationSchema>) {
  const { name, ...query } = params;
  return omClient.get(`/classifications/name/${encodeURIComponent(name)}`, query);
}

// --- create-classification ---

export const createClassificationSchema = z.object({
  name: z.string().describe("Classification name"),
  description: z.string().describe("Classification description in markdown"),
  mutuallyExclusive: z.boolean().optional().default(false).describe("Whether tags in this classification are mutually exclusive"),
});

export async function createClassification(params: z.infer<typeof createClassificationSchema>) {
  assertWriteAllowed();
  return omClient.post("/classifications", params);
}

// --- delete-classification ---

export const deleteClassificationSchema = z.object({
  id: z.string().describe("Classification UUID to delete"),
  hardDelete: z.boolean().optional().default(false).describe("Hard delete (permanent) vs soft delete"),
  recursive: z.boolean().optional().default(false).describe("Recursively delete children"),
});

export async function deleteClassification(params: z.infer<typeof deleteClassificationSchema>) {
  assertWriteAllowed();
  return omClient.delete(`/classifications/${params.id}`, {
    hardDelete: params.hardDelete,
    recursive: params.recursive,
  });
}

// ========== Tags ==========

// --- list-tags ---

export const listTagsSchema = z.object({
  fields: z.string().optional().describe("Comma-separated fields to include"),
  limit: z.coerce.number().optional().default(10).describe("Number of results per page"),
  before: z.string().optional().describe("Cursor for backward pagination"),
  after: z.string().optional().describe("Cursor for forward pagination"),
  parent: z.string().optional().describe("Filter by parent tag FQN"),
  include: z.enum(["non-deleted", "deleted", "all"]).optional().default("non-deleted").describe("Include deleted entities"),
});

export async function listTags(params: z.infer<typeof listTagsSchema>) {
  return omClient.get("/tags", params);
}

// --- get-tag ---

export const getTagSchema = z.object({
  id: z.string().describe("Tag UUID"),
  fields: z.string().optional().describe("Comma-separated fields to include"),
  include: z.enum(["non-deleted", "deleted", "all"]).optional(),
});

export async function getTag(params: z.infer<typeof getTagSchema>) {
  const { id, ...query } = params;
  return omClient.get(`/tags/${id}`, query);
}

// --- get-tag-by-name ---

export const getTagByNameSchema = z.object({
  fqn: z.string().describe("Fully qualified name (e.g. 'Classification.TagName')"),
  fields: z.string().optional().describe("Comma-separated fields to include"),
  include: z.enum(["non-deleted", "deleted", "all"]).optional(),
});

export async function getTagByName(params: z.infer<typeof getTagByNameSchema>) {
  const { fqn, ...query } = params;
  return omClient.get(`/tags/name/${encodeURIComponent(fqn)}`, query);
}

// --- create-tag ---

export const createTagSchema = z.object({
  classification: z.string().describe("FQN of the parent classification"),
  name: z.string().describe("Tag name"),
  description: z.string().describe("Tag description in markdown"),
  displayName: z.string().optional().describe("Display name"),
  style: z.record(z.string(), z.any()).optional().describe("Tag style (e.g. color)"),
});

export async function createTag(params: z.infer<typeof createTagSchema>) {
  assertWriteAllowed();
  return omClient.post("/tags", params);
}

// --- update-tag ---

export const updateTagSchema = z.object({
  id: z.string().describe("Tag UUID to update"),
  operations: z.array(z.record(z.string(), z.any())).describe("JSON Patch operations array (e.g. [{op:'add', path:'/description', value:'...'}])"),
});

export async function updateTag(params: z.infer<typeof updateTagSchema>) {
  assertWriteAllowed();
  return omClient.patch(`/tags/${params.id}`, params.operations);
}

// --- delete-tag ---

export const deleteTagSchema = z.object({
  id: z.string().describe("Tag UUID to delete"),
  hardDelete: z.boolean().optional().default(false).describe("Hard delete (permanent) vs soft delete"),
  recursive: z.boolean().optional().default(false).describe("Recursively delete children"),
});

export async function deleteTag(params: z.infer<typeof deleteTagSchema>) {
  assertWriteAllowed();
  return omClient.delete(`/tags/${params.id}`, {
    hardDelete: params.hardDelete,
    recursive: params.recursive,
  });
}
