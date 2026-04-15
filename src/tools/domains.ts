import { z } from "zod/v4";
import { omClient } from "../client.js";
import { assertWriteAllowed } from "./utils.js";

// ========== Domains ==========

// --- list-domains ---

export const listDomainsSchema = z.object({
  fields: z.string().optional().describe("Comma-separated fields to include"),
  limit: z.coerce.number().optional().default(10).describe("Number of results per page"),
  before: z.string().optional().describe("Cursor for backward pagination"),
  after: z.string().optional().describe("Cursor for forward pagination"),
  include: z.enum(["non-deleted", "deleted", "all"]).optional().default("non-deleted").describe("Include deleted entities"),
});

export async function listDomains(params: z.infer<typeof listDomainsSchema>) {
  return omClient.get("/domains", params);
}

// --- get-domain ---

export const getDomainSchema = z.object({
  id: z.string().describe("Domain UUID"),
  fields: z.string().optional().describe("Comma-separated fields to include"),
  include: z.enum(["non-deleted", "deleted", "all"]).optional(),
});

export async function getDomain(params: z.infer<typeof getDomainSchema>) {
  const { id, ...query } = params;
  return omClient.get(`/domains/${id}`, query);
}

// --- get-domain-by-name ---

export const getDomainByNameSchema = z.object({
  name: z.string().describe("Domain name"),
  fields: z.string().optional().describe("Comma-separated fields to include"),
  include: z.enum(["non-deleted", "deleted", "all"]).optional(),
});

export async function getDomainByName(params: z.infer<typeof getDomainByNameSchema>) {
  const { name, ...query } = params;
  return omClient.get(`/domains/name/${encodeURIComponent(name)}`, query);
}

// --- create-domain ---

export const createDomainSchema = z.object({
  name: z.string().describe("Domain name"),
  description: z.string().describe("Domain description in markdown"),
  domainType: z.enum(["Source", "Consumer", "Aggregate"]).describe("Type of domain"),
  displayName: z.string().optional().describe("Display name"),
  owners: z.array(z.record(z.string(), z.any())).optional().describe("Owner references"),
  experts: z.array(z.record(z.string(), z.any())).optional().describe("Domain experts"),
});

export async function createDomain(params: z.infer<typeof createDomainSchema>) {
  assertWriteAllowed();
  return omClient.post("/domains", params);
}

// --- update-domain ---

export const updateDomainSchema = z.object({
  id: z.string().describe("Domain UUID to update"),
  operations: z.array(z.record(z.string(), z.any())).describe("JSON Patch operations array (e.g. [{op:'add', path:'/description', value:'...'}])"),
});

export async function updateDomain(params: z.infer<typeof updateDomainSchema>) {
  assertWriteAllowed();
  return omClient.patch(`/domains/${params.id}`, params.operations);
}

// --- delete-domain ---

export const deleteDomainSchema = z.object({
  id: z.string().describe("Domain UUID to delete"),
  hardDelete: z.boolean().optional().default(false).describe("Hard delete (permanent) vs soft delete"),
  recursive: z.boolean().optional().default(false).describe("Recursively delete children"),
});

export async function deleteDomain(params: z.infer<typeof deleteDomainSchema>) {
  assertWriteAllowed();
  return omClient.delete(`/domains/${params.id}`, {
    hardDelete: params.hardDelete,
    recursive: params.recursive,
  });
}

// ========== Data Products ==========

// --- list-data-products ---

export const listDataProductsSchema = z.object({
  fields: z.string().optional().describe("Comma-separated fields to include"),
  limit: z.coerce.number().optional().default(10).describe("Number of results per page"),
  before: z.string().optional().describe("Cursor for backward pagination"),
  after: z.string().optional().describe("Cursor for forward pagination"),
  domain: z.string().optional().describe("Filter by domain FQN"),
  include: z.enum(["non-deleted", "deleted", "all"]).optional().default("non-deleted").describe("Include deleted entities"),
});

export async function listDataProducts(params: z.infer<typeof listDataProductsSchema>) {
  return omClient.get("/dataProducts", params);
}

// --- get-data-product ---

export const getDataProductSchema = z.object({
  id: z.string().describe("Data Product UUID"),
  fields: z.string().optional().describe("Comma-separated fields to include"),
  include: z.enum(["non-deleted", "deleted", "all"]).optional(),
});

export async function getDataProduct(params: z.infer<typeof getDataProductSchema>) {
  const { id, ...query } = params;
  return omClient.get(`/dataProducts/${id}`, query);
}

// --- get-data-product-by-name ---

export const getDataProductByNameSchema = z.object({
  fqn: z.string().describe("Fully qualified name of the data product"),
  fields: z.string().optional().describe("Comma-separated fields to include"),
  include: z.enum(["non-deleted", "deleted", "all"]).optional(),
});

export async function getDataProductByName(params: z.infer<typeof getDataProductByNameSchema>) {
  const { fqn, ...query } = params;
  return omClient.get(`/dataProducts/name/${encodeURIComponent(fqn)}`, query);
}

// --- create-data-product ---

export const createDataProductSchema = z.object({
  name: z.string().describe("Data Product name"),
  domains: z.array(z.string()).describe("List of parent domain FQNs (e.g. ['analytics'])"),
  description: z.string().optional().describe("Data Product description in markdown"),
  displayName: z.string().optional().describe("Display name"),
  owners: z.array(z.record(z.string(), z.any())).optional().describe("Owner references"),
  experts: z.array(z.record(z.string(), z.any())).optional().describe("Data product experts"),
  assets: z.array(z.record(z.string(), z.any())).optional().describe("Asset references"),
});

export async function createDataProduct(params: z.infer<typeof createDataProductSchema>) {
  assertWriteAllowed();
  return omClient.put("/dataProducts", params);
}

// --- update-data-product ---

export const updateDataProductSchema = z.object({
  id: z.string().describe("Data Product UUID to update"),
  operations: z.array(z.record(z.string(), z.any())).describe("JSON Patch operations array (e.g. [{op:'add', path:'/description', value:'...'}])"),
});

export async function updateDataProduct(params: z.infer<typeof updateDataProductSchema>) {
  assertWriteAllowed();
  return omClient.patch(`/dataProducts/${params.id}`, params.operations);
}

// --- delete-data-product ---

export const deleteDataProductSchema = z.object({
  id: z.string().describe("Data Product UUID to delete"),
  hardDelete: z.boolean().optional().default(false).describe("Hard delete (permanent) vs soft delete"),
  recursive: z.boolean().optional().default(false).describe("Recursively delete children"),
});

export async function deleteDataProduct(params: z.infer<typeof deleteDataProductSchema>) {
  assertWriteAllowed();
  return omClient.delete(`/dataProducts/${params.id}`, {
    hardDelete: params.hardDelete,
    recursive: params.recursive,
  });
}
