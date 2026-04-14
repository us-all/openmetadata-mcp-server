import { z } from "zod/v4";
import { omClient } from "../client.js";
import { assertWriteAllowed } from "./utils.js";

const listParams = z.object({
  fields: z.string().optional().describe("Comma-separated fields to include"),
  limit: z.coerce.number().optional().default(10),
  before: z.string().optional(),
  after: z.string().optional(),
  include: z.enum(["non-deleted", "deleted", "all"]).optional().default("non-deleted"),
});

const getByIdParams = z.object({
  id: z.string().describe("Service UUID"),
  fields: z.string().optional(),
  include: z.enum(["non-deleted", "deleted", "all"]).optional(),
});

const getByNameParams = z.object({
  fqn: z.string().describe("Service fully qualified name"),
  fields: z.string().optional(),
  include: z.enum(["non-deleted", "deleted", "all"]).optional(),
});

// --- Database Services ---

export const listDatabaseServicesSchema = listParams;
export async function listDatabaseServices(params: z.infer<typeof listDatabaseServicesSchema>) {
  return omClient.get("/services/databaseServices", params);
}

export const getDatabaseServiceSchema = getByIdParams;
export async function getDatabaseService(params: z.infer<typeof getDatabaseServiceSchema>) {
  const { id, ...query } = params;
  return omClient.get(`/services/databaseServices/${id}`, query);
}

export const getDatabaseServiceByNameSchema = getByNameParams;
export async function getDatabaseServiceByName(params: z.infer<typeof getDatabaseServiceByNameSchema>) {
  const { fqn, ...query } = params;
  return omClient.get(`/services/databaseServices/name/${encodeURIComponent(fqn)}`, query);
}

export const createDatabaseServiceSchema = z.object({
  name: z.string().describe("Service name"),
  serviceType: z.string().describe("Database type (e.g. 'Mysql', 'Postgres', 'BigQuery', 'Snowflake', 'Redshift', 'Hive', 'Mssql', 'Oracle')"),
  connection: z.record(z.string(), z.any()).describe("Connection configuration"),
  description: z.string().optional(),
});

export async function createDatabaseService(params: z.infer<typeof createDatabaseServiceSchema>) {
  assertWriteAllowed();
  return omClient.post("/services/databaseServices", params);
}

export const updateDatabaseServiceSchema = z.object({
  id: z.string().describe("Service UUID"),
  operations: z.array(z.record(z.string(), z.any())).describe("JSON Patch operations"),
});

export async function updateDatabaseService(params: z.infer<typeof updateDatabaseServiceSchema>) {
  assertWriteAllowed();
  return omClient.patch(`/services/databaseServices/${params.id}`, params.operations);
}

export const deleteDatabaseServiceSchema = z.object({
  id: z.string().describe("Service UUID"),
  hardDelete: z.boolean().optional().default(false),
  recursive: z.boolean().optional().default(false),
});

export async function deleteDatabaseService(params: z.infer<typeof deleteDatabaseServiceSchema>) {
  assertWriteAllowed();
  return omClient.delete(`/services/databaseServices/${params.id}`, {
    hardDelete: params.hardDelete,
    recursive: params.recursive,
  });
}

// --- Dashboard Services ---

export const listDashboardServicesSchema = listParams;
export async function listDashboardServices(params: z.infer<typeof listDashboardServicesSchema>) {
  return omClient.get("/services/dashboardServices", params);
}

export const getDashboardServiceSchema = getByNameParams;
export async function getDashboardService(params: z.infer<typeof getDashboardServiceSchema>) {
  const { fqn, ...query } = params;
  return omClient.get(`/services/dashboardServices/name/${encodeURIComponent(fqn)}`, query);
}

// --- Messaging Services ---

export const listMessagingServicesSchema = listParams;
export async function listMessagingServices(params: z.infer<typeof listMessagingServicesSchema>) {
  return omClient.get("/services/messagingServices", params);
}

export const getMessagingServiceSchema = getByNameParams;
export async function getMessagingService(params: z.infer<typeof getMessagingServiceSchema>) {
  const { fqn, ...query } = params;
  return omClient.get(`/services/messagingServices/name/${encodeURIComponent(fqn)}`, query);
}

// --- Pipeline Services ---

export const listPipelineServicesSchema = listParams;
export async function listPipelineServices(params: z.infer<typeof listPipelineServicesSchema>) {
  return omClient.get("/services/pipelineServices", params);
}

export const getPipelineServiceSchema = getByNameParams;
export async function getPipelineService(params: z.infer<typeof getPipelineServiceSchema>) {
  const { fqn, ...query } = params;
  return omClient.get(`/services/pipelineServices/name/${encodeURIComponent(fqn)}`, query);
}

// --- ML Model Services ---

export const listMlModelServicesSchema = listParams;
export async function listMlModelServices(params: z.infer<typeof listMlModelServicesSchema>) {
  return omClient.get("/services/mlmodelServices", params);
}

export const getMlModelServiceSchema = getByNameParams;
export async function getMlModelService(params: z.infer<typeof getMlModelServiceSchema>) {
  const { fqn, ...query } = params;
  return omClient.get(`/services/mlmodelServices/name/${encodeURIComponent(fqn)}`, query);
}

// --- Storage Services ---

export const listStorageServicesSchema = listParams;
export async function listStorageServices(params: z.infer<typeof listStorageServicesSchema>) {
  return omClient.get("/services/storageServices", params);
}

export const getStorageServiceSchema = getByNameParams;
export async function getStorageService(params: z.infer<typeof getStorageServiceSchema>) {
  const { fqn, ...query } = params;
  return omClient.get(`/services/storageServices/name/${encodeURIComponent(fqn)}`, query);
}
