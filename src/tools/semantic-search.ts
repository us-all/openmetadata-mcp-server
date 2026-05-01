import { z } from "zod/v4";
import { omClient } from "../client.js";

export const semanticSearchSchema = z.object({
  query: z.string().describe("Natural language search text. Example: 'customer demographics purchase history'"),
  size: z.coerce.number().optional().default(10).describe("Number of distinct entities to return (max 100)"),
  k: z.coerce.number().optional().default(500).describe("KNN parameter — number of nearest neighbors to consider (max 10,000)"),
  threshold: z.coerce.number().optional().default(0.0).describe("Minimum similarity score (0.0–1.0) to include in results"),
  entityType: z.array(z.string()).optional().describe("Filter by entity types. Example: ['table','dashboard']"),
  owners: z.array(z.string()).optional().describe("Filter by owner names"),
  tags: z.array(z.string()).optional().describe("Filter by tag FQNs. Example: ['PII.Sensitive']"),
  domains: z.array(z.string()).optional().describe("Filter by domain names"),
  tier: z.array(z.string()).optional().describe("Filter by tier. Example: ['Tier.Tier1']"),
  serviceType: z.array(z.string()).optional().describe("Filter by service type. Example: ['Postgres']"),
});

export async function semanticSearch(params: z.infer<typeof semanticSearchSchema>) {
  const filters: Record<string, string[]> = {};
  if (params.entityType?.length) filters.entityType = params.entityType;
  if (params.owners?.length) filters.owners = params.owners;
  if (params.tags?.length) filters.tags = params.tags;
  if (params.domains?.length) filters.domains = params.domains;
  if (params.tier?.length) filters.tier = params.tier;
  if (params.serviceType?.length) filters.serviceType = params.serviceType;

  return omClient.post("/search/vector/query", {
    query: params.query,
    size: Math.min(params.size ?? 10, 100),
    k: Math.min(params.k ?? 500, 10000),
    threshold: params.threshold ?? 0.0,
    filters: Object.keys(filters).length > 0 ? filters : undefined,
  });
}
