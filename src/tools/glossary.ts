import { z } from "zod/v4";
import { omClient } from "../client.js";
import { assertWriteAllowed } from "./utils.js";

// --- Glossaries ---

export const listGlossariesSchema = z.object({
  fields: z.string().optional().describe("Comma-separated fields (e.g. 'owners,tags,reviewers,terms')"),
  limit: z.coerce.number().optional().default(10),
  before: z.string().optional(),
  after: z.string().optional(),
  include: z.enum(["non-deleted", "deleted", "all"]).optional().default("non-deleted"),
});

export async function listGlossaries(params: z.infer<typeof listGlossariesSchema>) {
  return omClient.get("/glossaries", params);
}

export const getGlossarySchema = z.object({
  id: z.string().describe("Glossary UUID"),
  fields: z.string().optional(),
});

export async function getGlossary(params: z.infer<typeof getGlossarySchema>) {
  const { id, ...query } = params;
  return omClient.get(`/glossaries/${id}`, query);
}

export const getGlossaryByNameSchema = z.object({
  fqn: z.string().describe("Glossary name"),
  fields: z.string().optional(),
});

export async function getGlossaryByName(params: z.infer<typeof getGlossaryByNameSchema>) {
  const { fqn, ...query } = params;
  return omClient.get(`/glossaries/name/${encodeURIComponent(fqn)}`, query);
}

export const createGlossarySchema = z.object({
  name: z.string().describe("Glossary name"),
  displayName: z.string().optional(),
  description: z.string().describe("Glossary description"),
  mutuallyExclusive: z.boolean().optional().default(false).describe("Whether terms are mutually exclusive"),
  owners: z.array(z.record(z.string(), z.any())).optional(),
  reviewers: z.array(z.record(z.string(), z.any())).optional(),
  tags: z.array(z.record(z.string(), z.any())).optional(),
});

export async function createGlossary(params: z.infer<typeof createGlossarySchema>) {
  assertWriteAllowed();
  return omClient.post("/glossaries", params);
}

export const updateGlossarySchema = z.object({
  id: z.string().describe("Glossary UUID"),
  operations: z.array(z.record(z.string(), z.any())).describe("JSON Patch operations"),
});

export async function updateGlossary(params: z.infer<typeof updateGlossarySchema>) {
  assertWriteAllowed();
  return omClient.patch(`/glossaries/${params.id}`, params.operations);
}

export const deleteGlossarySchema = z.object({
  id: z.string().describe("Glossary UUID"),
  hardDelete: z.boolean().optional().default(false),
  recursive: z.boolean().optional().default(false),
});

export async function deleteGlossary(params: z.infer<typeof deleteGlossarySchema>) {
  assertWriteAllowed();
  return omClient.delete(`/glossaries/${params.id}`, {
    hardDelete: params.hardDelete,
    recursive: params.recursive,
  });
}

// --- Glossary Terms ---

export const listGlossaryTermsSchema = z.object({
  fields: z.string().optional().describe("Comma-separated fields (e.g. 'owners,tags,relatedTerms,reviewers')"),
  limit: z.coerce.number().optional().default(10),
  before: z.string().optional(),
  after: z.string().optional(),
  glossary: z.string().optional().describe("Filter by glossary name"),
  parent: z.string().optional().describe("Filter by parent glossary term FQN"),
  include: z.enum(["non-deleted", "deleted", "all"]).optional().default("non-deleted"),
});

export async function listGlossaryTerms(params: z.infer<typeof listGlossaryTermsSchema>) {
  return omClient.get("/glossaryTerms", params);
}

export const getGlossaryTermSchema = z.object({
  id: z.string().describe("Glossary term UUID"),
  fields: z.string().optional(),
});

export async function getGlossaryTerm(params: z.infer<typeof getGlossaryTermSchema>) {
  const { id, ...query } = params;
  return omClient.get(`/glossaryTerms/${id}`, query);
}

export const getGlossaryTermByNameSchema = z.object({
  fqn: z.string().describe("Glossary term FQN (e.g. 'glossaryName.termName')"),
  fields: z.string().optional(),
});

export async function getGlossaryTermByName(params: z.infer<typeof getGlossaryTermByNameSchema>) {
  const { fqn, ...query } = params;
  return omClient.get(`/glossaryTerms/name/${encodeURIComponent(fqn)}`, query);
}

export const createGlossaryTermSchema = z.object({
  glossary: z.string().describe("FQN of parent glossary"),
  name: z.string().describe("Term name"),
  displayName: z.string().optional(),
  description: z.string().describe("Term definition"),
  synonyms: z.array(z.string()).optional().describe("List of synonyms"),
  parent: z.string().optional().describe("FQN of parent term for hierarchy"),
  owners: z.array(z.record(z.string(), z.any())).optional(),
  reviewers: z.array(z.record(z.string(), z.any())).optional(),
  tags: z.array(z.record(z.string(), z.any())).optional(),
});

export async function createGlossaryTerm(params: z.infer<typeof createGlossaryTermSchema>) {
  assertWriteAllowed();
  return omClient.post("/glossaryTerms", params);
}

export const updateGlossaryTermSchema = z.object({
  id: z.string().describe("Glossary term UUID"),
  operations: z.array(z.record(z.string(), z.any())).describe("JSON Patch operations"),
});

export async function updateGlossaryTerm(params: z.infer<typeof updateGlossaryTermSchema>) {
  assertWriteAllowed();
  return omClient.patch(`/glossaryTerms/${params.id}`, params.operations);
}

export const deleteGlossaryTermSchema = z.object({
  id: z.string().describe("Glossary term UUID"),
  hardDelete: z.boolean().optional().default(false),
  recursive: z.boolean().optional().default(false),
});

export async function deleteGlossaryTerm(params: z.infer<typeof deleteGlossaryTermSchema>) {
  assertWriteAllowed();
  return omClient.delete(`/glossaryTerms/${params.id}`, {
    hardDelete: params.hardDelete,
    recursive: params.recursive,
  });
}
