import { z } from "zod/v4";
import { omClient } from "../client.js";
import { assertWriteAllowed } from "./utils.js";

const entityTypeEnum = z.enum([
  "table", "topic", "dashboard", "pipeline", "mlmodel",
  "container", "searchIndex", "storedProcedure", "dashboardDataModel",
  "apiEndpoint",
]).describe("Entity type");

export const getLineageSchema = z.object({
  entity: entityTypeEnum,
  id: z.string().describe("Entity UUID"),
  upstreamDepth: z.coerce.number().optional().default(1).describe("Depth of upstream lineage (default 1)"),
  downstreamDepth: z.coerce.number().optional().default(1).describe("Depth of downstream lineage (default 1)"),
});

export async function getLineage(params: z.infer<typeof getLineageSchema>) {
  const { entity, id, ...query } = params;
  return omClient.get(`/lineage/${entity}/${id}`, query);
}

export const getLineageByNameSchema = z.object({
  entity: entityTypeEnum,
  fqn: z.string().describe("Entity fully qualified name"),
  upstreamDepth: z.coerce.number().optional().default(1),
  downstreamDepth: z.coerce.number().optional().default(1),
});

export async function getLineageByName(params: z.infer<typeof getLineageByNameSchema>) {
  const { entity, fqn, ...query } = params;
  return omClient.get(`/lineage/${entity}/name/${encodeURIComponent(fqn)}`, query);
}

export const addLineageSchema = z.object({
  edge: z.object({
    fromEntity: z.object({
      id: z.string().describe("Source entity UUID"),
      type: z.string().describe("Source entity type"),
    }),
    toEntity: z.object({
      id: z.string().describe("Target entity UUID"),
      type: z.string().describe("Target entity type"),
    }),
    description: z.string().optional(),
    lineageDetails: z.record(z.string(), z.any()).optional().describe("Column-level lineage details"),
  }).describe("Lineage edge definition"),
});

export async function addLineage(params: z.infer<typeof addLineageSchema>) {
  assertWriteAllowed();
  return omClient.put("/lineage", params);
}

export const deleteLineageSchema = z.object({
  fromEntity: z.string().describe("Source entity type (e.g. 'table')"),
  fromId: z.string().describe("Source entity UUID"),
  toEntity: z.string().describe("Target entity type"),
  toId: z.string().describe("Target entity UUID"),
});

export async function deleteLineage(params: z.infer<typeof deleteLineageSchema>) {
  assertWriteAllowed();
  return omClient.delete(`/lineage/${params.fromEntity}/${params.fromId}/${params.toEntity}/${params.toId}`);
}
