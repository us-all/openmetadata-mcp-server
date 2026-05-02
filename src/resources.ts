import { McpServer, ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import { omClient } from "./client.js";

/**
 * MCP Resources for hot OpenMetadata entities.
 *
 * Resources are addressed by URI and read via `resources/read`. Unlike tools,
 * they are application-driven (host UI picks them) and don't consume tool schema
 * tokens until read.
 *
 * URI scheme: `om://`
 *   - om://search?q=...                 — keyword search results (top 10)
 *   - om://table/{fqn}                  — table by fully-qualified name
 *   - om://glossary-term/{fqn}          — glossary term by FQN
 *   - om://lineage/{type}/{fqn}         — lineage edges for an entity
 *   - om://schema/{fqn}                 — schema details
 *   - om://dashboard/{fqn}              — dashboard
 *   - om://pipeline/{fqn}               — pipeline
 *   - om://metric/{fqn}                 — metric (OM 1.12+)
 *   - om://data-contract/{fqn}          — data contract (OM 1.12+)
 *   - om://api-endpoint/{fqn}           — API endpoint (OM 1.12+)
 */

function asJson(uri: string, data: unknown) {
  return {
    contents: [{
      uri,
      mimeType: "application/json",
      text: JSON.stringify(data, null, 2),
    }],
  };
}

export function registerResources(server: McpServer): void {
  // Table by FQN: om://table/{fqn}
  server.registerResource(
    "table",
    new ResourceTemplate("om://table/{fqn}", { list: undefined }),
    {
      title: "OpenMetadata Table",
      description: "Read a table entity by fully qualified name",
      mimeType: "application/json",
    },
    async (uri, vars) => {
      const fqn = decodeURIComponent(String(vars.fqn));
      const data = await omClient.get(`/tables/name/${encodeURIComponent(fqn)}`, {
        fields: "columns,owners,tags,description,tableConstraints,joins",
      });
      return asJson(uri.toString(), data);
    },
  );

  // Glossary term by FQN: om://glossary-term/{fqn}
  server.registerResource(
    "glossary-term",
    new ResourceTemplate("om://glossary-term/{fqn}", { list: undefined }),
    {
      title: "OpenMetadata Glossary Term",
      description: "Read a glossary term by FQN",
      mimeType: "application/json",
    },
    async (uri, vars) => {
      const fqn = decodeURIComponent(String(vars.fqn));
      const data = await omClient.get(`/glossaryTerms/name/${encodeURIComponent(fqn)}`, {
        fields: "owners,tags,relatedTerms,reviewers,parent",
      });
      return asJson(uri.toString(), data);
    },
  );

  // Lineage by entity type + FQN: om://lineage/{type}/{fqn}
  server.registerResource(
    "lineage",
    new ResourceTemplate("om://lineage/{type}/{fqn}", { list: undefined }),
    {
      title: "OpenMetadata Lineage",
      description: "Upstream + downstream lineage edges for an entity (table, dashboard, pipeline, etc.) by FQN",
      mimeType: "application/json",
    },
    async (uri, vars) => {
      const type = decodeURIComponent(String(vars.type));
      const fqn = decodeURIComponent(String(vars.fqn));
      const data = await omClient.get(`/lineage/${type}/name/${encodeURIComponent(fqn)}`, {
        upstreamDepth: 3,
        downstreamDepth: 3,
      });
      return asJson(uri.toString(), data);
    },
  );

  // Search: om://search/{query}
  server.registerResource(
    "search",
    new ResourceTemplate("om://search/{query}", { list: undefined }),
    {
      title: "OpenMetadata Search",
      description: "Top 10 keyword search results across all entity types",
      mimeType: "application/json",
    },
    async (uri, vars) => {
      const q = decodeURIComponent(String(vars.query));
      const data = await omClient.get("/search/query", { q, size: 10 });
      return asJson(uri.toString(), data);
    },
  );

  // Dashboard by FQN: om://dashboard/{fqn}
  server.registerResource(
    "dashboard",
    new ResourceTemplate("om://dashboard/{fqn}", { list: undefined }),
    {
      title: "OpenMetadata Dashboard",
      description: "Dashboard entity by FQN with charts/owners/tags",
      mimeType: "application/json",
    },
    async (uri, vars) => {
      const fqn = decodeURIComponent(String(vars.fqn));
      const data = await omClient.get(`/dashboards/name/${encodeURIComponent(fqn)}`, {
        fields: "charts,owners,tags,description,domains",
      });
      return asJson(uri.toString(), data);
    },
  );

  // Pipeline by FQN: om://pipeline/{fqn}
  server.registerResource(
    "pipeline",
    new ResourceTemplate("om://pipeline/{fqn}", { list: undefined }),
    {
      title: "OpenMetadata Pipeline",
      description: "Pipeline entity by FQN with tasks/owners/tags",
      mimeType: "application/json",
    },
    async (uri, vars) => {
      const fqn = decodeURIComponent(String(vars.fqn));
      const data = await omClient.get(`/pipelines/name/${encodeURIComponent(fqn)}`, {
        fields: "tasks,owners,tags,description,domains",
      });
      return asJson(uri.toString(), data);
    },
  );

  // Schema by FQN: om://schema/{fqn}
  server.registerResource(
    "schema",
    new ResourceTemplate("om://schema/{fqn}", { list: undefined }),
    {
      title: "OpenMetadata Database Schema",
      description: "Database schema entity by FQN",
      mimeType: "application/json",
    },
    async (uri, vars) => {
      const fqn = decodeURIComponent(String(vars.fqn));
      const data = await omClient.get(`/databaseSchemas/name/${encodeURIComponent(fqn)}`, {
        fields: "owners,tags,description,domains",
      });
      return asJson(uri.toString(), data);
    },
  );

  // Metric by FQN: om://metric/{fqn}
  server.registerResource(
    "metric",
    new ResourceTemplate("om://metric/{fqn}", { list: undefined }),
    {
      title: "OpenMetadata Metric",
      description: "Metric entity by FQN (OM 1.12+)",
      mimeType: "application/json",
    },
    async (uri, vars) => {
      const fqn = decodeURIComponent(String(vars.fqn));
      const data = await omClient.get(`/metrics/name/${encodeURIComponent(fqn)}`, {
        fields: "owners,tags,description,domains,relatedMetrics",
      });
      return asJson(uri.toString(), data);
    },
  );

  // Data Contract by FQN: om://data-contract/{fqn}
  server.registerResource(
    "data-contract",
    new ResourceTemplate("om://data-contract/{fqn}", { list: undefined }),
    {
      title: "OpenMetadata Data Contract",
      description: "Data Contract entity by FQN (OM 1.12+)",
      mimeType: "application/json",
    },
    async (uri, vars) => {
      const fqn = decodeURIComponent(String(vars.fqn));
      const data = await omClient.get(`/dataContracts/name/${encodeURIComponent(fqn)}`, {
        fields: "owners,tags,description,domains,entity,schema,semantics,qualityExpectations",
      });
      return asJson(uri.toString(), data);
    },
  );

  // API Endpoint by FQN: om://api-endpoint/{fqn}
  server.registerResource(
    "api-endpoint",
    new ResourceTemplate("om://api-endpoint/{fqn}", { list: undefined }),
    {
      title: "OpenMetadata API Endpoint",
      description: "API Endpoint entity by FQN (OM 1.12+)",
      mimeType: "application/json",
    },
    async (uri, vars) => {
      const fqn = decodeURIComponent(String(vars.fqn));
      const data = await omClient.get(`/apiEndpoints/name/${encodeURIComponent(fqn)}`, {
        fields: "owners,tags,description,domains,requestSchema,responseSchema,apiCollection",
      });
      return asJson(uri.toString(), data);
    },
  );
}
