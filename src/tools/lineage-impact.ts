import { z } from "zod/v4";
import { aggregate } from "@us-all/mcp-toolkit";
import { omClient } from "../client.js";

/**
 * `lineage-impact` — aggregated downstream impact assessment for a data asset.
 *
 * Answers "what breaks if I change/drop X?" without forcing the LLM to walk
 * `get-lineage` recursively. Counts downstream entities, categorizes by type,
 * lists the highest-degree leaf consumers, and (optionally) extracts the union
 * of owners affected — the people who need to be notified.
 *
 * Implementation: one `/lineage/{entity}/name/{fqn}` call (depth-bounded) and,
 * if `includeOwners`, one `/search/query?index=all&q=fullyQualifiedName:...`
 * to resolve owner email/displayName per node. Failures degrade to caveats.
 */

const entityTypeEnum = z
  .enum([
    "table", "topic", "dashboard", "pipeline", "mlmodel",
    "container", "searchIndex", "storedProcedure", "dashboardDataModel",
    "apiEndpoint",
  ])
  .describe("Entity type");

export const lineageImpactSchema = z.object({
  entity: entityTypeEnum,
  fqn: z.string().describe("Entity fully qualified name (e.g. 'mysql.default.warehouse.orders')"),
  downstreamDepth: z.coerce.number().int().min(1).max(5).optional().default(3)
    .describe("Lineage depth to walk downstream (default 3, max 5)"),
  upstreamDepth: z.coerce.number().int().min(0).max(3).optional().default(1)
    .describe("Lineage depth to walk upstream (default 1)"),
  includeOwners: z.boolean().optional().default(true)
    .describe("Resolve owners (users/teams) of each downstream entity for change-management notifications"),
  topConsumersLimit: z.coerce.number().int().min(1).max(20).optional().default(5)
    .describe("Number of highest-degree downstream consumers to surface in the summary"),
});

interface LineageNode {
  id?: string;
  name?: string;
  fullyQualifiedName?: string;
  type?: string;
  displayName?: string;
}

interface LineageEdge {
  fromEntity?: { id?: string; type?: string; fqn?: string };
  toEntity?: { id?: string; type?: string; fqn?: string };
}

interface LineageResponse {
  entity?: LineageNode;
  nodes?: LineageNode[];
  upstreamEdges?: LineageEdge[];
  downstreamEdges?: LineageEdge[];
}

interface OwnerHit {
  fullyQualifiedName?: string;
  owners?: Array<{ name?: string; displayName?: string; type?: string }>;
}

export async function lineageImpact(params: z.infer<typeof lineageImpactSchema>) {
  const { entity, fqn, downstreamDepth, upstreamDepth, includeOwners, topConsumersLimit } = params;

  const caveats: string[] = [];

  const lineagePath = `/lineage/${entity}/name/${encodeURIComponent(fqn)}`;
  const lineage = await omClient
    .get<LineageResponse>(lineagePath, { upstreamDepth, downstreamDepth })
    .catch((err: unknown) => {
      caveats.push(`lineage failed: ${err instanceof Error ? err.message : String(err)}`);
      return {} as LineageResponse;
    });

  const nodes: LineageNode[] = Array.isArray(lineage.nodes) ? lineage.nodes : [];
  const downstreamEdges: LineageEdge[] = Array.isArray(lineage.downstreamEdges) ? lineage.downstreamEdges : [];
  const upstreamEdges: LineageEdge[] = Array.isArray(lineage.upstreamEdges) ? lineage.upstreamEdges : [];

  const nodeById = new Map<string, LineageNode>();
  for (const n of nodes) if (n.id) nodeById.set(n.id, n);

  // Walk downstream BFS from the root entity, classifying every reachable node.
  const rootId = lineage.entity?.id ?? null;
  const downstream = new Set<string>();
  const downstreamByType: Record<string, number> = {};
  const fanOut: Record<string, number> = {};

  if (rootId) {
    const queue: string[] = [rootId];
    const seen = new Set<string>([rootId]);
    while (queue.length > 0) {
      const cur = queue.shift()!;
      for (const e of downstreamEdges) {
        if (e.fromEntity?.id !== cur || !e.toEntity?.id) continue;
        const next = e.toEntity.id;
        fanOut[cur] = (fanOut[cur] ?? 0) + 1;
        if (seen.has(next)) continue;
        seen.add(next);
        downstream.add(next);
        const node = nodeById.get(next);
        const t = node?.type ?? "unknown";
        downstreamByType[t] = (downstreamByType[t] ?? 0) + 1;
        queue.push(next);
      }
    }
  }

  const upstream = new Set<string>();
  if (rootId) {
    for (const e of upstreamEdges) {
      if (e.toEntity?.id !== rootId || !e.fromEntity?.id) continue;
      upstream.add(e.fromEntity.id);
    }
  }

  // "Top consumers" = highest fan-out leaf nodes (most siblings rely on them).
  const topConsumers = [...downstream]
    .map((id) => ({ id, node: nodeById.get(id), score: fanOut[id] ?? 0 }))
    .sort((a, b) => b.score - a.score)
    .slice(0, topConsumersLimit)
    .map((c) => ({
      id: c.id,
      name: c.node?.displayName ?? c.node?.name ?? null,
      fqn: c.node?.fullyQualifiedName ?? null,
      type: c.node?.type ?? null,
      downstreamFanOut: c.score,
    }));

  // Owner resolution via /search/query (entity index): one call returns owners
  // for every FQN we collected. Skipped when includeOwners=false.
  let owners: Array<{ name: string; displayName?: string; type?: string }> = [];
  if (includeOwners && downstream.size > 0) {
    const fqns = [...downstream]
      .map((id) => nodeById.get(id)?.fullyQualifiedName)
      .filter((s): s is string => typeof s === "string" && s.length > 0);

    if (fqns.length > 0) {
      const query = fqns.map((f) => `fullyQualifiedName:"${f.replace(/"/g, "")}"`).join(" OR ");
      const { search } = await aggregate(
        {
          search: () =>
            omClient.get<{ hits?: { hits?: Array<{ _source?: OwnerHit }> } }>(
              "/search/query",
              { q: query, index: "all", size: Math.min(fqns.length, 200), include_source_fields: "owners,fullyQualifiedName" },
            ),
        },
        caveats,
      );
      const hits = search?.hits?.hits ?? [];
      const seen = new Map<string, { name: string; displayName?: string; type?: string }>();
      for (const h of hits) {
        for (const o of h._source?.owners ?? []) {
          if (!o.name) continue;
          if (!seen.has(o.name)) seen.set(o.name, { name: o.name, displayName: o.displayName, type: o.type });
        }
      }
      owners = [...seen.values()];
    }
  }

  return {
    entity: {
      id: lineage.entity?.id ?? null,
      fqn: lineage.entity?.fullyQualifiedName ?? fqn,
      type: lineage.entity?.type ?? entity,
      name: lineage.entity?.displayName ?? lineage.entity?.name ?? null,
    },
    impact: {
      upstreamCount: upstream.size,
      downstreamCount: downstream.size,
      downstreamByType,
      ownersAffected: owners.length,
      depthWalked: { upstream: upstreamDepth, downstream: downstreamDepth },
    },
    topConsumers,
    owners,
    caveats,
  };
}
