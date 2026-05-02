import { z } from "zod/v4";
import { omClient } from "../client.js";
import { applyExtractFields, extractFieldsDescription } from "./extract-fields.js";

const LIST_TEST_CASES_DEFAULT_FIELDS = "data.*.id,data.*.name,data.*.fullyQualifiedName,data.*.testSuite.fullyQualifiedName,data.*.testCaseStatus,data.*.testCaseResult,paging";

// --- list-test-suites ---

export const listTestSuitesSchema = z.object({
  fields: z.string().optional().describe("Comma-separated fields to include"),
  limit: z.coerce.number().optional().default(10).describe("Number of results per page"),
  before: z.string().optional().describe("Cursor for backward pagination"),
  after: z.string().optional().describe("Cursor for forward pagination"),
  include: z.enum(["non-deleted", "deleted", "all"]).optional().default("non-deleted").describe("Include deleted entities"),
});

export async function listTestSuites(params: z.infer<typeof listTestSuitesSchema>) {
  return omClient.get("/dataQuality/testSuites", params);
}

// --- get-test-suite ---

export const getTestSuiteSchema = z.object({
  id: z.string().describe("Test Suite UUID"),
  fields: z.string().optional().describe("Comma-separated fields to include"),
  include: z.enum(["non-deleted", "deleted", "all"]).optional(),
});

export async function getTestSuite(params: z.infer<typeof getTestSuiteSchema>) {
  const { id, ...query } = params;
  return omClient.get(`/dataQuality/testSuites/${id}`, query);
}

// --- get-test-suite-by-name ---

export const getTestSuiteByNameSchema = z.object({
  fqn: z.string().describe("Fully qualified name of the test suite"),
  fields: z.string().optional().describe("Comma-separated fields to include"),
  include: z.enum(["non-deleted", "deleted", "all"]).optional(),
});

export async function getTestSuiteByName(params: z.infer<typeof getTestSuiteByNameSchema>) {
  const { fqn, ...query } = params;
  return omClient.get(`/dataQuality/testSuites/name/${encodeURIComponent(fqn)}`, query);
}

// --- list-test-cases ---

export const listTestCasesSchema = z.object({
  fields: z.string().optional().describe("Comma-separated fields to include"),
  limit: z.coerce.number().optional().default(10).describe("Number of results per page"),
  before: z.string().optional().describe("Cursor for backward pagination"),
  after: z.string().optional().describe("Cursor for forward pagination"),
  entityLink: z.string().optional().describe("Filter by entity link (e.g. '<#E::table::service.db.schema.table>')"),
  testSuiteId: z.string().optional().describe("Filter by test suite UUID"),
  include: z.enum(["non-deleted", "deleted", "all"]).optional().default("non-deleted").describe("Include deleted entities"),
  extractFields: z.string().optional().describe(extractFieldsDescription),
});

export async function listTestCases(params: z.infer<typeof listTestCasesSchema>) {
  const { extractFields, ...query } = params;
  const data = await omClient.get("/dataQuality/testCases", query);
  return applyExtractFields(data, extractFields ?? LIST_TEST_CASES_DEFAULT_FIELDS);
}

// --- get-test-case ---

export const getTestCaseSchema = z.object({
  id: z.string().describe("Test Case UUID"),
  fields: z.string().optional().describe("Comma-separated fields to include"),
  include: z.enum(["non-deleted", "deleted", "all"]).optional(),
});

export async function getTestCase(params: z.infer<typeof getTestCaseSchema>) {
  const { id, ...query } = params;
  return omClient.get(`/dataQuality/testCases/${id}`, query);
}

// --- get-test-case-by-name ---

export const getTestCaseByNameSchema = z.object({
  fqn: z.string().describe("Fully qualified name of the test case"),
  fields: z.string().optional().describe("Comma-separated fields to include"),
  include: z.enum(["non-deleted", "deleted", "all"]).optional(),
});

export async function getTestCaseByName(params: z.infer<typeof getTestCaseByNameSchema>) {
  const { fqn, ...query } = params;
  return omClient.get(`/dataQuality/testCases/name/${encodeURIComponent(fqn)}`, query);
}

// --- list-test-case-results ---

export const listTestCaseResultsSchema = z.object({
  id: z.string().describe("Test Case UUID"),
  startTs: z.coerce.number().optional().describe("Start timestamp (epoch ms) for filtering results"),
  endTs: z.coerce.number().optional().describe("End timestamp (epoch ms) for filtering results"),
});

export async function listTestCaseResults(params: z.infer<typeof listTestCaseResultsSchema>) {
  const { id, ...query } = params;
  return omClient.get(`/dataQuality/testCases/${id}/testCaseResult`, query);
}
